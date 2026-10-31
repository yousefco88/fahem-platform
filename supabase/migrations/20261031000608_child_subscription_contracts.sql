-- Local-only contract/entitlement schema for the subscriptions foundation.
-- No client write API, purchase flow, refund policy, or hour-consumption ledger is defined here.
-- Do not apply to a hosted database without separate review and explicit authorization.

create table public.child_subscription_contracts (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete restrict,
  plan_id uuid not null references public.subscription_plans(id) on delete restrict,
  renewed_from_id uuid references public.child_subscription_contracts(id) on delete restrict,
  plan_snapshot jsonb not null check (jsonb_typeof(plan_snapshot) = 'object'),
  coverage_mode_snapshot text not null check (coverage_mode_snapshot in ('all', 'selected')),
  included_hours_snapshot numeric(8,2) check (
    included_hours_snapshot is null or included_hours_snapshot >= 0
  ),
  quoted_total_minor integer check (quoted_total_minor is null or quoted_total_minor >= 0),
  currency char(3) not null default 'SAR',
  starts_at timestamptz,
  ends_at timestamptz,
  renewal_mode text not null default 'manual' check (renewal_mode in ('manual', 'automatic')),
  cancel_at_period_end boolean not null default false,
  status text not null default 'draft' check (
    status in ('draft', 'active', 'cancel_scheduled', 'cancelled', 'expired', 'suspended')
  ),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check ((starts_at is null and ends_at is null) or
         (starts_at is not null and ends_at is not null and ends_at > starts_at)),
  check (status not in ('active', 'cancel_scheduled') or
         (starts_at is not null and ends_at is not null and included_hours_snapshot is not null
          and quoted_total_minor is not null)),
  check ((status = 'cancel_scheduled') = cancel_at_period_end)
);

create table public.child_subscription_subjects (
  contract_id uuid not null references public.child_subscription_contracts(id) on delete restrict,
  subject_key text not null,
  price_per_child_minor_snapshot integer not null check (price_per_child_minor_snapshot >= 0),
  primary key (contract_id, subject_key)
);

create index child_subscription_contracts_child_status_idx
  on public.child_subscription_contracts (child_id, status, ends_at desc);
create index child_subscription_contracts_plan_idx
  on public.child_subscription_contracts (plan_id);

alter table public.child_subscription_contracts enable row level security;
alter table public.child_subscription_subjects enable row level security;

create policy "admins read child subscription contracts"
  on public.child_subscription_contracts for select to authenticated
  using (public.is_admin());
create policy "parents read own child subscription contracts"
  on public.child_subscription_contracts for select to authenticated
  using (
    status <> 'draft'
    and exists (
      select 1 from public.children c
      where c.id = child_id and c.parent_id = auth.uid()
    )
  );

create policy "admins read child subscription subjects"
  on public.child_subscription_subjects for select to authenticated
  using (public.is_admin());
create policy "parents read own child subscription subjects"
  on public.child_subscription_subjects for select to authenticated
  using (exists (
    select 1
    from public.child_subscription_contracts sc
    join public.children c on c.id = sc.child_id
    where sc.id = contract_id and sc.status <> 'draft' and c.parent_id = auth.uid()
  ));

create or replace function public.validate_child_subscription_coverage()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_contract_ids uuid[];
  v_contract_id uuid;
  v_coverage text;
  v_status text;
  v_subject_count integer;
begin
  if tg_table_name = 'child_subscription_contracts' then
    if tg_op = 'DELETE' then return null; end if;
    v_contract_ids := array[new.id];
  elsif tg_op = 'DELETE' then
    v_contract_ids := array[old.contract_id];
  elsif tg_op = 'UPDATE' then
    v_contract_ids := array[old.contract_id, new.contract_id];
  else
    v_contract_ids := array[new.contract_id];
  end if;

  foreach v_contract_id in array v_contract_ids loop
    select coverage_mode_snapshot, status
      into v_coverage, v_status
      from public.child_subscription_contracts
      where id = v_contract_id;
    if not found then continue; end if;

    select count(*) into v_subject_count
      from public.child_subscription_subjects
      where contract_id = v_contract_id;

    if v_coverage = 'all' and v_subject_count > 0 then
      raise exception 'all-coverage contracts cannot list selected subjects';
    end if;
    if v_coverage = 'selected' and v_status in ('active', 'cancel_scheduled')
       and v_subject_count = 0 then
      raise exception 'active selected-coverage contracts require at least one subject';
    end if;
  end loop;
  return null;
end;
$$;

create constraint trigger child_subscription_contracts_coverage_check
  after insert or update on public.child_subscription_contracts
  deferrable initially deferred
  for each row execute function public.validate_child_subscription_coverage();
create constraint trigger child_subscription_subjects_coverage_check
  after insert or update or delete on public.child_subscription_subjects
  deferrable initially deferred
  for each row execute function public.validate_child_subscription_coverage();
revoke all on function public.validate_child_subscription_coverage() from public, anon, authenticated;

revoke all on table public.child_subscription_contracts, public.child_subscription_subjects
  from public, anon, authenticated;
grant select on public.child_subscription_contracts, public.child_subscription_subjects
  to authenticated;
revoke insert, update, delete on public.child_subscription_contracts, public.child_subscription_subjects
  from anon, authenticated;
