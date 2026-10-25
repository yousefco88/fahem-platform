-- تسجيلات الحصص المباشرة: تتبع الدرس (curriculum_lessons)، تُنشر للطلاب بعد مراجعة الإدارة.
-- سياسة الخصوصية: التسجيل لا يظهر وجوه/أصوات الأطفال؛ يؤكد المعلم ذلك عند الرفع (ضبط إجرائي لا تقني).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lesson-recordings', 'lesson-recordings', false, 1073741824, array['video/mp4','video/webm'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.lesson_recordings (
  id uuid primary key default gen_random_uuid(),
  lesson_id text not null references public.curriculum_lessons(id) on delete cascade,
  slot_id text references public.schedule_slots(id) on delete set null,
  storage_path text not null unique,
  duration_sec integer check (duration_sec is null or duration_sec > 0),
  status text not null default 'review' check (status in ('review','accepted','rejected')),
  no_children_confirmed boolean not null check (no_children_confirmed),
  uploaded_by uuid not null default auth.uid(),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists lesson_recordings_lesson_idx on public.lesson_recordings (lesson_id, status);
alter table public.lesson_recordings enable row level security;

-- قراءة: المقبول للدروس المنشورة للمسجّلين، والرافع يرى تسجيلاته، والإدارة الكل.
create policy "read accepted recordings of published lessons" on public.lesson_recordings
  for select to authenticated
  using (
    (status = 'accepted' and exists (select 1 from public.curriculum_lessons l where l.id = lesson_id and l.published))
    or uploaded_by = auth.uid()
    or public.is_admin()
  );
-- كتابة مباشرة: الإدارة فقط. المعلم يسجّل عبر الدالة.
create policy "admin manages recordings" on public.lesson_recordings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- تسجيل ملف مرفوع (المعلم صاحب الحصة أو الإدارة). يدخل بحالة review دائماً للمعلم.
create or replace function public.register_lesson_recording(p_lesson_id text, p_slot_id text, p_path text, p_duration integer, p_confirmed boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_admin boolean := public.is_admin();
begin
  if auth.uid() is null then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_confirmed is not true then raise exception 'confirmation required' using errcode = '22023'; end if;
  if p_path is null or split_part(p_path, '/', 1) <> auth.uid()::text then raise exception 'invalid path' using errcode = '22023'; end if;
  if not exists (select 1 from public.curriculum_lessons where id = p_lesson_id) then raise exception 'unknown lesson' using errcode = '22023'; end if;
  if not v_admin then
    if p_slot_id is null or not exists (select 1 from public.schedule_slots s where s.id = p_slot_id and s.teacher_id = auth.uid() and s.slot_type = 'live') then
      raise exception 'not allowed' using errcode = '42501';
    end if;
  end if;
  insert into public.lesson_recordings (lesson_id, slot_id, storage_path, duration_sec, status, no_children_confirmed, uploaded_by)
  values (p_lesson_id, p_slot_id, p_path, p_duration, case when v_admin then 'accepted' else 'review' end, true, auth.uid())
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.register_lesson_recording(text,text,text,integer,boolean) from public, anon;
grant execute on function public.register_lesson_recording(text,text,text,integer,boolean) to authenticated;

-- مراجعة الإدارة
create or replace function public.review_lesson_recording(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_status not in ('accepted','rejected') then raise exception 'invalid status' using errcode = '22023'; end if;
  update public.lesson_recordings set status = p_status, reviewed_by = auth.uid(), reviewed_at = now() where id = p_id;
end $$;
revoke all on function public.review_lesson_recording(uuid,text) from public, anon;
grant execute on function public.review_lesson_recording(uuid,text) to authenticated;

-- التخزين: الرفع للمعلمين في مجلدهم فقط؛ القراءة للمقبول المنشور أو الرافع أو الإدارة.
create policy "staff upload own recordings" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'lesson-recordings' and public.is_staff() and (storage.foldername(name))[1] = auth.uid()::text);
create policy "read accepted recordings" on storage.objects
  for select to authenticated
  using (bucket_id = 'lesson-recordings' and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.lesson_recordings r join public.curriculum_lessons l on l.id = r.lesson_id
               where r.storage_path = name and r.status = 'accepted' and l.published)
  ));
create policy "admin deletes recordings" on storage.objects
  for delete to authenticated using (bucket_id = 'lesson-recordings' and public.is_admin());
