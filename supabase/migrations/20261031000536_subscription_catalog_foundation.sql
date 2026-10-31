-- Local-only foundation for the configurable subscription catalog.
-- Do not apply until separately reviewed and explicitly authorized.
create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 100),
  duration_days integer check (duration_days is null or duration_days > 0),
  included_hours numeric(8,2) check (included_hours is null or included_hours >= 0),
  coverage_mode text not null default 'all' check (coverage_mode in ('all', 'selected')),
  price_per_child_minor integer check (price_per_child_minor is null or price_per_child_minor >= 0),
  currency char(3) not null default 'SAR',
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  sibling_discount_enabled boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    coverage_mode = 'all'
    or (coverage_mode = 'selected' and price_per_child_minor is null)
  )
);

create table if not exists public.subscription_plan_subjects (
  plan_id uuid not null references public.subscription_plans(id) on delete cascade,
  subject_key text not null references public.curriculum_subjects(key) on update cascade on delete restrict,
  price_per_child_minor integer not null check (price_per_child_minor >= 0),
  created_at timestamptz not null default now(),
  primary key (plan_id, subject_key)
);

create table if not exists public.subscription_plan_audit (
  id bigint generated always as identity primary key,
  plan_id uuid not null,
  action text not null check (action in ('insert', 'update', 'delete', 'subject_insert', 'subject_update', 'subject_delete')),
  actor_id uuid references auth.users(id) on delete set null,
  occurred_at timestamptz not null default now(),
  old_data jsonb,
  new_data jsonb
);

alter table public.subscription_plans enable row level security;
alter table public.subscription_plan_subjects enable row level security;
alter table public.subscription_plan_audit enable row level security;

create policy "active subscription plans are readable"
  on public.subscription_plans for select to anon, authenticated
  using (status = 'active' or public.is_admin());
create policy "admins manage subscription plans"
  on public.subscription_plans for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "active plan subjects are readable"
  on public.subscription_plan_subjects for select to anon, authenticated
  using (exists (
    select 1 from public.subscription_plans p
    where p.id = plan_id and (p.status = 'active' or public.is_admin())
  ));
create policy "admins manage subscription plan subjects"
  on public.subscription_plan_subjects for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "admins read subscription plan audit"
  on public.subscription_plan_audit for select to authenticated
  using (public.is_admin());

grant select on public.subscription_plans, public.subscription_plan_subjects to anon, authenticated;
grant insert, update, delete on public.subscription_plans, public.subscription_plan_subjects to authenticated;
grant select on public.subscription_plan_audit to authenticated;

create or replace function public.audit_subscription_catalog_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan_id uuid;
  v_action text;
begin
  if tg_table_name = 'subscription_plans' then
    if tg_op = 'DELETE' then v_plan_id := old.id; else v_plan_id := new.id; end if;
    v_action := lower(tg_op);
  else
    if tg_op = 'DELETE' then v_plan_id := old.plan_id; else v_plan_id := new.plan_id; end if;
    v_action := 'subject_' || lower(tg_op);
  end if;
  insert into public.subscription_plan_audit (plan_id, action, actor_id, old_data, new_data)
  values (v_plan_id, v_action, auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger subscription_plans_audit
  after insert or update or delete on public.subscription_plans
  for each row execute function public.audit_subscription_catalog_change();
create trigger subscription_plan_subjects_audit
  after insert or update or delete on public.subscription_plan_subjects
  for each row execute function public.audit_subscription_catalog_change();

create or replace function public.validate_subscription_plan_activation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.status = 'active' then
    if new.duration_days is null or new.included_hours is null then
      raise exception 'duration and included hours are required before activation';
    end if;
    if new.coverage_mode = 'all' and new.price_per_child_minor is null then
      raise exception 'per-child price is required before activation';
    end if;
    if new.coverage_mode = 'selected' and not exists (
      select 1 from public.subscription_plan_subjects s where s.plan_id = new.id
    ) then
      raise exception 'at least one subject and its price are required before activation';
    end if;
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create trigger subscription_plan_validate_activation
  before insert or update on public.subscription_plans
  for each row execute function public.validate_subscription_plan_activation();

create or replace function public.prevent_empty_active_subject_plan()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_plan_id uuid := coalesce(old.plan_id, new.plan_id);
begin
  if exists (select 1 from public.subscription_plans p where p.id = v_plan_id and p.status = 'active')
     and not exists (select 1 from public.subscription_plan_subjects s where s.plan_id = v_plan_id) then
    raise exception 'an active selected-subject plan must include at least one subject';
  end if;
  return null;
end;
$$;

create constraint trigger subscription_plan_subjects_keep_active_nonempty
  after delete or update on public.subscription_plan_subjects
  deferrable initially deferred
  for each row execute function public.prevent_empty_active_subject_plan();

create or replace function public.save_subscription_plan(
  p_id uuid,
  p_name text,
  p_duration_days integer,
  p_included_hours numeric,
  p_coverage_mode text,
  p_price_per_child_minor integer,
  p_status text,
  p_subjects jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_subject_count integer;
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_name, ''))) not between 2 and 100 then
    raise exception 'invalid plan name';
  end if;
  if p_duration_days is not null and p_duration_days <= 0 then
    raise exception 'duration must be positive';
  end if;
  if p_included_hours is not null and p_included_hours < 0 then
    raise exception 'hours cannot be negative';
  end if;
  if (p_coverage_mode is null or p_status is null or p_coverage_mode not in ('all', 'selected') or p_status not in ('draft', 'active', 'archived')) then
    raise exception 'invalid plan settings';
  end if;
  if p_coverage_mode = 'all' and coalesce(p_subjects, '[]'::jsonb) <> '[]'::jsonb then
    raise exception 'all-subject plans cannot include a selected-subject list';
  end if;
  if p_coverage_mode = 'selected' and p_price_per_child_minor is not null then
    raise exception 'selected-subject plans use per-subject prices';
  end if;
  if p_price_per_child_minor is not null and p_price_per_child_minor < 0 then
    raise exception 'price cannot be negative';
  end if;
  if jsonb_typeof(coalesce(p_subjects, '[]'::jsonb)) <> 'array' then
    raise exception 'subjects must be an array';
  end if;
  select count(*) into v_subject_count from jsonb_array_elements(coalesce(p_subjects, '[]'::jsonb));
  if p_status = 'active' and (p_duration_days is null or p_included_hours is null
      or (p_coverage_mode = 'all' and p_price_per_child_minor is null)
      or (p_coverage_mode = 'selected' and v_subject_count = 0)) then
    raise exception 'complete duration, hours, price and coverage before activation';
  end if;
  if p_status = 'active' and p_coverage_mode = 'selected' and exists (
    select 1
    from jsonb_to_recordset(coalesce(p_subjects, '[]'::jsonb)) as x(subject_key text, price_per_child_minor integer)
    left join public.curriculum_subjects s on s.key = x.subject_key
    where s.published is distinct from true
  ) then
    raise exception 'active plans require published subjects' using errcode = '23514';
  end if;

  if p_id is null then
    insert into public.subscription_plans (name, duration_days, included_hours, coverage_mode,
      price_per_child_minor, currency, status, created_by, updated_by)
    values (trim(p_name), p_duration_days, p_included_hours, p_coverage_mode,
      p_price_per_child_minor, 'SAR', 'draft', auth.uid(), auth.uid())
    returning id into v_id;
  else
    v_id := p_id;
    update public.subscription_plans set
      name = trim(p_name), duration_days = p_duration_days, included_hours = p_included_hours,
      coverage_mode = p_coverage_mode, price_per_child_minor = p_price_per_child_minor,
      currency = 'SAR', status = 'draft', updated_by = auth.uid()
    where id = v_id;
    if not found then raise exception 'plan not found'; end if;
  end if;

  delete from public.subscription_plan_subjects where plan_id = v_id;
  if p_coverage_mode = 'selected' then
    insert into public.subscription_plan_subjects (plan_id, subject_key, price_per_child_minor)
    select v_id, x.subject_key, x.price_per_child_minor
    from jsonb_to_recordset(coalesce(p_subjects, '[]'::jsonb)) as x(subject_key text, price_per_child_minor integer);
  end if;
  update public.subscription_plans set status = p_status, updated_by = auth.uid() where id = v_id;
  return v_id;
end;
$$;

revoke all on function public.save_subscription_plan(uuid, text, integer, numeric, text, integer, text, jsonb) from public, anon;
grant execute on function public.save_subscription_plan(uuid, text, integer, numeric, text, integer, text, jsonb) to authenticated;
