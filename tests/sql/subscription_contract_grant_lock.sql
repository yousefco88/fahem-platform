-- Acceptance for 20261101160000: admin contract grant, 48h attendance lock, automatic posting.
-- Runs after subscription_hour_ledger.sql on the same database (state carries over).
\set ON_ERROR_STOP on
\set QUIET on

create function pg_temp.as_user(p_uid text, p_role text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_uid, true);
  execute format('set local role %I', p_role);
end $$;

create function pg_temp.expect_error(p_sql text, p_fragment text, p_label text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if position(p_fragment in sqlerrm) = 0 then
      raise exception '[%] wrong error: % (expected fragment: %)', p_label, sqlerrm, p_fragment;
    end if;
    raise notice 'ok  %', p_label;
    return;
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


-- Child C (parent 4), untouched by earlier tests.
insert into public.children (id, parent_id, name)
values ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004', 'Child C (parent 4)');
insert into public.schedule_slots (id, child_id, teacher_id, subject_id) values
  ('slot-c-eng', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'english');
insert into public.subscription_plans (id, name, duration_days, included_hours, coverage_mode, price_per_child_minor, status)
values ('20000000-0000-0000-0000-000000000003', 'Draft plan', 30, 5, 'all', 1000, 'draft');

-- ---------- 1. authorization ----------
begin;
select pg_temp.as_user('00000000-0000-0000-0000-000000000002', 'authenticated');
select pg_temp.expect_error($$select public.admin_grant_child_contract('10000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001', null, now(), 'bank transfer 123')$$,
  'admin role required', 'parent cannot grant a contract');
select pg_temp.expect_error($$select public.post_due_attendance_debits()$$, 'admin role required', 'parent cannot run the sweep');
rollback;
begin;
select pg_temp.as_user('', 'authenticated');
select pg_temp.expect_error($$select public.post_due_attendance_debits()$$, 'authentication required', 'role authenticated without JWT gets no scheduler bypass');
rollback;

-- ---------- 2. admin grant ----------
begin;
select pg_temp.as_user('00000000-0000-0000-0000-000000000001', 'authenticated');
select pg_temp.expect_error($$select public.admin_grant_child_contract('10000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001', null, now(), '')$$,
  'admin note', 'grant requires a note');
select pg_temp.expect_error($$select public.admin_grant_child_contract('10000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000003', null, now(), 'ref 1')$$,
  'not active', 'draft plan cannot be granted');
select pg_temp.expect_error($$select public.admin_grant_child_contract('10000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001', array['english'], now(), 'ref 1')$$,
  'do not accept subject keys', 'all-coverage plan rejects subject keys');
select pg_temp.expect_error($$select public.admin_grant_child_contract('10000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000002', array['math'], now(), 'ref 1')$$,
  'not offered', 'subject not in plan is refused');
select pg_temp.expect_error($$select public.admin_grant_child_contract('10000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000002', null, now(), 'ref 1')$$,
  'at least one subject', 'selected plan needs subjects');
-- Child B already holds an active english contract → overlap refused.
select pg_temp.expect_error($$select public.admin_grant_child_contract('10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001', null, now(), 'ref 1')$$,
  'overlapping', 'overlapping coverage is refused');

select pg_temp.expect_eq((public.admin_grant_child_contract('10000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001', null, now() - interval '12 days', 'bank transfer 123'))->>'status', 'granted', 'grant all-coverage plan to child C');
select pg_temp.expect_eq((select count(*) from public.child_subscription_contracts where child_id='10000000-0000-0000-0000-000000000003' and status='active')::int, 1, 'one active contract for child C');
select pg_temp.expect_eq((select quoted_total_minor from public.child_subscription_contracts where child_id='10000000-0000-0000-0000-000000000003'), 50000, 'quoted total snapshot = plan price');
select pg_temp.expect_eq((select plan_snapshot->>'name' from public.child_subscription_contracts where child_id='10000000-0000-0000-0000-000000000003'), 'Ten hours all subjects', 'plan name frozen in snapshot');
select pg_temp.expect_eq(public.contract_balance_minutes((select id from public.child_subscription_contracts where child_id='10000000-0000-0000-0000-000000000003')), 600, 'child C balance 600 after grant');
select pg_temp.expect_error($$select public.admin_grant_child_contract('10000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000002', array['english'], now(), 'ref 2')$$,
  'overlapping', 'selected plan overlaps existing all-coverage contract');
commit;

-- ---------- 3. 48h lock for teachers ----------
begin;
select pg_temp.as_user('00000000-0000-0000-0000-000000000003', 'authenticated');
select pg_temp.expect_error($$select public.record_teacher_live_attendance('slot-c-eng', current_date - 4, true, 60)$$,
  'locked', 'teacher cannot record a session older than the lock window');
select pg_temp.expect_eq((public.record_teacher_live_attendance('slot-c-eng', current_date - 1, true, 60)) ? 'locks_at', true, 'fresh attendance returns locks_at');
commit;

-- ---------- 4. automatic sweep (scheduler context: postgres, no JWT, no role) ----------
-- Nothing is past its lock yet.
select pg_temp.expect_eq((public.post_due_attendance_debits())->>'processed', '0', 'sweep: nothing due yet');
-- Backdated rows inserted directly (as the platform would have before the lock existed).
insert into public.teacher_live_attendance (id, slot_id, session_date, child_id, teacher_id, attended, actual_minutes, recorded_by)
values ('40000000-0000-0000-0000-000000000001', 'slot-c-eng', current_date - 10, '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', true, 60, '00000000-0000-0000-0000-000000000003'),
       ('40000000-0000-0000-0000-000000000002', 'slot-b-math', current_date - 10, '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', true, 30, '00000000-0000-0000-0000-000000000003');
select pg_temp.expect_eq((public.post_due_attendance_debits())::jsonb - 'actor', '{"ok": 1, "failed": 1, "processed": 2}'::jsonb, 'sweep: one posted, one failed');
select pg_temp.expect_eq(public.contract_balance_minutes((select id from public.child_subscription_contracts where child_id='10000000-0000-0000-0000-000000000003')), 540, 'child C debited 60 by sweep');
select pg_temp.expect_eq((select result from public.attendance_ledger_postings where attendance_id='40000000-0000-0000-0000-000000000001'), 'posted', 'posting log: posted');
select pg_temp.expect_eq((select result || ':' || (error_message like '%no active contract covers%')::text from public.attendance_ledger_postings where attendance_id='40000000-0000-0000-0000-000000000002'), 'error:true', 'posting log: uncovered error captured');
select pg_temp.expect_eq((public.post_due_attendance_debits())::jsonb - 'actor', '{"ok": 0, "failed": 1, "processed": 1}'::jsonb, 'sweep is idempotent; only the error is retried');
select pg_temp.expect_eq((select attempts from public.attendance_ledger_postings where attendance_id='40000000-0000-0000-0000-000000000002'), 2, 'retry counted');

-- ---------- 5. admin correction after lock → audited and re-posted ----------
begin;
select pg_temp.as_user('00000000-0000-0000-0000-000000000003', 'authenticated');
select pg_temp.expect_error($$select public.record_teacher_live_attendance('slot-c-eng', current_date - 10, true, 30)$$,
  'locked', 'teacher cannot correct a locked session');
rollback;
begin;
select pg_temp.as_user('00000000-0000-0000-0000-000000000001', 'authenticated');
select pg_temp.expect_error($$select public.admin_correct_live_attendance('40000000-0000-0000-0000-000000000001', true, 30, '')$$,
  'reason is required', 'admin correction needs a reason');
select pg_temp.expect_eq((public.admin_correct_live_attendance('40000000-0000-0000-0000-000000000001', true, 30, 'teacher reported wrong duration'))->'ledger'->>'status', 'reposted', 'admin correction reposts');
select pg_temp.expect_eq(public.contract_balance_minutes((select id from public.child_subscription_contracts where child_id='10000000-0000-0000-0000-000000000003')), 570, '600-30 = 570 after correction');
select pg_temp.expect_eq((select count(*) from public.teacher_live_attendance_audit where attendance_id='40000000-0000-0000-0000-000000000001')::int, 1, 'correction audited');
commit;
select public.post_due_attendance_debits();
select pg_temp.expect_eq((select result from public.attendance_ledger_postings p join public.teacher_live_attendance a on a.id = p.attendance_id where a.id='40000000-0000-0000-0000-000000000001' and p.source_version = to_char(a.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')),
  'already_posted', 'next sweep logs the corrected version as already posted');

-- ---------- 6. error resolves once a contract exists ----------
-- Child B math was uncovered; grant an all-coverage contract is impossible (overlap with english),
-- so verify the failure persists and is visible, then cancel nothing (policy for upgrades is open).
select pg_temp.expect_eq((select count(*) from public.attendance_ledger_postings where result='error')::int, 1, 'one visible unresolved posting error');

\echo Grant/lock/sweep acceptance: all assertions passed.
