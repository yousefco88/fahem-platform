#!/usr/bin/env bash
set -euo pipefail
# Execute from the repository root. Isolated PostgreSQL: no host port or network.
node tests/sql/check_migration_versions.js 20261101071045 20261101071116
container="fahem-catalog-test-$$"
cleanup() { docker stop "$container" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker run -d --rm --network none --tmpfs /var/lib/postgresql/data:rw,size=128m \
  -e POSTGRES_HOST_AUTH_METHOD=trust --name "$container" postgres:17-alpine >/dev/null
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
for sql in \
  tests/sql/fixture_subscription_catalog.sql \
  supabase/migrations/20261031000536_subscription_catalog_foundation.sql \
  supabase/migrations/20261101071045_lock_subscription_catalog_writes.sql \
  supabase/migrations/20261101071116_keep_active_catalog_subjects_published.sql \
  tests/sql/subscription_catalog_acl.sql; do
  if [[ "$sql" == supabase/migrations/20261101071045_lock_subscription_catalog_writes.sql ]]; then
    # Reproduce hosted Supabase's broad initial table ACL before testing the lock.
    docker exec "$container" psql -q -v ON_ERROR_STOP=1 -U postgres \
      -c 'grant all on public.subscription_plans, public.subscription_plan_subjects, public.subscription_plan_audit to anon, authenticated;'
  fi
  docker exec -i "$container" psql -q -v ON_ERROR_STOP=1 -U postgres < "$sql"
done
bash tests/sql/run_subscription_catalog_race.sh "$container"
printf 'Isolated catalog ACL/RPC acceptance passed.\n'
