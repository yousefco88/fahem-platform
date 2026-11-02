-- Phase 1 subscription safety hardening.
-- Fixes three defects proven by tests/sql/run_subscription_safety.sh --baseline:
--  1) admin_grant_child_contract: overlap check ran without a lock, so two concurrent grants
--     for the same child could both pass and create overlapping active contracts.
--     Fix: serialize grants per child by locking the children row before the overlap check.
--  2) post_live_attendance_debit could be called directly on attendance that the teacher can
--     still edit (before the 48h lock), contradicting the accepted "post after lock" decision.
--     Fix: refuse debits before live_attendance_lock_at(); lock the attendance row while posting.
--     admin_correct_live_attendance keeps auditing at any time but only re-posts once locked.
--  3) admin_correct_live_attendance returned the reason but never stored it.
--     Fix: new nullable audit column `reason`, written by the admin correction path.
-- Billing decisions (balance rules, reversal semantics, sweep idempotency) are unchanged.
-- Depends on 20261101150000 and 20261101160000; does not edit them.

alter table public.teacher_live_attendance_audit add column reason text;

-- 1) Grant: same body as 20261101160000, plus a per-child row lock before the overlap check.
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
  -- Serializes all grants for this child (READ COMMITTED is enforced by assert_ledger_admin,
  -- so the overlap query below sees contracts committed by a grant that held this lock).
  perform 1 from public.children where id = p_child_id for update;
  if not found then
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

-- 2) Debit: same body as 20261101150000, plus row lock and the 48h lock gate.
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
  -- Row lock: serializes with admin corrections and concurrent sweeps on the same attendance.
  select * into v_a from public.teacher_live_attendance where id = p_attendance_id for update;
  if not found then raise exception 'attendance row not found' using errcode = '22023'; end if;
  if now() < public.live_attendance_lock_at(v_a.session_date) then
    raise exception 'attendance is not locked yet (locks at %); it cannot be posted', public.live_attendance_lock_at(v_a.session_date)
      using errcode = '55000';
  end if;
  v_version := to_char(v_a.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"');

  if exists (select 1 from public.subscription_hour_ledger
             where source_type = 'teacher_live_attendance' and source_id = v_a.id and source_version = v_version) then
    return jsonb_build_object('status', 'already_posted');
  end if;

  select subject_id into v_subject from public.schedule_slots where id = v_a.slot_id;

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

  perform 1 from public.child_subscription_contracts where id = v_contract_id for update;
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

-- 3) Admin correction: reason persisted; re-post only once the attendance is locked
--    (before the lock the sweep will post the final version after it locks).
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
  v_ledger jsonb;
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
    (attendance_id, actor_id, old_attended, old_actual_minutes, new_attended, new_actual_minutes, reason)
  values (v_a.id, v_actor, v_a.attended, v_a.actual_minutes, p_attended, p_actual_minutes, trim(p_reason));

  update public.teacher_live_attendance
    set attended = p_attended, actual_minutes = p_actual_minutes, recorded_by = v_actor,
        updated_at = greatest(now(), v_a.updated_at + interval '1 microsecond')
    where id = v_a.id;

  if now() >= public.live_attendance_lock_at(v_a.session_date) then
    v_ledger := public.post_live_attendance_debit(v_a.id);
  else
    v_ledger := jsonb_build_object('status', 'pending_lock',
                                   'locks_at', public.live_attendance_lock_at(v_a.session_date));
  end if;
  return jsonb_build_object('status', 'corrected', 'attendance_id', v_a.id, 'reason', trim(p_reason),
                            'ledger', v_ledger);
end $$;
revoke all on function public.admin_correct_live_attendance(uuid, boolean, integer, text) from public, anon;
grant execute on function public.admin_correct_live_attendance(uuid, boolean, integer, text) to authenticated;
