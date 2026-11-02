#!/usr/bin/env bash
set -euo pipefail
# Isolated synthetic PostgreSQL only; no network, host port, or production data.
container="fahem-staff-perms-test-$$"
cleanup() { docker stop "$container" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker run -d --rm --network none --tmpfs /var/lib/postgresql/data:rw,size=128m \
  -e POSTGRES_HOST_AUTH_METHOD=trust --name "$container" postgres:17-alpine >/dev/null
for attempt in {1..30}; do
  if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$container" pg_isready -U postgres >/dev/null
docker exec -i "$container" psql -q -v ON_ERROR_STOP=1 -U postgres < tests/sql/fixture_staff_scoped_permissions.sql
docker exec -i "$container" psql -q -1 -v ON_ERROR_STOP=1 -U postgres < supabase/migrations/20261110100000_staff_scoped_permissions.sql
docker exec -i "$container" psql -q -1 -v ON_ERROR_STOP=1 -U postgres < supabase/migrations/20261110110000_staff_scoped_policies.sql
# Re-applying must be safe (idempotent DDL).
docker exec -i "$container" psql -q -1 -v ON_ERROR_STOP=1 -U postgres < supabase/migrations/20261110100000_staff_scoped_permissions.sql
docker exec -i "$container" psql -q -1 -v ON_ERROR_STOP=1 -U postgres < supabase/migrations/20261110110000_staff_scoped_policies.sql
docker exec -i "$container" psql -q -v ON_ERROR_STOP=1 -U postgres < tests/sql/staff_scoped_permissions.sql
printf 'Isolated staff scoped-permissions acceptance passed.\n'
