#!/usr/bin/env bash
set -euo pipefail
# Isolated synthetic PostgreSQL, no network or production data.
container="fahem-legacy-privacy-$$"
cleanup() { docker rm -f "$container" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker run -d --rm --network none --tmpfs /var/lib/postgresql/data:rw,size=256m \
  -e POSTGRES_HOST_AUTH_METHOD=trust --name "$container" postgres:17-alpine >/dev/null
for attempt in {1..30}; do
  if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$container" pg_isready -U postgres >/dev/null
docker exec -i "$container" psql -q -v ON_ERROR_STOP=1 -U postgres < tests/legacy-lesson-privacy-fixture.sql
docker exec -i "$container" psql -q -v ON_ERROR_STOP=1 -U postgres < tests/legacy-lesson-privacy-ambiguous.sql
if docker exec -i "$container" psql -q -1 -v ON_ERROR_STOP=1 -U postgres \
  < supabase/migrations/20261101131555_private_legacy_lesson_answers.sql >/dev/null 2>&1; then
  printf 'ERROR: migration accepted ambiguous answer keys.\n' >&2
  exit 1
fi
if [[ "$(docker exec "$container" psql -At -U postgres -c "select to_regclass('public.legacy_lesson_answers') is null")" != t ]]; then
  printf 'ERROR: failed ambiguous migration left private tables behind.\n' >&2
  exit 1
fi
docker exec "$container" psql -q -v ON_ERROR_STOP=1 -U postgres -c "delete from public.curriculum_lessons where id = 'ambiguous'"
docker exec -i "$container" psql -q -v ON_ERROR_STOP=1 -U postgres < supabase/migrations/20261101131555_private_legacy_lesson_answers.sql
docker exec -i "$container" psql -q -v ON_ERROR_STOP=1 -U postgres < tests/legacy-lesson-privacy-assertions.sql
printf 'Isolated legacy-lesson privacy acceptance passed.\n'
