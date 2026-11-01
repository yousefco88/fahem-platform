-- Behavioural acceptance for subscription_hour_ledger. Runs as postgres on an isolated DB.
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

-- ---------- seed: plan + contracts (superuser; no client write path exists yet) ----------
insert into public.subscription_plans (id, name, duration_days, included_hours, coverage_mode, price_per_child_minor, status)
values ('20000000-0000-0000-0000-000000000001', 'Ten hours all subjects', 30, 10, 'all', 50000, 'active');
insert into public.subscription_plans (id, name, duration_days, included_hours, coverage_mode, status)
values ('20000000-0000-0000-0000-000000000002', 'English only 2h', 30, 2, 'selected', 'draft');
insert into public.subscription_plan_subjects (plan_id, subject_key, price_per_child_minor)
values ('20000000-0000-0000-0000-000000000002', 'english', 20000);
update public.subscription_plans set status = 'active' where id = '20000000-0000-0000-0000-000000000002';

-- Contracts in one transaction: coverage trigger is deferred to commit.
begin;
-- Child A: all-subjects contract, 10h, active this month.
insert into public.child_subscription_contracts
  (id, child_id, plan_id, plan_snapshot, coverage_mode_snapshot, included_hours_snapshot, quoted_total_minor, starts_at, ends_at, status)
values ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
        '{"name":"Ten hours all subjects"}', 'all', 10, 50000, now() - interval '5 days', now() + interval '25 days', 'active');
-- Child B: english-only contract, 2h.
insert into public.child_subscription_contracts
  (id, child_id, plan_id, plan_snapshot, coverage_mode_snapshot, included_hours_snapshot, quoted_total_minor, starts_at, ends_at, status)
values ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002',
        '{"name":"English only 2h"}', 'selected', 2, 20000, now() - interval '5 days', now() + interval '25 days', 'active');
insert into public.child_subscription_subjects (contract_id, subject_key, price_per_child_minor_snapshot)
values ('30000000-0000-0000-0000-000000000002', 'english', 20000);
-- Child A: a draft contract that must never receive a grant.
insert into public.child_subscription_contracts
  (id, child_id, plan_id, plan_snapshot, coverage_mode_snapshot, status)
values ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
        '{}', 'all', 'draft');
commit;

-- Teacher confirms attendance (through the real RPC) for child A english 60 min, child B english 90 min.
begin;
select pg_temp.as_user('00000000-0000-0000-0000-000000000003', 'authenticated');
select public.record_teacher_live_attendance('slot-a-eng', current_date - 1, true, 60);
select public.record_teacher_live_attendance('slot-a-math', current_date - 1, true, 30);
select public.record_teacher_live_attendance('slot-b-eng', current_date - 1, true, 90);
commit;

-- ---------- 1. authorization ----------
begin;
select pg_temp.as_user('', 'anon');
select pg_temp.expect_error($$select public.grant_contract_minutes('30000000-0000-0000-0000-000000000001')$$,
  'permission denied', 'anon cannot call grant RPC');
rollback;
begin;
select pg_temp.as_user('00000000-0000-0000-0000-000000000002', 'authenticated');
select pg_temp.expect_error($$select public.grant_contract_minutes('30000000-0000-0000-0000-000000000001')$$,
  'admin role required', 'parent cannot grant');
select pg_temp.expect_error($$select public.post_live_attendance_debit((select id from public.teacher_live_attendance limit 1))$$,
  'admin role required', 'parent cannot post debit');
select pg_temp.expect_error($$insert into public.subscription_hour_ledger (contract_id, child_id, entry_type, minutes, source_type, source_id)
  values ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','grant',600,'contract_activation',gen_random_uuid())$$,
  'permission denied', 'parent cannot insert ledger rows');
rollback;

-- ---------- 2. grant ----------
begin;
select pg_temp.as_user('00000000-0000-0000-0000-000000000001', 'authenticated');
select pg_temp.expect_eq((public.grant_contract_minutes('30000000-0000-0000-0000-000000000001'))->>'status', 'granted', 'grant 10h');
select pg_temp.expect_eq(public.contract_balance_minutes('30000000-0000-0000-0000-000000000001'), 600, 'balance 600 after grant');
select pg_temp.expect_eq((public.grant_contract_minutes('30000000-0000-0000-0000-000000000001'))->>'status', 'already_granted', 'grant is idempotent');
select pg_temp.expect_eq(public.contract_balance_minutes('30000000-0000-0000-0000-000000000001'), 600, 'balance unchanged after repeat grant');
select pg_temp.expect_error($$select public.grant_contract_minutes('30000000-0000-0000-0000-000000000003')$$,
  'must be active', 'draft contract cannot be granted');
select public.grant_contract_minutes('30000000-0000-0000-0000-000000000002');
select pg_temp.expect_eq(public.contract_balance_minutes('30000000-0000-0000-0000-000000000002'), 120, 'child B balance 120');
commit;

-- ---------- 3. debit + idempotency ----------
begin;
select pg_temp.as_user('00000000-0000-0000-0000-000000000001', 'authenticated');
select pg_temp.expect_eq((public.post_live_attendance_debit((select id from public.teacher_live_attendance where slot_id='slot-a-eng')))->>'status', 'posted', 'debit 60 posted');
select pg_temp.expect_eq(public.contract_balance_minutes('30000000-0000-0000-0000-000000000001'), 540, 'balance 540');
select pg_temp.expect_eq((public.post_live_attendance_debit((select id from public.teacher_live_attendance where slot_id='slot-a-eng')))->>'status', 'already_posted', 'same version is a no-op');
select pg_temp.expect_eq(public.contract_balance_minutes('30000000-0000-0000-0000-000000000001'), 540, 'balance still 540');
select public.post_live_attendance_debit((select id from public.teacher_live_attendance where slot_id='slot-a-math'));
select pg_temp.expect_eq(public.contract_balance_minutes('30000000-0000-0000-0000-000000000001'), 510, 'all-coverage covers math too: 510');
commit;

-- ---------- 4. correction by teacher → reversal + new debit ----------
begin;
select pg_temp.as_user('00000000-0000-0000-0000-000000000003', 'authenticated');
select public.record_teacher_live_attendance('slot-a-eng', current_date - 1, true, 45);
commit;
begin;
select pg_temp.as_user('00000000-0000-0000-0000-000000000001', 'authenticated');
select pg_temp.expect_eq((public.post_live_attendance_debit((select id from public.teacher_live_attendance where slot_id='slot-a-eng')))->>'status', 'reposted', 'correction reposts');
select pg_temp.expect_eq(public.contract_balance_minutes('30000000-0000-0000-0000-000000000001'), 525, '600-45-30 = 525 after correction');
select pg_temp.expect_eq((select count(*) from public.subscription_hour_ledger where entry_type='reversal')::int, 1, 'exactly one reversal row');
commit;

-- ---------- 5. correction to absent → reversal only ----------
begin;
select pg_temp.as_user('00000000-0000-0000-0000-000000000003', 'authenticated');
select public.record_teacher_live_attendance('slot-a-math', current_date - 1, false, 0);
commit;
begin;
select pg_temp.as_user('00000000-0000-0000-0000-000000000001', 'authenticated');
select pg_temp.expect_eq((public.post_live_attendance_debit((select id from public.teacher_live_attendance where slot_id='slot-a-math')))->>'status', 'no_debit_absent', 'absent → no debit');
select pg_temp.expect_eq(public.contract_balance_minutes('30000000-0000-0000-0000-000000000001'), 555, '525+30 = 555 after absent correction');
commit;

-- ---------- 6. coverage + insufficient balance ----------
-- Child B has english-only; a math slot for B must be refused.
insert into public.schedule_slots (id, child_id, teacher_id, subject_id)
values ('slot-b-math', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'math');
begin;
select pg_temp.as_user('00000000-0000-0000-0000-000000000003', 'authenticated');
select public.record_teacher_live_attendance('slot-b-math', current_date - 1, true, 30);
commit;
begin;
select pg_temp.as_user('00000000-0000-0000-0000-000000000001', 'authenticated');
select pg_temp.expect_error($$select public.post_live_attendance_debit((select id from public.teacher_live_attendance where slot_id='slot-b-math'))$$,
  'no active contract covers', 'uncovered subject refused');
select public.post_live_attendance_debit((select id from public.teacher_live_attendance where slot_id='slot-b-eng'));
select pg_temp.expect_eq(public.contract_balance_minutes('30000000-0000-0000-0000-000000000002'), 30, 'child B 120-90 = 30');
commit;
begin;
select pg_temp.as_user('00000000-0000-0000-0000-000000000003', 'authenticated');
select public.record_teacher_live_attendance('slot-b-eng', current_date - 1, true, 130); -- 120 total < 130
commit;
begin;
select pg_temp.as_user('00000000-0000-0000-0000-000000000001', 'authenticated');
select pg_temp.expect_error($$select public.post_live_attendance_debit((select id from public.teacher_live_attendance where slot_id='slot-b-eng'))$$,
  'insufficient balance', 'correction exceeding balance is refused');
rollback;
-- The failed repost rolled back its reversal too: balance must still be 30.
select pg_temp.expect_eq(public.contract_balance_minutes('30000000-0000-0000-0000-000000000002'), 30, 'atomic: failed repost left balance at 30');

-- ---------- 7. append-only ----------
select pg_temp.expect_error($$update public.subscription_hour_ledger set minutes = 1$$, 'append-only', 'superuser cannot update ledger');
select pg_temp.expect_error($$delete from public.subscription_hour_ledger$$, 'append-only', 'superuser cannot delete ledger');

-- ---------- 8. manual reversal ----------
begin;
select pg_temp.as_user('00000000-0000-0000-0000-000000000001', 'authenticated');
select pg_temp.expect_error($$select public.reverse_ledger_entry((select id from public.subscription_hour_ledger where entry_type='debit' and contract_id='30000000-0000-0000-0000-000000000002' limit 1), '')$$,
  'reason is required', 'reversal needs a reason');
select public.reverse_ledger_entry((select id from public.subscription_hour_ledger where entry_type='debit' and contract_id='30000000-0000-0000-0000-000000000002' limit 1), 'teacher reported wrong child');
select pg_temp.expect_eq(public.contract_balance_minutes('30000000-0000-0000-0000-000000000002'), 120, 'manual reversal restores 120');
select pg_temp.expect_error($$select public.reverse_ledger_entry((select id from public.subscription_hour_ledger where entry_type='debit' and contract_id='30000000-0000-0000-0000-000000000002' limit 1), 'again')$$,
  'duplicate key', 'an entry can be reversed only once');
select pg_temp.expect_error($$select public.reverse_ledger_entry((select id from public.subscription_hour_ledger where entry_type='grant' and contract_id='30000000-0000-0000-0000-000000000001'), 'oops')$$,
  'negative', 'reversing a partially used grant is refused');
commit;

-- ---------- 9. parent visibility ----------
begin;
select pg_temp.as_user('00000000-0000-0000-0000-000000000002', 'authenticated');
select pg_temp.expect_eq((select count(distinct child_id) from public.subscription_hour_ledger)::int, 1, 'parent 2 sees exactly one child');
select pg_temp.expect_eq((select bool_and(child_id = '10000000-0000-0000-0000-000000000001') from public.subscription_hour_ledger), true, 'parent 2 sees only own child');
select pg_temp.expect_eq(public.contract_balance_minutes('30000000-0000-0000-0000-000000000002'), 0, 'other family balance reads as 0 (rows hidden by RLS)');
rollback;

\echo Ledger acceptance: all assertions passed.
