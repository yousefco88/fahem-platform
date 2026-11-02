-- أثر حذف حساب مستخدم: يعدّ الصفوف المرتبطة به في كل جدول public، مباشرةً أو عبر سلسلة حذف متتالي
-- (مثل: الحساب ← parent_profiles ← children ← learning_records). يُستخدم من لوحة الإدارة (معاينة قبل الحذف)
-- ومن Edge Function admin-manage-user (يفرض المنع على الخادم). قراءة فقط؛ للمدير فقط.
-- يُكتشف المخطط ديناميكياً فلا يحتاج تعديلاً عند إضافة جداول جديدة.
-- on_delete لكل صف = سلوك المفتاح الذي يربط ذلك الجدول بأبيه في السلسلة؛ أي صف تحت مستوى أول يُعامَل بحذر في الواجهة.

drop function if exists public.admin_user_delete_impact(uuid);

create function public.admin_user_delete_impact(p_user uuid)
returns table (table_name text, column_name text, on_delete text, row_count bigint)
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  -- طابور: (جدول، شرط يحدد الصفوف التي ستُحذف منه، العمق)
  q_tbl regclass[] := array['auth.users'::regclass, 'public.profiles'::regclass];
  q_pred text[] := array[format('id = %L::uuid', p_user), format('id = %L::uuid', p_user)];
  q_depth int[] := array[0, 0];
  i int := 1;
  r record;
  n bigint;
  pred text;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_user is null then
    raise exception 'user required' using errcode = '22004';
  end if;

  while i <= array_length(q_tbl, 1) loop
    for r in
      select c.conrelid::regclass as tbl,
             cl.relname::text as tname,
             a.attname::text as col,
             fa.attname::text as refcol,
             c.confdeltype as del
      from pg_constraint c
      join pg_class cl on cl.oid = c.conrelid
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
      join pg_attribute fa on fa.attrelid = c.confrelid and fa.attnum = c.confkey[1]
      where c.contype = 'f'
        and array_length(c.conkey, 1) = 1
        and c.confrelid = q_tbl[i]
        and cl.relnamespace = 'public'::regnamespace
        -- profiles جذر بذاته؛ لا نعيد عدّه كابن لـ auth.users
        and not (q_depth[i] = 0 and q_tbl[i] = 'auth.users'::regclass and c.conrelid = 'public.profiles'::regclass)
      order by cl.relname, a.attname
    loop
      pred := format('%I in (select %I from %s where %s)', r.col, r.refcol, q_tbl[i], q_pred[i]);
      execute format('select count(*) from %s where %s', r.tbl, pred) into n;
      if n > 0 then
        table_name := r.tname;
        column_name := case when q_depth[i] = 0 then r.col else r.col || ' ← ' || (q_tbl[i])::text end;
        on_delete := case r.del
          when 'c' then 'cascade'
          when 'n' then 'set_null'
          when 'd' then 'set_default'
          when 'r' then 'restrict'
          else 'no_action'
        end;
        -- الصفوف المحذوفة تبعاً تحت المستوى الأول تُوسم «cascade_nested» لتمنع الحذف دائماً
        if q_depth[i] > 0 and r.del = 'c' then on_delete := 'cascade_nested'; end if;
        row_count := n;
        return next;
        -- نتتبع ما سيُحذف فعلاً فقط، بحد أقصى 5 مستويات
        if r.del = 'c' and q_depth[i] < 5 then
          q_tbl := q_tbl || r.tbl;
          q_pred := q_pred || pred;
          q_depth := q_depth || (q_depth[i] + 1);
        end if;
      end if;
    end loop;
    i := i + 1;
  end loop;
end;
$$;

revoke all on function public.admin_user_delete_impact(uuid) from public, anon;
grant execute on function public.admin_user_delete_impact(uuid) to authenticated;

comment on function public.admin_user_delete_impact(uuid) is
  'Admin only: rows that deleting a user would touch, following ON DELETE CASCADE chains (table, column, on_delete, count). Used to block destructive account deletion.';
