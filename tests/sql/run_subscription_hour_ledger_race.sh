#!/usr/bin/env bash
set -euo pipefail
# Two concurrent admin sessions post debits that together exceed the remaining balance.
# Expected: exactly one succeeds, balance never negative. Also proves the isolation guard.
# Invoked by run_subscription_hour_ledger.sh with the running container name.
container="$1"
psql() { docker exec -i "$container" psql -q -v ON_ERROR_STOP=1 -U postgres "$@"; }

# Fresh state for child B: two new attendance rows of 90 min each; balance is 120 after the main suite.
psql <<'SQL'
insert into public.schedule_slots (id, child_id, teacher_id, subject_id) values
  ('race-1', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'english'),
  ('race-2', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'english');
begin;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true);
set local role authenticated;
select public.record_teacher_live_attendance('race-1', current_date - 2, true, 90);
select public.record_teacher_live_attendance('race-2', current_date - 3, true, 90);
commit;
SQL

session() {
  local slot="$1" delay="$2"
  psql -v ON_ERROR_STOP=0 <<SQL 2>&1 | grep -E "status|ERROR" || true
begin;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
set local role authenticated;
select pg_sleep($delay);
select public.post_live_attendance_debit((select id from public.teacher_live_attendance where slot_id='$slot')) ->> 'status' as status;
select pg_sleep(1.5);
commit;
SQL
}
session race-1 0 > "$TMPDIR/race1.out" &
session race-2 0.5 > "$TMPDIR/race2.out" &
wait
cat "$TMPDIR/race1.out" "$TMPDIR/race2.out"

balance=$(psql -tA -c "select public.contract_balance_minutes('30000000-0000-0000-0000-000000000002')")
debits=$(psql -tA -c "select count(*) from public.subscription_hour_ledger where source_id in (select id from public.teacher_live_attendance where slot_id like 'race-%') and entry_type='debit'")
if [[ "$balance" != "30" || "$debits" != "1" ]]; then
  echo "RACE FAILED: balance=$balance debits=$debits (expected 30 / 1)"; exit 1
fi
echo "ok  race: one debit won, balance 30, never negative"

# Isolation guard: REPEATABLE READ must be refused before any read.
out=$(psql -v ON_ERROR_STOP=0 <<'SQL' 2>&1 || true
begin isolation level repeatable read;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
set local role authenticated;
select public.post_live_attendance_debit((select id from public.teacher_live_attendance where slot_id='race-2'));
rollback;
SQL
)
grep -q "require READ COMMITTED" <<<"$out" || { echo "ISOLATION GUARD FAILED: $out"; exit 1; }
echo "ok  repeatable read is refused by the ledger RPCs"
