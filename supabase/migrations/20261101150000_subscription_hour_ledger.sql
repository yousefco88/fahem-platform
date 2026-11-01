-- Subscription hour ledger (append-only) with teacher-confirmed live attendance as the
-- ONLY debit source (decision: Yousef, 2026-11-01).
--
-- Unit: whole minutes (teacher_live_attendance.actual_minutes is an integer; hours*60 on grant).
-- Entry kinds: grant (+), debit (-), reversal (negates one earlier entry).
-- Idempotency: unique (source_type, source_id, source_version). A corrected attendance row
-- (updated_at changed) posts a reversal of the previous debit plus a fresh debit.
-- No client writes; admin-only RPCs; rows can never be updated or deleted (trigger).
-- Not implemented yet by design (policies still open): automatic posting on confirmation,
-- correction lock window, carry-over/freeze between contracts, sibling discount, payments.
-- LOCAL ONLY until separately authorized for the hosted project.

create table public.subscription_hour_ledger (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.child_subscription_contracts(id) on delete restrict,
  child_id uuid not null references public.children(id) on delete restrict,
  entry_type text not null check (entry_type in ('grant', 'debit', 'reversal')),
  minutes integer not null check (minutes <> 0),
  subject_key text,
  source_type text not null check (source_type in ('contract_activation', 'teacher_live_attendance', 'admin_adjustment')),
  source_id uuid not null,
  source_version text not null default '',
  reverses_entry_id uuid references public.subscription_hour_ledger(id) on delete restrict,
  reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (source_type, source_id, source_version),
  check ((entry_type = 'grant') = (minutes > 0 and source_type = 'contract_activation')),
  check (entry_type <> 'debit' or (minutes < 0 and source_type = 'teacher_live_attendance')),
  check ((entry_type = 'reversal') = (reverses_entry_id is not null)),
  check (entry_type <> 'reversal' or reason is not null)
);

create index subscription_hour_ledger_contract_idx
  on public.subscription_hour_ledger (contract_id, created_at);
create index subscription_hour_ledger_child_idx
  on public.subscription_hour_ledger (child_id, created_at desc);
create unique index subscription_hour_ledger_single_reversal_idx
  on public.subscription_hour_ledger (reverses_entry_id) where reverses_entry_id is not null;

-- Append-only: nobody (including admins and table owner) mutates history.
create or replace function public.subscription_hour_ledger_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'subscription_hour_ledger is append-only; post a reversal instead'
    using errcode = '42501';
end $$;
create trigger subscription_hour_ledger_no_mutation
  before update or delete on public.subscription_hour_ledger
  for each row execute function public.subscription_hour_ledger_immutable();
revoke all on function public.subscription_hour_ledger_immutable() from public, anon, authenticated;

alter table public.subscription_hour_ledger enable row level security;
create policy "admins read hour ledger"
  on public.subscription_hour_ledger for select to authenticated
  using (public.is_admin());
create policy "parents read own children hour ledger"
  on public.subscription_hour_ledger for select to authenticated
  using (exists (select 1 from public.children c where c.id = child_id and c.parent_id = auth.uid()));
revoke all on table public.subscription_hour_ledger from public, anon, authenticated;
grant select on public.subscription_hour_ledger to authenticated;

-- Balance helper (minutes). Callable by anyone who can see the contract; sums only visible rows
-- when called by a client, so it is accurate for admins and the owning parent.
create or replace function public.contract_balance_minutes(p_contract_id uuid)
returns integer language sql stable
set search_path = public, pg_temp
as $$
  select coalesce(sum(minutes), 0)::integer
  from public.subscription_hour_ledger
  where contract_id = p_contract_id
$$;
revoke all on function public.contract_balance_minutes(uuid) from public, anon;
grant execute on function public.contract_balance_minutes(uuid) to authenticated;

create or replace function public.assert_ledger_admin()
returns uuid language plpgsql stable
set search_path = public, pg_temp
as $$
declare v_actor uuid := auth.uid();
begin
  if v_actor is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not public.is_admin() then raise exception 'admin role required' using errcode = '42501'; end if;
  -- Balance checks rely on re-reading committed rows after the contract row lock is acquired.
  -- Under REPEATABLE READ / SERIALIZABLE the post-lock read would still see the old snapshot.
  if current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'ledger RPCs require READ COMMITTED isolation (got %)', current_setting('transaction_isolation')
      using errcode = '25006';
  end if;
  return v_actor;
end $$;
revoke all on function public.assert_ledger_admin() from public, anon, authenticated;

-- 1) Grant the contract's included minutes once. Idempotent per contract.
create or replace function public.grant_contract_minutes(p_contract_id uuid)
returns jsonb language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := public.assert_ledger_admin();
  v_c public.child_subscription_contracts%rowtype;
  v_minutes integer;
  v_existing uuid;
begin
  select * into v_c from public.child_subscription_contracts where id = p_contract_id for update;
  if not found then raise exception 'contract not found' using errcode = '22023'; end if;
  if v_c.status not in ('active', 'cancel_scheduled') then
    raise exception 'contract must be active to grant minutes (status %)', v_c.status using errcode = '23514';
  end if;
  select id into v_existing from public.subscription_hour_ledger
    where source_type = 'contract_activation' and source_id = p_contract_id and source_version = '';
  if v_existing is not null then
    return jsonb_build_object('status', 'already_granted', 'entry_id', v_existing,
                              'balance_minutes', public.contract_balance_minutes(p_contract_id));
  end if;
  v_minutes := round(coalesce(v_c.included_hours_snapshot, 0) * 60)::integer;
  if v_minutes <= 0 then
    raise exception 'contract snapshot has no included hours' using errcode = '23514';
  end if;
  insert into public.subscription_hour_ledger
    (contract_id, child_id, entry_type, minutes, source_type, source_id, created_by)
  values (v_c.id, v_c.child_id, 'grant', v_minutes, 'contract_activation', v_c.id, v_actor)
  returning id into v_existing;
  return jsonb_build_object('status', 'granted', 'entry_id', v_existing,
                            'balance_minutes', public.contract_balance_minutes(p_contract_id));
end $$;
revoke all on function public.grant_contract_minutes(uuid) from public, anon;
grant execute on function public.grant_contract_minutes(uuid) to authenticated;

-- 2) Post (or re-post after correction) the debit for one teacher-confirmed attendance row.
--    Picks the single active contract covering child + subject on session_date.
--    Never lets the balance go negative. Idempotent on (attendance id, updated_at).
create or replace function public.post_live_attendance_debit(p_attendance_id uuid)
returns jsonb language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := public.assert_ledger_admin();
  v_a public.teacher_live_attendance%rowtype;
  v_subject text;
  v_version text;
  v_contract_id uuid;
  v_contract_count integer;
  v_prev public.subscription_hour_ledger%rowtype;
  v_prev_count integer;
  v_balance integer;
  v_entry uuid;
  v_reversal uuid;
begin
  select * into v_a from public.teacher_live_attendance where id = p_attendance_id;
  if not found then raise exception 'attendance row not found' using errcode = '22023'; end if;
  v_version := to_char(v_a.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"');

  -- Already posted for this exact version → no-op.
  if exists (select 1 from public.subscription_hour_ledger
             where source_type = 'teacher_live_attendance' and source_id = v_a.id and source_version = v_version) then
    return jsonb_build_object('status', 'already_posted');
  end if;

  select subject_id into v_subject from public.schedule_slots where id = v_a.slot_id;

  -- Previous live (unreversed) debits for this attendance row → reverse them (correction).
  select count(*) into v_prev_count
    from public.subscription_hour_ledger l
    where l.source_type = 'teacher_live_attendance' and l.source_id = v_a.id and l.entry_type = 'debit'
      and not exists (select 1 from public.subscription_hour_ledger r where r.reverses_entry_id = l.id);
  if v_prev_count > 1 then
    raise exception 'ledger inconsistency: % live debits for one attendance row', v_prev_count using errcode = 'XX000';
  end if;
  if v_prev_count = 1 then
    select l.* into v_prev
      from public.subscription_hour_ledger l
      where l.source_type = 'teacher_live_attendance' and l.source_id = v_a.id and l.entry_type = 'debit'
        and not exists (select 1 from public.subscription_hour_ledger r where r.reverses_entry_id = l.id);
    perform 1 from public.child_subscription_contracts where id = v_prev.contract_id for update;
    insert into public.subscription_hour_ledger
      (contract_id, child_id, entry_type, minutes, subject_key, source_type, source_id, source_version,
       reverses_entry_id, reason, created_by)
    values (v_prev.contract_id, v_prev.child_id, 'reversal', -v_prev.minutes, v_prev.subject_key,
            'admin_adjustment', v_prev.id, 'correction:' || v_version,
            v_prev.id, 'attendance corrected by teacher', v_actor)
    returning id into v_reversal;
  end if;

  if not v_a.attended or v_a.actual_minutes = 0 then
    return jsonb_build_object('status', 'no_debit_absent', 'reversed_entry_id', v_prev.id);
  end if;

  -- Covering contract: active window contains session_date and subject is covered.
  select count(*), (array_agg(c.id))[1] into v_contract_count, v_contract_id
    from public.child_subscription_contracts c
    where c.child_id = v_a.child_id
      and c.status in ('active', 'cancel_scheduled')
      and c.starts_at <= (v_a.session_date::timestamptz + interval '1 day' - interval '1 second')
      and c.ends_at > v_a.session_date::timestamptz
      and (c.coverage_mode_snapshot = 'all'
           or exists (select 1 from public.child_subscription_subjects s
                      where s.contract_id = c.id and s.subject_key = v_subject));
  if v_contract_count = 0 then
    raise exception 'no active contract covers child % subject % on %', v_a.child_id, v_subject, v_a.session_date
      using errcode = '23514';
  end if;
  if v_contract_count > 1 then
    raise exception 'more than one active contract covers this session; resolve manually' using errcode = '23514';
  end if;

  perform 1 from public.child_subscription_contracts where id = v_contract_id for update; -- serialize debits
  v_balance := public.contract_balance_minutes(v_contract_id);
  if v_balance < v_a.actual_minutes then
    raise exception 'insufficient balance: % minutes left, % required', v_balance, v_a.actual_minutes
      using errcode = '23514';
  end if;

  insert into public.subscription_hour_ledger
    (contract_id, child_id, entry_type, minutes, subject_key, source_type, source_id, source_version, created_by)
  values (v_contract_id, v_a.child_id, 'debit', -v_a.actual_minutes, v_subject,
          'teacher_live_attendance', v_a.id, v_version, v_actor)
  returning id into v_entry;

  return jsonb_build_object('status', case when v_reversal is null then 'posted' else 'reposted' end,
                            'entry_id', v_entry, 'reversal_id', v_reversal, 'contract_id', v_contract_id,
                            'balance_minutes', public.contract_balance_minutes(v_contract_id));
end $$;
revoke all on function public.post_live_attendance_debit(uuid) from public, anon;
grant execute on function public.post_live_attendance_debit(uuid) to authenticated;

-- 3) Manual reversal of any single entry (admin, mandatory reason). Each entry can be reversed once.
create or replace function public.reverse_ledger_entry(p_entry_id uuid, p_reason text)
returns jsonb language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := public.assert_ledger_admin();
  v_e public.subscription_hour_ledger%rowtype;
  v_id uuid;
begin
  if p_reason is null or length(trim(p_reason)) < 3 then
    raise exception 'a reason is required' using errcode = '22023';
  end if;
  select * into v_e from public.subscription_hour_ledger where id = p_entry_id;
  if not found then raise exception 'ledger entry not found' using errcode = '22023'; end if;
  if v_e.entry_type = 'reversal' then raise exception 'cannot reverse a reversal' using errcode = '23514'; end if;
  perform 1 from public.child_subscription_contracts where id = v_e.contract_id for update;
  if v_e.entry_type = 'grant' and public.contract_balance_minutes(v_e.contract_id) < v_e.minutes then
    raise exception 'reversing this grant would make the balance negative' using errcode = '23514';
  end if;
  insert into public.subscription_hour_ledger
    (contract_id, child_id, entry_type, minutes, subject_key, source_type, source_id, source_version,
     reverses_entry_id, reason, created_by)
  values (v_e.contract_id, v_e.child_id, 'reversal', -v_e.minutes, v_e.subject_key,
          'admin_adjustment', v_e.id, 'manual', v_e.id, trim(p_reason), v_actor)
  returning id into v_id;
  return jsonb_build_object('status', 'reversed', 'entry_id', v_id,
                            'balance_minutes', public.contract_balance_minutes(v_e.contract_id));
end $$;
revoke all on function public.reverse_ledger_entry(uuid, text) from public, anon;
grant execute on function public.reverse_ledger_entry(uuid, text) to authenticated;
