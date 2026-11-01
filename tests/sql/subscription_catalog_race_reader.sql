-- Transaction A: establish a repeatable-read snapshot before a draft plan is activated.
\set ON_ERROR_STOP on
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT count(*) FROM public.subscription_plans;
SELECT pg_sleep(3);
UPDATE public.curriculum_subjects SET published = false WHERE key = 'math';
COMMIT;
