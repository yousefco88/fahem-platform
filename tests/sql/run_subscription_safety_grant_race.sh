#!/usr/bin/env bash
set -euo pipefail
# Real concurrency: two admin sessions grant overlapping all-coverage contracts to the same
# synthetic child; first holds its transaction open. Expected: exactly one active contract.
container="$1"
psql() { docker exec -i "$container" psql -q -v ON_ERROR_STOP=1 -U postgres "$@"; }
psql -c "insert into public.children (id, parent_id, name) values ('10000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000004', 'Race child D (synthetic)')"
grant_session() {
  local delay="$1" note="$2"
  psql -v ON_ERROR_STOP=0 <<SQL 2>&1 | grep -E "granted|ERROR" || true
begin;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
set local role authenticated;
select pg_sleep($delay);
select public.admin_grant_child_contract('10000000-0000-0000-0000-0000000000d1','20000000-0000-0000-0000-000000000001', null, now(), '$note') ->> 'status';
select pg_sleep(1.5);
commit;
SQL
}
grant_session 0 'race ref A' > "$TMPDIR/grant1.out" &
grant_session 0.5 'race ref B' > "$TMPDIR/grant2.out" &
wait
cat "$TMPDIR/grant1.out" "$TMPDIR/grant2.out"
n=$(psql -tA -c "select count(*) from public.child_subscription_contracts where child_id='10000000-0000-0000-0000-0000000000d1' and status='active'")
if [[ "$n" != "1" ]]; then echo "GRANT RACE FAILED: $n active overlapping contracts (expected 1)"; exit 1; fi
grep -q overlapping "$TMPDIR/grant1.out" "$TMPDIR/grant2.out" || { echo "GRANT RACE FAILED: loser did not report overlap"; exit 1; }
echo "ok  grant race: one contract granted, concurrent overlap refused"
