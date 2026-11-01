#!/usr/bin/env bash
set -euo pipefail
# Local ephemeral PostgreSQL only; no host port, network, or persistent disk.
container="fahem-child-delete-test-$$"
cleanup() { docker stop "$container" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker run -d --rm --network none --tmpfs /var/lib/postgresql/data:rw,size=128m \
  -e POSTGRES_HOST_AUTH_METHOD=trust --name "$container" postgres:17-alpine >/dev/null
for attempt in {1..30}; do
  if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$container" pg_isready -U postgres >/dev/null
docker exec -i "$container" psql -q -v ON_ERROR_STOP=1 -U postgres < tests/sql/child_deletion_relations.sql
printf 'Isolated child deletion FK relationships passed.\n'
