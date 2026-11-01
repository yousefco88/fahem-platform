#!/usr/bin/env bash
set -euo pipefail
# Execute from the repository root. Isolated PostgreSQL: no host port or network.
node tests/sql/check_migration_versions.js 20261101150000 20261101160000
container="fahem-ledger-test-$$"
cleanup() { docker stop "$container" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker run -d --rm --network none --tmpfs /var/lib/postgresql/data:rw,size=128m \
  -e POSTGRES_HOST_AUTH_METHOD=trust --name "$container" postgres:17-alpine >/dev/null
for attempt in $(seq 1 20); do
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
bash tests/sql/run_subscription_hour_ledger_race.sh "$container"
printf 'Isolated hour-ledger acceptance passed.
'
