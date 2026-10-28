-- حالة الإيقاف المؤقت للمستخدمين (للقراءة من لوحة الإدارة فقط).
create or replace function public.admin_user_status()
returns table (id uuid, banned_until timestamptz)
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  return query select u.id, u.banned_until from auth.users u where u.banned_until is not null and u.banned_until > now();
end; $$;
revoke all on function public.admin_user_status() from public, anon;
grant execute on function public.admin_user_status() to authenticated;
