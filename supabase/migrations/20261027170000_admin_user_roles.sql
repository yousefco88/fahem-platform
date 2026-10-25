-- إدارة المستخدمين والأدوار من لوحة الإدارة.
-- profiles.role غير قابل للتعديل من العميل (GRANT على full_name فقط)، لذلك التغيير يمر عبر
-- دالة SECURITY DEFINER تتحقق من is_admin() داخلياً. لا تعتمد على أي جدول إضافي.

create or replace function public.admin_list_users()
returns table (id uuid, email text, full_name text, role text, created_at timestamptz, last_sign_in_at timestamptz)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
    select p.id, u.email::text, p.full_name, p.role, p.created_at, u.last_sign_in_at
    from public.profiles p
    join auth.users u on u.id = p.id
    order by p.created_at desc;
end;
$$;

create or replace function public.admin_set_user_role(p_user uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_current text;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_role is null or p_role not in ('parent', 'teacher', 'content_editor', 'admin') then
    raise exception 'invalid role' using errcode = '22023';
  end if;
  if p_user = auth.uid() then
    raise exception 'cannot change your own role' using errcode = '22023';
  end if;
  select role into v_current from public.profiles where id = p_user for update;
  if not found then
    raise exception 'user not found' using errcode = 'P0002';
  end if;
  if v_current = 'admin' and p_role <> 'admin'
     and (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception 'cannot remove the last admin' using errcode = '22023';
  end if;
  update public.profiles set role = p_role, updated_at = now() where id = p_user;
end;
$$;

revoke all on function public.admin_list_users() from public, anon;
revoke all on function public.admin_set_user_role(uuid, text) from public, anon;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;
