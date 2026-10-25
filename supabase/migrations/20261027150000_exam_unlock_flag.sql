-- فتح محاكي السفارة لكل طفل (exam_unlocked):
-- يُفتح تلقائياً في الواجهة بإكمال كل دروس أي مادة، أو يدوياً هنا من
-- الأدمن أو المعلم المسند إليه الطالب عبر RPC فقط (لا UPDATE مباشر —
-- RLS لا يقيد أعمدة، فنمنع عبث ولي الأمر بالعلم عبر دالة محكومة).

alter table public.children add column if not exists exam_unlocked boolean not null default false;
alter table public.children add column if not exists exam_unlocked_by uuid references auth.users(id);
alter table public.children add column if not exists exam_unlocked_at timestamptz;

create or replace function public.set_exam_unlocked(p_child_id uuid, p_unlocked boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (
    public.is_admin()
    or exists (
      select 1 from public.teacher_students ts
      where ts.child_id = p_child_id and ts.teacher_id = auth.uid()
    )
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.children
     set exam_unlocked    = coalesce(p_unlocked, false),
         exam_unlocked_by = case when p_unlocked then auth.uid() else null end,
         exam_unlocked_at = case when p_unlocked then now() else null end
   where id = p_child_id;
end;
$$;

revoke execute on function public.set_exam_unlocked(uuid, boolean) from public, anon;
grant execute on function public.set_exam_unlocked(uuid, boolean) to authenticated;
