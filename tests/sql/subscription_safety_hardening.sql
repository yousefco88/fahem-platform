-- Regression for 20261106100000_subscription_safety_hardening.sql (synthetic fixtures only).
-- Runs after subscription_hour_ledger.sql + subscription_contract_grant_lock.sql on the same DB.
\set ON_ERROR_STOP on
\set QUIET on
create function pg_temp.as_user(p_uid text, p_role text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_uid, true);
  execute format('set local role %I', p_role);
end $$;
create function pg_temp.expect_error(p_sql text, p_fragment text, p_label text) returns void language plpgsql as $$
begin
  begin execute p_sql;
  exception when others then
    if position(p_fragment in sqlerrm) = 0 then
      raise exception '[%] wrong error: % (expected fragment: %)', p_label, sqlerrm, p_fragment;
    end if;
    raise notice 'ok  %', p_label; return;
  end;
  raise exception '[%] expected failure but statement succeeded', p_label;
end $$;
create function pg_temp.expect_eq(p_actual anyelement, p_expected anyelement, p_label text) returns void language plpgsql as $$
begin
  if p_actual is distinct from p_expected then
    raise exception '[%] expected % got %', p_label, p_expected, p_actual;
  end if;
  raise notice 'ok  %', p_label;
end $$;

-- Defect 2: a fresh (unlocked) attendance for child C, recorded by the teacher.
insert into public.schedule_slots (id, child_id, teacher_id, subject_id) values
  ('safety-c-eng', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'english');
begin;
select pg_temp.as_user('00000000-0000-0000-0000-000000000003', 'authenticated');
select public.record_teacher_live_attendance('safety-c-eng', current_date - 1, true, 45);
commit;

begin;
select pg_temp.as_user('00000000-0000-0000-0000-000000000001', 'authenticated');
select pg_temp.expect_error($$select public.post_live_attendance_debit((select id from public.teacher_live_attendance where slot_id='safety-c-eng'))$$,
  'not locked yet', 'direct debit before the 48h lock is refused');
-- Defect 3 + pre-lock correction: reason persisted, no ledger posting before the lock.
select pg_temp.expect_eq((public.admin_correct_live_attendance((select id from public.teacher_live_attendance where slot_id='safety-c-eng'), true, 40, '  parent dispute #7  '))->'ledger'->>'status',
  'pending_lock', 'pre-lock admin correction does not post');
select pg_temp.expect_eq((select reason from public.teacher_live_attendance_audit where attendance_id=(select id from public.teacher_live_attendance where slot_id='safety-c-eng') order by created_at desc limit 1),
  'parent dispute #7', 'correction reason persisted (trimmed) in audit');
select pg_temp.expect_eq((select count(*) from public.subscription_hour_ledger where source_id=(select id from public.teacher_live_attendance where slot_id='safety-c-eng'))::int,
  0, 'no ledger entry for unlocked attendance');
commit;

-- Post-lock correction path still reposts and stores the reason (existing billing behaviour).
begin;
select pg_temp.as_user('00000000-0000-0000-0000-000000000001', 'authenticated');
select pg_temp.expect_eq((public.admin_correct_live_attendance('40000000-0000-0000-0000-000000000001', true, 20, 'second fix'))->'ledger'->>'status',
  'reposted', 'locked correction still reposts');
select pg_temp.expect_eq((select reason from public.teacher_live_attendance_audit where attendance_id='40000000-0000-0000-0000-000000000001' order by created_at desc limit 1),
  'second fix', 'locked correction reason persisted');
select pg_temp.expect_eq(public.contract_balance_minutes((select id from public.child_subscription_contracts where child_id='10000000-0000-0000-0000-000000000003')),
  580, '600-20 = 580 after second correction');
commit;

-- Teacher path is unchanged: teacher audit rows carry no reason.
select pg_temp.expect_eq((select count(*) from public.teacher_live_attendance_audit where reason is null and actor_id='00000000-0000-0000-0000-000000000003')::int > 0,
  true, 'teacher audit rows keep reason null');
\echo Safety hardening sequential assertions passed.
