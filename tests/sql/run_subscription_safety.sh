#!/usr/bin/env bash
set -euo pipefail
# Local-only fixtures, no host port, no network, no Supabase credentials/config.
# --baseline skips only the new hardening migration to reproduce regressions.
mode="${1:-fixed}"
case "$mode" in fixed|--baseline) ;; *) echo "usage: $0 [fixed|--baseline]"; exit 2;; esac
node tests/sql/check_migration_versions.js 20261101150000 20261101160000 20261106100000
container="fahem-subscription-safety-$$"
cleanup() { docker stop "$container" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker run -d --rm --network none --tmpfs /var/lib/postgresql/data:rw,size=128m \
  -e POSTGRES_HOST_AUTH_METHOD=trust --name "$container" postgres:17-alpine >/dev/null
for attempt in $(seq 1 30); do
  if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
for sql in \
  tests/sql/fixture_subscription_catalog.sql \
  tests/sql/fixture_subscription_ledger.sql \
  supabase/migrations/20261031000536_subscription_catalog_foundation.sql \
  supabase/migrations/20261101071045_lock_subscription_catalog_writes.sql \
  supabase/migrations/20261101071116_keep_active_catalog_subjects_published.sql \
  supabase/migrations/20261031000608_child_subscription_contracts.sql \
  supabase/migrations/20261030224921_teacher_live_attendance.sql \
  supabase/migrations/20261101150000_subscription_hour_ledger.sql \
  tests/sql/subscription_hour_ledger.sql \
  supabase/migrations/20261101160000_contract_grant_and_attendance_lock.sql \
  tests/sql/subscription_contract_grant_lock.sql; do
  docker exec -i "$container" psql -q -v ON_ERROR_STOP=1 -U postgres < "$sql"
done
if [[ "$mode" == fixed ]]; then
  docker exec -i "$container" psql -q -v ON_ERROR_STOP=1 -U postgres < supabase/migrations/20261106100000_subscription_safety_hardening.sql
fi
status=0
bash tests/sql/run_subscription_safety_grant_race.sh "$container" || status=1
docker exec -i "$container" psql -q -v ON_ERROR_STOP=1 -U postgres < tests/sql/subscription_safety_hardening.sql || status=1
if [[ $status -ne 0 ]]; then echo "Subscription safety regression FAILED ($mode)"; exit 1; fi
printf 'Isolated subscription safety acceptance passed (%s).\n' "$mode"
