-- Run after subscription-bootstrap.sql and the original catalog migration in an isolated PostgreSQL database.
\set ON_ERROR_STOP on
DO $$
BEGIN
  IF has_table_privilege('authenticated', 'public.subscription_plans', 'INSERT')
    OR has_table_privilege('authenticated', 'public.subscription_plans', 'UPDATE')
    OR has_table_privilege('authenticated', 'public.subscription_plans', 'DELETE')
    OR has_table_privilege('authenticated', 'public.subscription_plans', 'TRUNCATE')
    OR has_table_privilege('authenticated', 'public.subscription_plans', 'REFERENCES')
    OR has_table_privilege('authenticated', 'public.subscription_plans', 'TRIGGER')
    OR has_table_privilege('authenticated', 'public.subscription_plans', 'MAINTAIN')
    OR has_table_privilege('authenticated', 'public.subscription_plan_subjects', 'INSERT')
    OR has_table_privilege('authenticated', 'public.subscription_plan_subjects', 'UPDATE')
    OR has_table_privilege('authenticated', 'public.subscription_plan_subjects', 'DELETE')
    OR has_table_privilege('authenticated', 'public.subscription_plan_subjects', 'TRUNCATE')
    OR has_table_privilege('authenticated', 'public.subscription_plan_subjects', 'REFERENCES')
    OR has_table_privilege('authenticated', 'public.subscription_plan_subjects', 'TRIGGER')
    OR has_table_privilege('authenticated', 'public.subscription_plan_subjects', 'MAINTAIN')
    OR has_table_privilege('anon', 'public.subscription_plans', 'TRUNCATE')
    OR has_table_privilege('anon', 'public.subscription_plans', 'REFERENCES')
    OR has_table_privilege('anon', 'public.subscription_plans', 'TRIGGER')
    OR has_table_privilege('anon', 'public.subscription_plans', 'MAINTAIN')
    OR has_table_privilege('anon', 'public.subscription_plan_subjects', 'TRUNCATE')
    OR has_table_privilege('anon', 'public.subscription_plan_subjects', 'REFERENCES')
    OR has_table_privilege('anon', 'public.subscription_plan_subjects', 'TRIGGER')
    OR has_table_privilege('anon', 'public.subscription_plan_subjects', 'MAINTAIN') THEN
    RAISE EXCEPTION 'client role still has catalog write or RLS-bypass privileges';
  END IF;
  IF NOT has_table_privilege('anon', 'public.subscription_plans', 'SELECT')
    OR NOT has_table_privilege('authenticated', 'public.subscription_plan_subjects', 'SELECT') THEN
    RAISE EXCEPTION 'catalog public read grant was removed';
  END IF;
  IF has_table_privilege('anon', 'public.subscription_plan_audit', 'SELECT')
    OR has_table_privilege('anon', 'public.subscription_plan_audit', 'TRUNCATE')
    OR has_table_privilege('authenticated', 'public.subscription_plan_audit', 'TRUNCATE')
    OR has_table_privilege('anon', 'public.subscription_plan_audit', 'INSERT')
    OR has_table_privilege('authenticated', 'public.subscription_plan_audit', 'INSERT')
    OR has_table_privilege('authenticated', 'public.subscription_plan_audit', 'UPDATE')
    OR has_table_privilege('authenticated', 'public.subscription_plan_audit', 'DELETE')
    OR has_table_privilege('authenticated', 'public.subscription_plan_audit', 'REFERENCES')
    OR has_table_privilege('authenticated', 'public.subscription_plan_audit', 'TRIGGER')
    OR has_table_privilege('authenticated', 'public.subscription_plan_audit', 'MAINTAIN')
    OR NOT has_table_privilege('authenticated', 'public.subscription_plan_audit', 'SELECT') THEN
    RAISE EXCEPTION 'catalog audit ACL is unsafe';
  END IF;
  IF has_function_privilege('anon', 'public.audit_subscription_catalog_change()', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.audit_subscription_catalog_change()', 'EXECUTE')
    OR has_function_privilege('anon', 'public.validate_subscription_plan_activation()', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.prevent_empty_active_subject_plan()', 'EXECUTE')
    OR has_function_privilege('anon', 'public.prevent_unpublishing_active_plan_subject()', 'EXECUTE') THEN
    RAISE EXCEPTION 'catalog trigger functions are exposed as RPC';
  END IF;
  IF has_function_privilege('anon', 'public.archive_subscription_plan(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can archive plans';
  END IF;
END $$;

SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
SET ROLE authenticated;
SELECT public.save_subscription_plan(null, 'Test selected', 30, 2, 'selected', null, 'active',
  '[{"subject_key":"english","price_per_child_minor":200}]'::jsonb) AS selected_id \gset
DO $$
BEGIN
  BEGIN
    UPDATE public.curriculum_subjects SET published = false WHERE key = 'english';
    RAISE EXCEPTION 'active selected-subject plan lost a published subject' USING ERRCODE = 'P0002';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  IF (SELECT published FROM public.curriculum_subjects WHERE key = 'english') IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'active plan subject is unpublished';
  END IF;
END $$;
DO $$
BEGIN
  BEGIN
    UPDATE public.subscription_plans SET coverage_mode = 'all', price_per_child_minor = 100
      WHERE name = 'Test selected';
    RAISE EXCEPTION 'admin direct update succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
SELECT public.archive_subscription_plan(:'selected_id') AS archived_id \gset
UPDATE public.curriculum_subjects SET published = false WHERE key = 'english';
DO $$
BEGIN
  IF (SELECT published FROM public.curriculum_subjects WHERE key = 'english') IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'archiving did not permit unpublishing the subject';
  END IF;
  IF (SELECT status FROM public.subscription_plans WHERE name = 'Test selected') <> 'archived' THEN
    RAISE EXCEPTION 'archive RPC did not change status';
  END IF;
END $$;
RESET ROLE;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
SET ROLE authenticated;
DO $$
BEGIN
  BEGIN
    PERFORM public.archive_subscription_plan((SELECT id FROM public.subscription_plans WHERE name = 'Test selected'));
    RAISE EXCEPTION 'parent archived a plan';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;
