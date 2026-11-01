#!/usr/bin/env bash
set -euo pipefail
# No production connection. Only synthetic PostgreSQL and localhost PostgREST.
network="fahem-pgrst-test-$$"
db="fahem-pgrst-db-$$"
api="fahem-pgrst-api-$$"
cleanup() {
  docker stop "$api" "$db" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
}
trap cleanup EXIT
docker network create "$network" >/dev/null
docker run -d --rm --network "$network" --network-alias db \
  --tmpfs /var/lib/postgresql/data:rw,size=128m \
  -e POSTGRES_HOST_AUTH_METHOD=trust --name "$db" postgres:17-alpine >/dev/null
for attempt in {1..30}; do
  if docker exec "$db" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$db" pg_isready -U postgres >/dev/null
for sql in \
  tests/sql/fixture_subscription_catalog.sql \
  tests/sql/fixture_subscription_postgrest.sql \
  supabase/migrations/20261031000536_subscription_catalog_foundation.sql \
  supabase/migrations/20261101071045_lock_subscription_catalog_writes.sql \
  supabase/migrations/20261101071116_keep_active_catalog_subjects_published.sql \
  supabase/migrations/20261027120000_lesson_question_attempts.sql \
  supabase/migrations/20261029090000_tighten_grades_and_attempts_rls.sql \
  supabase/migrations/20261103100000_question_attempts_child_id.sql; do
  docker exec -i "$db" psql -q -v ON_ERROR_STOP=1 -U postgres < "$sql"
done
docker exec -i "$db" psql -q -v ON_ERROR_STOP=1 -U postgres <<'SQL'
grant select, insert on public.lesson_question_attempts to authenticated;
grant select on public.curriculum_lessons to authenticated;
grant usage on schema public to anon, authenticated;
grant execute on function public.is_content_editor() to authenticated;
insert into public.lesson_question_attempts
  (id, question_id, lesson_id, parent_id, child_id, child_name, is_correct, created_at) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'lesson', '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'ليلى', true, '2026-10-30T12:00:00Z'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'lesson', '00000000-0000-0000-0000-000000000002', null, 'ليلى', false, '2026-10-30T11:00:00Z'),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'lesson', '00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'ليلى', false, '2026-10-30T10:00:00Z'),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 'lesson', '00000000-0000-0000-0000-000000000003', null, 'ليلى', true, '2026-10-30T09:00:00Z');
-- More than one 1,000-row page, with identical timestamps to exercise the id tie-breaker.
insert into public.lesson_question_attempts
  (id, question_id, lesson_id, parent_id, child_id, child_name, is_correct, created_at)
select ('40000000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid,
  '20000000-0000-0000-0000-000000000001', 'lesson',
  '00000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000001', 'ليلى', true,
  '2026-10-30T12:00:00Z'::timestamptz
from generate_series(1, 1001) as i;
-- The FK migration uses ON DELETE SET NULL. Reuse the name after deletion;
-- the orphan must remain visible as an unassigned historical attempt.
insert into public.children values
  ('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000002');
insert into public.lesson_question_attempts
  (id, question_id, lesson_id, parent_id, child_id, child_name, is_correct, created_at)
values ('30000000-0000-0000-0000-000000000010',
  '20000000-0000-0000-0000-000000000001', 'lesson',
  '00000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000010', 'نور', true, '2026-10-30T08:00:00Z');
delete from public.children where id = '10000000-0000-0000-0000-000000000010';
insert into public.children values
  ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000002');
do $$ begin
  if not exists (select 1 from public.lesson_question_attempts
    where id = '30000000-0000-0000-0000-000000000010'
      and child_id is null and child_name = 'نور') then
    raise exception 'deleted child attempt did not survive with null child_id';
  end if;
end $$;
SQL
# Digest pinned from a locally pulled PostgREST 16.5 image, not a live service.
docker run -d --rm --network "$network" -p 127.0.0.1::3000 --name "$api" \
  -e PGRST_DB_URI='postgres://postgres@db:5432/postgres' \
  -e PGRST_DB_SCHEMAS=public -e PGRST_DB_ANON_ROLE=anon \
  -e PGRST_JWT_SECRET='local-test-only-signature-secret-32bytes-minimum' \
  -e PGRST_SERVER_HOST='0.0.0.0' \
  postgrest/postgrest@sha256:1347d7552b88f17832912c06afbf7c43209af6eeeb60834b04aae12c9bd9d5cc postgrest >/dev/null
port="$(docker port "$api" 3000/tcp | sed 's/^.*://')"
TEST_PGRST_URL="http://127.0.0.1:$port" node tests/sql/subscription_postgrest.test.js
printf 'Isolated PostgREST/RLS acceptance passed.\n'
