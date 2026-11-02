-- أثر حذف حساب مستخدم: يعدّ الصفوف المرتبطة به في كل جدول public له مفتاح أجنبي إلى auth.users أو public.profiles.
-- يُستخدم من لوحة الإدارة (معاينة قبل الحذف) ومن Edge Function admin-manage-user (يفرض المنع على الخادم).
-- قراءة فقط؛ للمدير فقط. يُكتشف المخطط ديناميكياً فلا يحتاج تعديلاً عند إضافة جداول جديدة.

create or replace function public.admin_user_delete_impact(p_user uuid)
returns table (table_name text, column_name text, on_delete text, row_count bigint)
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  r record;
  n bigint;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_user is null then
    raise exception 'user required' using errcode = '22004';
  end if;

  for r in
    select c.conrelid::regclass as tbl,
           cl.relname::text as tname,
           a.attname::text as col,
           c.confdeltype as del
    from pg_constraint c
    join pg_class cl on cl.oid = c.conrelid
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f'
      and array_length(c.conkey, 1) = 1
      and c.confrelid in ('auth.users'::regclass, 'public.profiles'::regclass)
      and cl.relnamespace = 'public'::regnamespace
    order by cl.relname, a.attname
  loop
    execute format('select count(*) from %s where %I = $1', r.tbl, r.col) into n using p_user;
    if n > 0 then
      table_name := r.tname;
      column_name := r.col;
      on_delete := case r.del
        when 'c' then 'cascade'
        when 'n' then 'set_null'
        when 'd' then 'set_default'
        when 'r' then 'restrict'
        else 'no_action'
      end;
      row_count := n;
      return next;
    end if;
  end loop;
end;
$$;

revoke all on function public.admin_user_delete_impact(uuid) from public, anon;
grant execute on function public.admin_user_delete_impact(uuid) to authenticated;

comment on function public.admin_user_delete_impact(uuid) is
  'Admin only: rows referencing a user per FK (table, column, on_delete, count). Used to block destructive account deletion.';
