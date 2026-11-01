-- Transaction A: snapshot precedes a concurrent unpublish; activation must not commit.
\set ON_ERROR_STOP on
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
SELECT count(*) FROM public.subscription_plans;
SELECT pg_sleep(3);
SELECT public.save_subscription_plan(
  (SELECT id FROM public.subscription_plans WHERE name = 'Race reverse'),
  'Race reverse', 30, 2, 'selected', null, 'active',
  '[{"subject_key":"math","price_per_child_minor":200}]'::jsonb
);
COMMIT;
