-- أدوات إدارة المستخدم: قراءة دور الهدف وتعديل الاسم، للمدير فقط (service_role لا يملك صلاحية على profiles).
create or replace function public.admin_user_role(p_user uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v text;
begin
  if not public.is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  select role into v from public.profiles where id = p_user;
  return v;
end; $$;

create or replace function public.admin_rename_user(p_user uuid, p_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  if p_name is null or length(trim(p_name)) = 0 or length(p_name) > 80 then raise exception 'invalid name' using errcode = '22023'; end if;
  if (select role from public.profiles where id = p_user) = 'admin' then raise exception 'admin accounts protected' using errcode = '42501'; end if;
  update public.profiles set full_name = trim(p_name), updated_at = now() where id = p_user;
end; $$;

revoke all on function public.admin_user_role(uuid) from public, anon;
revoke all on function public.admin_rename_user(uuid, text) from public, anon;
grant execute on function public.admin_user_role(uuid) to authenticated;
grant execute on function public.admin_rename_user(uuid, text) to authenticated;
