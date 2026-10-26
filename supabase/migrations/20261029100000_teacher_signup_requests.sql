-- طلبات الانضمام كمعلم: التسجيل الذاتي ينشئ حساباً بدور parent فقط.
-- بيانات الطلب (المادة/المرحلة/الجوال) تُحفظ في user_metadata كـ"تلميح" للمشرف؛
-- لا تمنح أي صلاحية. الدور يُغيَّره المشرف فقط عبر admin_set_user_role.

drop function if exists public.admin_list_users();

create or replace function public.admin_list_users()
returns table (id uuid, email text, full_name text, role text, created_at timestamptz, last_sign_in_at timestamptz, teacher_request jsonb)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
    select p.id, u.email::text, p.full_name, p.role, p.created_at, u.last_sign_in_at,
           case when jsonb_typeof(u.raw_user_meta_data->'teacher_request') = 'object'
                then u.raw_user_meta_data->'teacher_request' end
    from public.profiles p
    join auth.users u on u.id = p.id
    order by p.created_at desc;
end;
$$;

revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;
