-- Candidate local migration: a selected active plan must retain published subjects.
-- Touch subject row versions on activation: row locks alone do not invalidate a
-- REPEATABLE READ snapshot that predates the plan/subject association.
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
    if new.coverage_mode = 'selected' then
      if not exists (select 1 from public.subscription_plan_subjects s where s.plan_id = new.id) then
        raise exception 'at least one subject and its price are required before activation';
      end if;
      update public.curriculum_subjects c set published = c.published
        where c.key in (select s.subject_key from public.subscription_plan_subjects s where s.plan_id = new.id);
      if exists (
        select 1 from public.subscription_plan_subjects s
        left join public.curriculum_subjects c on c.key = s.subject_key
        where s.plan_id = new.id and c.published is distinct from true
      ) then
        raise exception 'active plans require published subjects' using errcode = '23514';
      end if;
    end if;
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create function public.prevent_unpublishing_active_plan_subject()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.published and not new.published and exists (
    select 1 from public.subscription_plan_subjects s
    join public.subscription_plans p on p.id = s.plan_id
    where s.subject_key = old.key and p.status = 'active'
  ) then
    raise exception 'archive active selected-subject plans before unpublishing this subject'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke execute on function public.prevent_unpublishing_active_plan_subject()
  from public, anon, authenticated;

create trigger curriculum_subjects_active_plan_publication_guard
  before update of published on public.curriculum_subjects
  for each row execute function public.prevent_unpublishing_active_plan_subject();
