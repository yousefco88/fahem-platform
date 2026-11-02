-- أدوار الطاقم والصلاحيات المحدودة بنطاق (مدير منصة · مشرف تعليمي · محرر صلاحيات)
-- الخطة: .hermes/plans/2026-11-03_020000-staff-roles-scoped-permissions.md (قرارات يوسف 2026-11-03)
-- الدور = سقف؛ الصلاحية الفعلية = صف (صلاحية × نطاق) في staff_permissions.
-- لا يتغير معنى is_admin(): المدير العام يملك كل شيء ضمنياً.
-- صلاحيات غير قابلة للمنح أبداً (admin فقط): إدارة المستخدمين والأدوار، تعديل الاشتراكات، المساعد الذكي.

-- 1) الدوران الجديدان ------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('parent', 'teacher', 'content_editor', 'admin', 'platform_manager', 'supervisor'));

alter table public.staff_invites drop constraint if exists staff_invites_role_check;
alter table public.staff_invites add constraint staff_invites_role_check
  check (role in ('teacher', 'content_editor', 'admin', 'platform_manager', 'supervisor'));

-- 2) كتالوج الصلاحيات --------------------------------------------------------
create table if not exists public.staff_capability_catalog (
  capability text primary key,
  scoped boolean not null,          -- true = تقبل نطاق مرحلة/صف/مادة؛ false = النطاق "الكل" فقط
  sort_order integer not null default 0
);
insert into public.staff_capability_catalog (capability, scoped, sort_order) values
  ('content.edit',       true,  10),
  ('lessons.review',     true,  20),
  ('recordings.review',  true,  30),
  ('teachers.assign',    true,  40),
  ('children.view',      true,  50),
  ('children.edit',      true,  60),
  ('schedule.manage',    true,  70),
  ('families.manage',    false, 80),
  ('bookings.manage',    false, 90),
  ('subscriptions.view', false, 100),
  ('settings.edit',      false, 110),
  ('analytics.view',     false, 120)
on conflict (capability) do update set scoped = excluded.scoped, sort_order = excluded.sort_order;

alter table public.staff_capability_catalog enable row level security;
revoke all on public.staff_capability_catalog from public, anon, authenticated;
grant select on public.staff_capability_catalog to authenticated;
drop policy if exists "staff capability catalog readable" on public.staff_capability_catalog;
create policy "staff capability catalog readable" on public.staff_capability_catalog
  for select to authenticated using (true);

-- 3) المنح والتدقيق ---------------------------------------------------------
create table if not exists public.staff_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  capability text not null references public.staff_capability_catalog(capability) on delete cascade,
  scope_kind text not null check (scope_kind in ('all', 'stage', 'grade', 'subject')),
  scope_value text,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  constraint staff_permissions_scope_value_check check ((scope_kind = 'all') = (scope_value is null))
);
create unique index if not exists staff_permissions_unique
  on public.staff_permissions (user_id, capability, scope_kind, coalesce(scope_value, ''));
create index if not exists staff_permissions_user_cap on public.staff_permissions (user_id, capability);

create table if not exists public.staff_permission_audit (
  id bigint generated always as identity primary key,
  actor uuid,
  target uuid not null,
  action text not null check (action in ('grant', 'revoke', 'role_reset', 'preset')),
  capability text,
  scope_kind text,
  scope_value text,
  created_at timestamptz not null default now()
);
create index if not exists staff_permission_audit_target on public.staff_permission_audit (target, created_at desc);

alter table public.staff_permissions enable row level security;
alter table public.staff_permission_audit enable row level security;
revoke all on public.staff_permissions from public, anon, authenticated;
revoke all on public.staff_permission_audit from public, anon, authenticated;
grant select on public.staff_permissions to authenticated;
grant select on public.staff_permission_audit to authenticated;

-- 4) دوال مساعدة -------------------------------------------------------------
create or replace function public.is_platform_manager()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'platform_manager')
$$;

-- سقف كل دور: ما يمكن أن يُمنح له أصلاً.
create or replace function public.staff_role_ceiling(p_role text)
returns text[] language sql immutable set search_path = public as $$
  select case p_role
    when 'platform_manager' then array['content.edit','lessons.review','recordings.review','teachers.assign',
      'children.view','children.edit','schedule.manage','families.manage','bookings.manage',
      'subscriptions.view','settings.edit','analytics.view']
    when 'supervisor' then array['content.edit','lessons.review','recordings.review','teachers.assign',
      'children.view','children.edit','schedule.manage']
    else array[]::text[]
  end
$$;

-- صف الطفل محفوظ أحياناً كمعرّف (g4) وأحياناً كعنوان (الصف الثالث الابتدائي).
create or replace function public.resolve_grade_id(p_grade text)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select g.id from public.grades g where g.id = btrim(p_grade)),
    (select g.id from public.grades g where g.title = btrim(p_grade) order by g.sort_order limit 1)
  )
$$;

-- هل نطاق المنح يغطي الهدف؟ الهدف = مادة و/أو صف.
create or replace function public.staff_scope_matches(p_kind text, p_value text, p_subject_key text, p_grade_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select case p_kind
    when 'all' then true
    when 'subject' then
      case when p_subject_key is not null then p_value = p_subject_key
           else p_grade_id is not null and exists (
             select 1 from public.curriculum_subjects s where s.key = p_value and s.grade_id = p_grade_id)
      end
    when 'grade' then p_grade_id is not null and p_value = p_grade_id
    when 'stage' then p_grade_id is not null and exists (
      select 1 from public.grades g where g.id = p_grade_id and g.stage = p_value)
    else false
  end
$$;

-- المرجع الوحيد لصلاحيات الطاقم. المدير العام = true دائماً.
-- إذا أُعطيت المادة يُشتق صفها من curriculum_subjects ما لم يُمرَّر صف صريح.
create or replace function public.has_capability(p_cap text, p_subject_key text default null, p_grade_id text default null)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1
    from public.profiles pr
    join public.staff_permissions sp on sp.user_id = pr.id
    where pr.id = auth.uid()
      and sp.capability = p_cap
      and sp.capability = any (public.staff_role_ceiling(pr.role))
      and public.staff_scope_matches(sp.scope_kind, sp.scope_value, p_subject_key,
            coalesce(p_grade_id, (select s.grade_id from public.curriculum_subjects s where s.key = p_subject_key)))
  )
$$;

-- يملك الصلاحية بأي نطاق (لإظهار الأقسام وفحص أولي قبل قفل الصفوف).
create or replace function public.has_any_capability(p_cap text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.profiles pr
    join public.staff_permissions sp on sp.user_id = pr.id
    where pr.id = auth.uid() and sp.capability = p_cap
      and sp.capability = any (public.staff_role_ceiling(pr.role))
  )
$$;

create or replace function public.has_capability_for_child(p_cap text, p_child_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or (
    p_child_id is not null and public.has_capability(p_cap, null,
      (select public.resolve_grade_id(c.grade) from public.children c where c.id = p_child_id))
  )
$$;

-- هل نطاق (outer) يحتوي نطاق (inner) بالكامل؟ يُستخدم ليمنح مدير المنصة ما يملكه فقط.
create or replace function public.staff_scope_covers(o_kind text, o_value text, i_kind text, i_value text)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when o_kind = 'all' then true
    when i_kind = 'all' then false
    when o_kind = i_kind then o_value = i_value
    when o_kind = 'stage' and i_kind = 'grade' then exists (
      select 1 from public.grades g where g.id = i_value and g.stage = o_value)
    when o_kind = 'stage' and i_kind = 'subject' then exists (
      select 1 from public.curriculum_subjects s join public.grades g on g.id = s.grade_id
      where s.key = i_value and g.stage = o_value)
    when o_kind = 'grade' and i_kind = 'subject' then exists (
      select 1 from public.curriculum_subjects s where s.key = i_value and s.grade_id = o_value)
    else false
  end
$$;

revoke all on function public.is_platform_manager() from public, anon;
revoke all on function public.staff_role_ceiling(text) from public, anon;
revoke all on function public.resolve_grade_id(text) from public, anon;
revoke all on function public.staff_scope_matches(text, text, text, text) from public, anon;
revoke all on function public.has_capability(text, text, text) from public, anon;
revoke all on function public.has_any_capability(text) from public, anon;
revoke all on function public.has_capability_for_child(text, uuid) from public, anon;
revoke all on function public.staff_scope_covers(text, text, text, text) from public, anon;
grant execute on function public.is_platform_manager() to authenticated;
grant execute on function public.staff_role_ceiling(text) to authenticated;
grant execute on function public.resolve_grade_id(text) to authenticated;
grant execute on function public.staff_scope_matches(text, text, text, text) to authenticated;
grant execute on function public.has_capability(text, text, text) to authenticated;
grant execute on function public.has_any_capability(text) to authenticated;
grant execute on function public.has_capability_for_child(text, uuid) to authenticated;
grant execute on function public.staff_scope_covers(text, text, text, text) to authenticated;

-- دور مستخدم آخر بدون المرور على RLS الخاصة بـ profiles (للسياسات فقط).
create or replace function public.staff_user_role(p_user uuid)
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = p_user
$$;
revoke all on function public.staff_user_role(uuid) from public, anon;
grant execute on function public.staff_user_role(uuid) to authenticated;

-- 5) قراءة المنح والسجل ----------------------------------------------------
drop policy if exists "staff permissions readable" on public.staff_permissions;
create policy "staff permissions readable" on public.staff_permissions
  for select to authenticated using (
    user_id = auth.uid() or public.is_admin()
    or (public.is_platform_manager() and public.staff_user_role(staff_permissions.user_id) = 'supervisor')
  );
drop policy if exists "staff permission audit readable" on public.staff_permission_audit;
create policy "staff permission audit readable" on public.staff_permission_audit
  for select to authenticated using (public.is_admin() or actor = auth.uid());

-- 6) منح / سحب ---------------------------------------------------------------
create or replace function public.staff_grant_capability(
  p_user uuid, p_capability text, p_scope_kind text, p_scope_value text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_caller_admin boolean := public.is_admin();
  v_target_role text;
  v_scoped boolean;
  v_value text := nullif(btrim(p_scope_value), '');
  v_id uuid;
begin
  if auth.uid() is null or not (v_caller_admin or public.is_platform_manager()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_user is null or p_user = auth.uid() then
    raise exception 'cannot grant to yourself' using errcode = '42501';
  end if;
  select role into v_target_role from public.profiles where id = p_user for update;
  if not found then raise exception 'user not found' using errcode = 'P0002'; end if;
  if v_target_role not in ('platform_manager', 'supervisor') then
    raise exception 'target role does not take scoped permissions' using errcode = '22023';
  end if;
  if v_target_role = 'platform_manager' and not v_caller_admin then
    raise exception 'only admin manages platform managers' using errcode = '42501';
  end if;
  select scoped into v_scoped from public.staff_capability_catalog where capability = p_capability;
  if not found or not (p_capability = any (public.staff_role_ceiling(v_target_role))) then
    raise exception 'capability not allowed for this role' using errcode = '22023';
  end if;
  if p_scope_kind not in ('all', 'stage', 'grade', 'subject') then
    raise exception 'invalid scope' using errcode = '22023';
  end if;
  if p_scope_kind = 'all' then
    v_value := null;
  else
    if not v_scoped then raise exception 'capability is platform-wide only' using errcode = '22023'; end if;
    if v_value is null
       or (p_scope_kind = 'stage' and not exists (select 1 from public.grades where stage = v_value))
       or (p_scope_kind = 'grade' and not exists (select 1 from public.grades where id = v_value))
       or (p_scope_kind = 'subject' and not exists (select 1 from public.curriculum_subjects where key = v_value)) then
      raise exception 'invalid scope value' using errcode = '22023';
    end if;
  end if;
  -- مدير المنصة يمنح فقط ما يملكه، وبنطاق ضمن نطاقه.
  if not v_caller_admin and not exists (
    select 1 from public.staff_permissions mine
    where mine.user_id = auth.uid() and mine.capability = p_capability
      and public.staff_scope_covers(mine.scope_kind, mine.scope_value, p_scope_kind, v_value)
  ) then
    raise exception 'cannot grant beyond your own permissions' using errcode = '42501';
  end if;

  insert into public.staff_permissions (user_id, capability, scope_kind, scope_value, granted_by)
  values (p_user, p_capability, p_scope_kind, v_value, auth.uid())
  on conflict do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from public.staff_permissions
     where user_id = p_user and capability = p_capability and scope_kind = p_scope_kind
       and coalesce(scope_value, '') = coalesce(v_value, '');
    return v_id;
  end if;
  insert into public.staff_permission_audit (actor, target, action, capability, scope_kind, scope_value)
  values (auth.uid(), p_user, 'grant', p_capability, p_scope_kind, v_value);
  return v_id;
end $$;

create or replace function public.staff_revoke_capability(p_permission_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v public.staff_permissions%rowtype; v_target_role text;
begin
  if auth.uid() is null or not (public.is_admin() or public.is_platform_manager()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  select * into v from public.staff_permissions where id = p_permission_id for update;
  if not found then raise exception 'permission not found' using errcode = 'P0002'; end if;
  if not public.is_admin() then
    select role into v_target_role from public.profiles where id = v.user_id;
    if v.user_id = auth.uid() or v_target_role is distinct from 'supervisor' or not exists (
      select 1 from public.staff_permissions mine
      where mine.user_id = auth.uid() and mine.capability = v.capability
        and public.staff_scope_covers(mine.scope_kind, mine.scope_value, v.scope_kind, v.scope_value)
    ) then
      raise exception 'cannot revoke this permission' using errcode = '42501';
    end if;
  end if;
  delete from public.staff_permissions where id = p_permission_id;
  insert into public.staff_permission_audit (actor, target, action, capability, scope_kind, scope_value)
  values (auth.uid(), v.user_id, 'revoke', v.capability, v.scope_kind, v.scope_value);
end $$;

-- قالب مدير المنصة: كل صلاحيات سقفه بنطاق "الكل".
create or replace function public.staff_apply_role_preset(p_user uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare v_role text; v_count integer;
begin
  if not public.is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  select role into v_role from public.profiles where id = p_user for update;
  if not found then raise exception 'user not found' using errcode = 'P0002'; end if;
  if v_role <> 'platform_manager' then
    raise exception 'preset exists only for platform managers' using errcode = '22023';
  end if;
  with ins as (
    insert into public.staff_permissions (user_id, capability, scope_kind, scope_value, granted_by)
    select p_user, c, 'all', null, auth.uid() from unnest(public.staff_role_ceiling(v_role)) c
    on conflict do nothing
    returning capability
  ), aud as (
    insert into public.staff_permission_audit (actor, target, action, capability, scope_kind)
    select auth.uid(), p_user, 'preset', capability, 'all' from ins
    returning 1
  )
  select count(*) into v_count from aud;
  return v_count;
end $$;

-- صلاحياتي (للواجهة). المدير العام يأخذ الكتالوج كاملاً بنطاق "الكل".
create or replace function public.my_capabilities()
returns table (capability text, scope_kind text, scope_value text)
language sql stable security definer set search_path = public as $$
  select c.capability, 'all'::text, null::text
    from public.staff_capability_catalog c where public.is_admin()
  union all
  select sp.capability, sp.scope_kind, sp.scope_value
    from public.staff_permissions sp join public.profiles pr on pr.id = sp.user_id
   where sp.user_id = auth.uid() and not public.is_admin()
     and sp.capability = any (public.staff_role_ceiling(pr.role))
$$;

-- قائمة الطاقم ومنحهم لمحرر الصلاحيات.
create or replace function public.staff_list_permissions()
returns table (user_id uuid, full_name text, role text, permissions jsonb)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.is_admin() or public.is_platform_manager()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
    select p.id, p.full_name, p.role,
      coalesce((select jsonb_agg(jsonb_build_object('id', sp.id, 'capability', sp.capability,
                 'scope_kind', sp.scope_kind, 'scope_value', sp.scope_value, 'granted_at', sp.granted_at)
                 order by sp.capability, sp.scope_kind, sp.scope_value)
                from public.staff_permissions sp where sp.user_id = p.id), '[]'::jsonb)
    from public.profiles p
    where p.role in ('platform_manager', 'supervisor')
      and (public.is_admin() or p.role = 'supervisor' or p.id = auth.uid())
    order by p.role, p.full_name;
end $$;

revoke all on function public.staff_grant_capability(uuid, text, text, text) from public, anon;
revoke all on function public.staff_revoke_capability(uuid) from public, anon;
revoke all on function public.staff_apply_role_preset(uuid) from public, anon;
revoke all on function public.my_capabilities() from public, anon;
revoke all on function public.staff_list_permissions() from public, anon;
grant execute on function public.staff_grant_capability(uuid, text, text, text) to authenticated;
grant execute on function public.staff_revoke_capability(uuid) to authenticated;
grant execute on function public.staff_apply_role_preset(uuid) to authenticated;
grant execute on function public.my_capabilities() to authenticated;
grant execute on function public.staff_list_permissions() to authenticated;

-- 7) تغيير الدور والدعوات يقبلان الدورين الجديدين ------------------------------
-- نفس منطق الإنتاج + الدوران الجديدان + تنظيف المنح خارج سقف الدور الجديد.
create or replace function public.admin_set_user_role(p_user uuid, p_role text)
returns void language plpgsql security definer set search_path = public, auth as $$
declare v_current text;
begin
  if not public.is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  if p_role is null or p_role not in ('parent','teacher','content_editor','admin','platform_manager','supervisor') then
    raise exception 'invalid role' using errcode = '22023';
  end if;
  if p_user = auth.uid() then raise exception 'cannot change your own role' using errcode = '22023'; end if;
  select role into v_current from public.profiles where id = p_user for update;
  if not found then raise exception 'user not found' using errcode = 'P0002'; end if;
  if v_current = 'admin' and p_role <> 'admin' and (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception 'cannot remove the last admin' using errcode = '22023';
  end if;
  update public.profiles set role = p_role, updated_at = now() where id = p_user;
  if v_current is distinct from p_role then
    with del as (
      delete from public.staff_permissions
       where user_id = p_user and not (capability = any (public.staff_role_ceiling(p_role)))
      returning capability, scope_kind, scope_value
    )
    insert into public.staff_permission_audit (actor, target, action, capability, scope_kind, scope_value)
    select auth.uid(), p_user, 'role_reset', capability, scope_kind, scope_value from del;
  end if;
end $$;

create or replace function public.admin_invite_staff(p_email text, p_role text default 'teacher')
returns uuid language plpgsql security definer set search_path = public, auth as $$
declare v_email text := lower(trim(p_email)); v_id uuid;
begin
  if not public.is_admin() then raise exception 'not authorized' using errcode='42501'; end if;
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid email' using errcode='22023'; end if;
  if p_role not in ('teacher','content_editor','admin','platform_manager','supervisor') then
    raise exception 'invalid role' using errcode='22023';
  end if;
  if exists (select 1 from auth.users where lower(email)=v_email) then raise exception 'user already registered' using errcode='23505'; end if;
  update public.staff_invites set status='cancelled' where lower(email)=v_email and status='pending';
  insert into public.staff_invites(email, role, invited_by) values (v_email, p_role, auth.uid()) returning id into v_id;
  return v_id;
end $$;
