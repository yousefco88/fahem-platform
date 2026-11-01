-- Local candidate only. Restrict catalog changes to the validated RPC path.
-- Do not apply to production before an independent review and explicit release authorization.
-- Client roles must not have whole-table privileges. TRUNCATE and REFERENCES
-- bypass RLS, including on the audit trail. Preserve read access through RLS.
revoke all on public.subscription_plans, public.subscription_plan_subjects,
  public.subscription_plan_audit from anon, authenticated;
grant select on public.subscription_plans, public.subscription_plan_subjects to anon, authenticated;
grant select on public.subscription_plan_audit to authenticated;

-- Trigger functions are internal implementation details, not public RPCs.
revoke execute on function public.audit_subscription_catalog_change(),
  public.validate_subscription_plan_activation(),
  public.prevent_empty_active_subject_plan()
  from public, anon, authenticated;

drop policy if exists "admins manage subscription plans" on public.subscription_plans;
drop policy if exists "admins manage subscription plan subjects" on public.subscription_plan_subjects;

create or replace function public.archive_subscription_plan(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.subscription_plans
  set status = 'archived', updated_by = auth.uid()
  where id = p_id;
  if not found then raise exception 'plan not found'; end if;
  return p_id;
end;
$$;
revoke all on function public.archive_subscription_plan(uuid) from public, anon;
grant execute on function public.archive_subscription_plan(uuid) to authenticated;
