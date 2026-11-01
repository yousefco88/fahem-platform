-- Contract creation by administrative grant + 48-hour attendance lock + automatic ledger posting.
-- Decisions (Yousef, 2026-11-01): contracts are created only by admin grant (payment stays
-- outside the platform for now); teacher-confirmed attendance becomes immutable for the teacher
-- 48 hours after the session day ends (Africa/Cairo) and is then posted to the hour ledger
-- automatically; later corrections go through an admin RPC that re-posts.
-- Depends on 20261101150000_subscription_hour_ledger.sql. LOCAL ONLY until separately authorized.

alter table public.child_subscription_contracts add column admin_note text;

-- ---------------------------------------------------------------------------------------------
-- 1) Admin grant: child + active plan (+ chosen subjects for selected coverage) → active contract
--    with frozen snapshot, then the included minutes are granted to the ledger. One transaction.
-- ---------------------------------------------------------------------------------------------
create or replace function public.admin_grant_child_contract(
  p_child_id uuid,
  p_plan_id uuid,
  p_subject_keys text[] default null,
  p_starts_at timestamptz default now(),
  p_admin_note text default null
)
returns jsonb language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := public.assert_ledger_admin();
  v_plan public.subscription_plans%rowtype;
  v_keys text[] := (select array_agg(distinct k) from unnest(coalesce(p_subject_keys, '{}')) k where length(trim(k)) > 0);
  v_valid_keys integer;
  v_total integer;
  v_ends_at timestamptz;
  v_contract_id uuid;
  v_overlap uuid;
  v_snapshot jsonb;
  v_grant jsonb;
begin
  if p_admin_note is null or length(trim(p_admin_note)) < 3 then
    raise exception 'an admin note (payment reference / reason) is required' using errcode = '22023';
  end if;
  if not exists (select 1 from public.children where id = p_child_id) then
    raise exception 'child not found' using errcode = '22023';
  end if;
  if p_starts_at is null or p_starts_at < now() - interval '30 days' or p_starts_at > now() + interval '90 days' then
    raise exception 'start date must be within -30/+90 days of today' using errcode = '22023';
  end if;

  select * into v_plan from public.subscription_plans where id = p_plan_id for share;
  if not found or v_plan.status <> 'active' then
    raise exception 'plan not found or not active' using errcode = '23514';
  end if;
  if v_plan.duration_days is null or v_plan.included_hours is null or v_plan.included_hours <= 0 then
    raise exception 'plan must define duration_days and included_hours > 0 before it can be granted' using errcode = '23514';
  end if;

  if v_plan.coverage_mode = 'all' then
    if coalesce(array_length(v_keys, 1), 0) > 0 then
      raise exception 'all-coverage plans do not accept subject keys' using errcode = '22023';
    end if;
    if v_plan.price_per_child_minor is null then
      raise exception 'all-coverage plan has no price' using errcode = '23514';
    end if;
    v_total := v_plan.price_per_child_minor;
  else
    if coalesce(array_length(v_keys, 1), 0) = 0 then
      raise exception 'selected-coverage plans require at least one subject key' using errcode = '22023';
    end if;
    select count(*), coalesce(sum(ps.price_per_child_minor), 0)
      into v_valid_keys, v_total
      from public.subscription_plan_subjects ps
      where ps.plan_id = v_plan.id and ps.subject_key = any (v_keys);
    if v_valid_keys <> array_length(v_keys, 1) then
      raise exception 'one or more subject keys are not offered by this plan' using errcode = '22023';
    end if;
  end if;

  v_ends_at := p_starts_at + make_interval(days => v_plan.duration_days);

  -- No second active contract for the same child whose window and coverage overlap:
  -- the ledger refuses ambiguous debits, so prevent the ambiguity at creation time.
  select c.id into v_overlap
    from public.child_subscription_contracts c
    where c.child_id = p_child_id
      and c.status in ('active', 'cancel_scheduled')
      and c.starts_at < v_ends_at and c.ends_at > p_starts_at
      and (c.coverage_mode_snapshot = 'all' or v_plan.coverage_mode = 'all'
           or exists (select 1 from public.child_subscription_subjects s
                      where s.contract_id = c.id and s.subject_key = any (v_keys)))
    limit 1;
  if v_overlap is not null then
    raise exception 'child already has an active contract (%) overlapping this period and coverage', v_overlap
      using errcode = '23514';
  end if;

  v_snapshot := jsonb_build_object(
    'plan_id', v_plan.id, 'name', v_plan.name, 'duration_days', v_plan.duration_days,
    'included_hours', v_plan.included_hours, 'coverage_mode', v_plan.coverage_mode,
    'price_per_child_minor', v_plan.price_per_child_minor, 'currency', v_plan.currency,
    'sibling_discount_enabled', v_plan.sibling_discount_enabled,
    'subjects', coalesce((select jsonb_agg(jsonb_build_object('subject_key', ps.subject_key, 'price_per_child_minor', ps.price_per_child_minor) order by ps.subject_key)
                          from public.subscription_plan_subjects ps
                          where ps.plan_id = v_plan.id and (v_plan.coverage_mode = 'all' or ps.subject_key = any (v_keys))), '[]'::jsonb),
    'granted_at', now(), 'granted_by', v_actor);

  insert into public.child_subscription_contracts
    (child_id, plan_id, plan_snapshot, coverage_mode_snapshot, included_hours_snapshot, quoted_total_minor,
     currency, starts_at, ends_at, renewal_mode, status, created_by, admin_note)
  values
    (p_child_id, v_plan.id, v_snapshot, v_plan.coverage_mode, v_plan.included_hours, v_total,
     v_plan.currency, p_starts_at, v_ends_at, 'manual', 'active', v_actor, trim(p_admin_note))
  returning id into v_contract_id;

  if v_plan.coverage_mode = 'selected' then
    insert into public.child_subscription_subjects (contract_id, subject_key, price_per_child_minor_snapshot)
    select v_contract_id, ps.subject_key, ps.price_per_child_minor
      from public.subscription_plan_subjects ps
      where ps.plan_id = v_plan.id and ps.subject_key = any (v_keys);
  end if;

  v_grant := public.grant_contract_minutes(v_contract_id);
  return jsonb_build_object('status', 'granted', 'contract_id', v_contract_id,
                            'starts_at', p_starts_at, 'ends_at', v_ends_at,
                            'quoted_total_minor', v_total, 'balance_minutes', v_grant->'balance_minutes');
end $$;
revoke all on function public.admin_grant_child_contract(uuid, uuid, text[], timestamptz, text) from public, anon;
grant execute on function public.admin_grant_child_contract(uuid, uuid, text[], timestamptz, text) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 2) 48-hour lock on teacher attendance. Lock instant = end of session day (Africa/Cairo) + 48h.
-- ---------------------------------------------------------------------------------------------
create or replace function public.live_attendance_lock_at(p_session_date date)
returns timestamptz language sql immutable
as $$
  select ((p_session_date + 1)::timestamp at time zone 'Africa/Cairo') + interval '48 hours'
$$;
grant execute on function public.live_attendance_lock_at(date) to authenticated;

create or replace function public.record_teacher_live_attendance(
  p_slot_id text,
  p_session_date date,
  p_attended boolean,
  p_actual_minutes integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_child_id uuid;
  v_teacher_id uuid;
  v_slot_type text;
  v_existing public.teacher_live_attendance%rowtype;
  v_saved public.teacher_live_attendance%rowtype;
  v_old_attended boolean;
  v_old_minutes integer;
begin
  if v_actor is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_session_date is null or p_session_date > (now() at time zone 'Africa/Cairo')::date then
    raise exception 'session date must not be in the future' using errcode = '22023';
  end if;
  -- 48h lock applies to first entry and to corrections alike.
  if now() >= public.live_attendance_lock_at(p_session_date) then
    raise exception 'attendance for % is locked (48 hours after the session day); ask an administrator', p_session_date
      using errcode = '23514';
  end if;
  if p_attended is null or p_actual_minutes is null
     or (p_attended and p_actual_minutes not between 1 and 1440)
     or (not p_attended and p_actual_minutes <> 0) then
    raise exception 'attendance and actual minutes are inconsistent' using errcode = '22023';
  end if;

  select s.child_id, s.teacher_id, s.slot_type
    into v_child_id, v_teacher_id, v_slot_type
    from public.schedule_slots s
    where s.id = p_slot_id
    for update;

  if not found or v_slot_type <> 'live' then
    raise exception 'live schedule slot not found' using errcode = '22023';
  end if;
  if v_teacher_id is distinct from v_actor
     or not exists (select 1 from public.profiles p where p.id = v_actor and p.role = 'teacher') then
    raise exception 'only the assigned teacher may confirm attendance' using errcode = '42501';
  end if;

  select * into v_existing
    from public.teacher_live_attendance a
    where a.slot_id = p_slot_id and a.session_date = p_session_date
    for update;

  if found then
    if v_existing.child_id <> v_child_id or v_existing.teacher_id <> v_teacher_id then
      raise exception 'schedule assignment changed after attendance was recorded' using errcode = '23514';
    end if;
    v_old_attended := v_existing.attended;
    v_old_minutes := v_existing.actual_minutes;
    update public.teacher_live_attendance
      set attended = p_attended,
          actual_minutes = p_actual_minutes,
          recorded_by = v_actor,
          updated_at = now()
      where id = v_existing.id
      returning * into v_saved;
  else
    v_old_attended := null;
    v_old_minutes := null;
    insert into public.teacher_live_attendance (
      slot_id, session_date, child_id, teacher_id, attended, actual_minutes, recorded_by
    ) values (
      p_slot_id, p_session_date, v_child_id, v_teacher_id, p_attended, p_actual_minutes, v_actor
    ) returning * into v_saved;
  end if;

  insert into public.teacher_live_attendance_audit (
    attendance_id, actor_id, old_attended, old_actual_minutes, new_attended, new_actual_minutes
  ) values (
    v_saved.id, v_actor, v_old_attended, v_old_minutes, v_saved.attended, v_saved.actual_minutes
  );

  return jsonb_build_object(
    'id', v_saved.id,
    'slot_id', v_saved.slot_id,
    'session_date', v_saved.session_date,
    'child_id', v_saved.child_id,
    'attended', v_saved.attended,
    'actual_minutes', v_saved.actual_minutes,
    'updated_at', v_saved.updated_at,
    'locks_at', public.live_attendance_lock_at(v_saved.session_date)
  );
end;
$$;

-- Admin correction after the lock (or any time): audited, then re-posted to the ledger.
create or replace function public.admin_correct_live_attendance(
  p_attendance_id uuid,
  p_attended boolean,
  p_actual_minutes integer,
  p_reason text
)
returns jsonb language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := public.assert_ledger_admin();
  v_a public.teacher_live_attendance%rowtype;
begin
  if p_reason is null or length(trim(p_reason)) < 3 then
    raise exception 'a reason is required' using errcode = '22023';
  end if;
  if p_attended is null or p_actual_minutes is null
     or (p_attended and p_actual_minutes not between 1 and 1440)
     or (not p_attended and p_actual_minutes <> 0) then
    raise exception 'attendance and actual minutes are inconsistent' using errcode = '22023';
  end if;
  select * into v_a from public.teacher_live_attendance where id = p_attendance_id for update;
  if not found then raise exception 'attendance row not found' using errcode = '22023'; end if;

  insert into public.teacher_live_attendance_audit
    (attendance_id, actor_id, old_attended, old_actual_minutes, new_attended, new_actual_minutes)
  values (v_a.id, v_actor, v_a.attended, v_a.actual_minutes, p_attended, p_actual_minutes);

  update public.teacher_live_attendance
    set attended = p_attended, actual_minutes = p_actual_minutes, recorded_by = v_actor,
        updated_at = greatest(now(), v_a.updated_at + interval '1 microsecond')
    where id = v_a.id;

  return jsonb_build_object('status', 'corrected', 'attendance_id', v_a.id, 'reason', trim(p_reason),
                            'ledger', public.post_live_attendance_debit(v_a.id));
end $$;
revoke all on function public.admin_correct_live_attendance(uuid, boolean, integer, text) from public, anon;
grant execute on function public.admin_correct_live_attendance(uuid, boolean, integer, text) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 3) Automatic posting after the lock. A posting log makes every attempt visible to admins and
--    keeps the sweep idempotent; failures (no covering contract, insufficient balance) are
--    retried on each sweep until an admin resolves them (e.g. by granting a contract).
-- ---------------------------------------------------------------------------------------------
create table public.attendance_ledger_postings (
  attendance_id uuid not null references public.teacher_live_attendance(id) on delete restrict,
  source_version text not null,
  result text not null check (result in ('posted', 'reposted', 'no_debit_absent', 'already_posted', 'error')),
  error_message text,
  attempts integer not null default 1,
  first_attempt_at timestamptz not null default now(),
  last_attempt_at timestamptz not null default now(),
  primary key (attendance_id, source_version)
);
create index attendance_ledger_postings_errors_idx
  on public.attendance_ledger_postings (last_attempt_at desc) where result = 'error';
alter table public.attendance_ledger_postings enable row level security;
create policy "admins read attendance postings"
  on public.attendance_ledger_postings for select to authenticated using (public.is_admin());
revoke all on table public.attendance_ledger_postings from public, anon, authenticated;
grant select on public.attendance_ledger_postings to authenticated;

-- Let a trusted scheduler (pg_cron runs as the scheduling role, no JWT, no SET ROLE) call the
-- ledger RPCs. Clients always arrive through PostgREST with role anon/authenticated set, so the
-- bypass can never apply to them.
create or replace function public.assert_ledger_admin()
returns uuid language plpgsql stable
set search_path = public, pg_temp
as $$
declare v_actor uuid := auth.uid();
begin
  if current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'ledger RPCs require READ COMMITTED isolation (got %)', current_setting('transaction_isolation')
      using errcode = '25006';
  end if;
  if v_actor is null and session_user in ('postgres', 'supabase_admin')
     and coalesce(current_setting('role', true), 'none') not in ('anon', 'authenticated') then
    return null; -- trusted scheduler / maintenance session
  end if;
  if v_actor is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not public.is_admin() then raise exception 'admin role required' using errcode = '42501'; end if;
  return v_actor;
end $$;

create or replace function public.post_due_attendance_debits(p_limit integer default 200)
returns jsonb language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := public.assert_ledger_admin();
  r record;
  v_version text;
  v_result jsonb;
  v_status text;
  v_err text;
  v_ok integer := 0;
  v_failed integer := 0;
begin
  for r in
    select a.id, a.updated_at
      from public.teacher_live_attendance a
      where now() >= public.live_attendance_lock_at(a.session_date)
        and not exists (
          select 1 from public.attendance_ledger_postings p
          where p.attendance_id = a.id
            and p.source_version = to_char(a.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
            and p.result <> 'error')
      order by a.session_date, a.updated_at
      limit greatest(1, least(p_limit, 1000))
  loop
    v_version := to_char(r.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"');
    begin
      v_result := public.post_live_attendance_debit(r.id);
      v_status := v_result->>'status';
      v_err := null;
      v_ok := v_ok + 1;
    exception when others then
      v_status := 'error';
      v_err := sqlerrm;
      v_failed := v_failed + 1;
    end;
    insert into public.attendance_ledger_postings (attendance_id, source_version, result, error_message)
    values (r.id, v_version, v_status, v_err)
    on conflict (attendance_id, source_version) do update
      set result = excluded.result, error_message = excluded.error_message,
          attempts = public.attendance_ledger_postings.attempts + 1, last_attempt_at = now();
  end loop;
  return jsonb_build_object('processed', v_ok + v_failed, 'ok', v_ok, 'failed', v_failed, 'actor', v_actor);
end $$;
revoke all on function public.post_due_attendance_debits(integer) from public, anon;
grant execute on function public.post_due_attendance_debits(integer) to authenticated;

-- Hourly sweep when pg_cron is available (hosted Supabase); harmless elsewhere.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('post-due-attendance-debits', '15 * * * *',
                          $job$select public.post_due_attendance_debits(500)$job$);
  end if;
end $$;
