#!/usr/bin/env bash
set -euo pipefail
container="$1"
# All values below are synthetic and the caller's container has no network or host port.
docker exec "$container" psql -Xq -v ON_ERROR_STOP=1 -U postgres \
  -c "SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001'" -c \
  "SELECT public.save_subscription_plan(null, 'Race selected', 30, 2, 'selected', null, 'draft', '[{\"subject_key\":\"math\",\"price_per_child_minor\":200}]'::jsonb)" >/dev/null
race_output="${TMPDIR:-.}/fahem-catalog-race-$$.log"
cleanup() { rm -f "$race_output"; }
trap cleanup EXIT
(docker exec -i "$container" psql -Xq -v ON_ERROR_STOP=1 -U postgres \
  < tests/sql/subscription_catalog_race_reader.sql > "$race_output" 2>&1) &
reader_pid=$!
ready=0
for attempt in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
  if docker exec "$container" psql -XAt -U postgres -c \
    "SELECT count(*) FROM pg_stat_activity WHERE query LIKE 'SELECT pg_sleep(3)%' AND state = 'active'" | grep -qx '1'; then
    ready=1
    break
  fi
  sleep 0.1
done
if [ "$ready" -ne 1 ]; then
  wait "$reader_pid" || true
  printf 'Reader never established a repeatable-read snapshot.\n' >&2
  exit 1
fi
docker exec "$container" psql -Xq -v ON_ERROR_STOP=1 -U postgres \
  -c "SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001'" -c \
  "SELECT public.save_subscription_plan((SELECT id FROM public.subscription_plans WHERE name = 'Race selected'), 'Race selected', 30, 2, 'selected', null, 'active', '[{\"subject_key\":\"math\",\"price_per_child_minor\":200}]'::jsonb)" >/dev/null
reader_exit=0
wait "$reader_pid" || reader_exit=$?
if [ "$reader_exit" -eq 0 ]; then
  printf 'Repeatable-read unpublish committed despite a concurrent activation.\n' >&2
  exit 1
fi
if ! grep -q 'could not serialize access' "$race_output"; then
  printf 'Unexpected reader failure (not serialization):\n' >&2
  grep '^ERROR:' "$race_output" >&2 || true
  exit 1
fi
docker exec "$container" psql -XAt -v ON_ERROR_STOP=1 -U postgres -c \
  "SELECT status = 'active' AND published FROM public.subscription_plans, public.curriculum_subjects WHERE name = 'Race selected' AND key = 'math'" | grep -qx 't'
printf 'Isolated repeatable-read activation race passed.\n'
docker exec "$container" psql -Xq -v ON_ERROR_STOP=1 -U postgres \
  -c "SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001'" -c \
  "SELECT public.archive_subscription_plan((SELECT id FROM public.subscription_plans WHERE name = 'Race selected'))" -c \
  "SELECT public.save_subscription_plan(null, 'Race reverse', 30, 2, 'selected', null, 'draft', '[{\"subject_key\":\"math\",\"price_per_child_minor\":200}]'::jsonb)" >/dev/null
(docker exec -i "$container" psql -Xq -v ON_ERROR_STOP=1 -U postgres \
  < tests/sql/subscription_catalog_reverse_race_reader.sql > "$race_output" 2>&1) &
reader_pid=$!
ready=0
for attempt in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
  if docker exec "$container" psql -XAt -U postgres -c \
    "SELECT count(*) FROM pg_stat_activity WHERE query LIKE 'SELECT pg_sleep(3)%' AND state = 'active'" | grep -qx '1'; then
    ready=1
    break
  fi
  sleep 0.1
done
if [ "$ready" -ne 1 ]; then
  wait "$reader_pid" || true
  printf 'Activation never established a repeatable-read snapshot.\n' >&2
  exit 1
fi
docker exec "$container" psql -Xq -v ON_ERROR_STOP=1 -U postgres \
  -c "UPDATE public.curriculum_subjects SET published = false WHERE key = 'math'" >/dev/null
reader_exit=0
wait "$reader_pid" || reader_exit=$?
if [ "$reader_exit" -eq 0 ]; then
  printf 'Stale activation committed after a concurrent unpublish.\n' >&2
  exit 1
fi
if ! grep -Eq 'could not serialize access|active plans require published subjects' "$race_output"; then
  printf 'Unexpected activation failure:\n' >&2
  grep '^ERROR:' "$race_output" >&2 || true
  exit 1
fi
docker exec "$container" psql -XAt -v ON_ERROR_STOP=1 -U postgres -c \
  "SELECT (SELECT status FROM public.subscription_plans WHERE name = 'Race reverse') = 'draft' AND NOT (SELECT published FROM public.curriculum_subjects WHERE key = 'math')" | grep -qx 't'
printf 'Isolated repeatable-read reverse race passed.\n'
