-- صلاحيات المعلم للمناهج: مسودة ← مراجعة ← نشر. المعلم لا ينشر ولا يحذف.
-- يضيّق الكتابة من is_staff() (admin+teacher+content_editor) إلى:
--   * المدير/محرر المحتوى: كتابة كاملة واعتماد.
--   * المعلم: يُنشئ ويعدّل دروسه فقط (مسودة/مرفوض) ضمن المواد المسندة له، ويرسلها للمراجعة.
-- ويصلح غياب GRANT على lesson_questions و lesson_question_attempts.

-- ===== 1) أعمدة الدروس =====
alter table public.curriculum_lessons
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists review_status text not null default 'approved'
    check (review_status in ('draft','submitted','approved','rejected')),
  add column if not exists review_note text,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists archived boolean not null default false;

create index if not exists curriculum_lessons_review_idx on public.curriculum_lessons (review_status) where review_status <> 'approved';
create index if not exists curriculum_lessons_created_by_idx on public.curriculum_lessons (created_by);

-- ===== 2) إسناد المواد للمعلم =====
create table if not exists public.teacher_subjects (
  teacher_id uuid not null references auth.users(id) on delete cascade,
  subject_key text not null references public.curriculum_subjects(key) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (teacher_id, subject_key)
);
alter table public.teacher_subjects enable row level security;

-- ===== 3) دوال مساعدة =====
create or replace function public.is_teacher()
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
$$;

create or replace function public.teacher_has_subject(p_key text)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.teacher_subjects where teacher_id = auth.uid() and subject_key = p_key)
$$;

revoke all on function public.is_teacher(), public.teacher_has_subject(text) from public, anon;
grant execute on function public.is_teacher(), public.teacher_has_subject(text) to authenticated;

create policy "admin manages teacher subjects" on public.teacher_subjects
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "teacher reads own subjects" on public.teacher_subjects
  for select to authenticated using (teacher_id = auth.uid());
grant select, insert, update, delete on public.teacher_subjects to authenticated;

-- ===== 4) المواد: الكتابة للمدير/المحرر فقط =====
drop policy if exists "staff manages subjects" on public.curriculum_subjects;
drop policy if exists "published subjects are readable" on public.curriculum_subjects;
create policy "managers manage subjects" on public.curriculum_subjects
  for all to authenticated using (public.is_content_editor()) with check (public.is_content_editor());
create policy "subjects readable" on public.curriculum_subjects
  for select using (
    published = true or public.is_content_editor()
    or exists (select 1 from public.teacher_subjects t where t.teacher_id = auth.uid() and t.subject_key = curriculum_subjects.key)
  );

-- ===== 5) الدروس =====
drop policy if exists "staff manages lessons" on public.curriculum_lessons;
drop policy if exists "published lessons are readable" on public.curriculum_lessons;

create policy "lessons readable" on public.curriculum_lessons
  for select using (
    (review_status = 'approved' and (
        published = true
        or exists (select 1 from public.curriculum_subjects s where s.key = curriculum_lessons.subject_key and s.published = true)))
    or public.is_content_editor()
    or created_by = auth.uid()
  );
create policy "managers manage lessons" on public.curriculum_lessons
  for all to authenticated using (public.is_content_editor()) with check (public.is_content_editor());
create policy "teacher inserts own draft lessons" on public.curriculum_lessons
  for insert to authenticated with check (
    public.is_teacher() and created_by = auth.uid() and published = false
    and review_status = 'draft' and public.teacher_has_subject(subject_key)
  );
create policy "teacher edits own unlocked lessons" on public.curriculum_lessons
  for update to authenticated
  using (public.is_teacher() and created_by = auth.uid() and review_status in ('draft','rejected'))
  with check (
    public.is_teacher() and created_by = auth.uid() and published = false
    and review_status in ('draft','submitted','rejected') and public.teacher_has_subject(subject_key)
  );

-- حارس: يمنع المعلم من تغيير الحقول المحمية حتى لو أرسلها العميل.
create or replace function public.guard_teacher_lesson_write()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if auth.uid() is null or public.is_content_editor() then return new; end if;
  if tg_op = 'INSERT' then
    new.created_by := auth.uid(); new.review_status := 'draft'; new.published := false;
    new.review_note := null; new.reviewed_by := null; new.reviewed_at := null;
    return new;
  end if;
  new.published := old.published;
  new.created_by := old.created_by;
  new.review_note := old.review_note;
  new.reviewed_by := old.reviewed_by;
  new.reviewed_at := old.reviewed_at;
  if new.review_status is distinct from old.review_status
     and not (old.review_status in ('draft','rejected') and new.review_status in ('draft','submitted')) then
    raise exception 'غير مسموح بتغيير حالة المراجعة' using errcode = '42501';
  end if;
  if new.review_status = 'submitted' and old.review_status <> 'submitted' then
    new.review_note := null;
  end if;
  return new;
end $$;

drop trigger if exists guard_teacher_lesson_write on public.curriculum_lessons;
create trigger guard_teacher_lesson_write before insert or update on public.curriculum_lessons
  for each row execute function public.guard_teacher_lesson_write();

-- اعتماد/رفض درس مُرسل (المدير/محرر المحتوى فقط). الاعتماد ينشر الدرس.
create or replace function public.review_lesson(p_id text, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_status text;
begin
  if not public.is_content_editor() then raise exception 'not authorized' using errcode = '42501'; end if;
  select review_status into v_status from public.curriculum_lessons where id = p_id for update;
  if not found then raise exception 'lesson not found' using errcode = 'P0002'; end if;
  if v_status <> 'submitted' then raise exception 'الدرس ليس بانتظار المراجعة' using errcode = '22023'; end if;
  if p_approve then
    update public.curriculum_lessons
      set review_status = 'approved', published = true, review_note = nullif(trim(p_note), ''),
          reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
      where id = p_id;
  else
    if p_note is null or length(trim(p_note)) = 0 then raise exception 'سبب الرفض مطلوب' using errcode = '22023'; end if;
    update public.curriculum_lessons
      set review_status = 'rejected', published = false, review_note = trim(p_note),
          reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
      where id = p_id;
  end if;
end $$;
revoke all on function public.review_lesson(text, boolean, text) from public, anon;
grant execute on function public.review_lesson(text, boolean, text) to authenticated;

-- ===== 6) أسئلة الدروس (+ إصلاح GRANT) =====
grant select, insert, update, delete on public.lesson_questions to authenticated;
grant select, insert on public.lesson_question_attempts to authenticated;

drop policy if exists "staff manages lesson questions" on public.lesson_questions;
drop policy if exists "published lesson questions are readable" on public.lesson_questions;
create policy "lesson questions readable" on public.lesson_questions
  for select to authenticated using (
    public.is_content_editor()
    or exists (select 1 from public.curriculum_lessons l where l.id = lesson_questions.lesson_id and l.created_by = auth.uid())
    or (is_published and exists (select 1 from public.curriculum_lessons l
        where l.id = lesson_questions.lesson_id and l.published and l.review_status = 'approved'))
  );
create policy "managers manage lesson questions" on public.lesson_questions
  for all to authenticated using (public.is_content_editor()) with check (public.is_content_editor());
create policy "teacher manages own lesson questions" on public.lesson_questions
  for all to authenticated
  using (public.is_teacher() and exists (select 1 from public.curriculum_lessons l
    where l.id = lesson_questions.lesson_id and l.created_by = auth.uid() and l.review_status in ('draft','rejected')))
  with check (public.is_teacher() and exists (select 1 from public.curriculum_lessons l
    where l.id = lesson_questions.lesson_id and l.created_by = auth.uid() and l.review_status in ('draft','rejected')));

-- ===== 7) ملفات الدروس =====
drop policy if exists "staff manages lesson assets" on public.lesson_assets;
drop policy if exists "lesson assets follow lesson visibility" on public.lesson_assets;
create policy "lesson assets readable" on public.lesson_assets
  for select using (exists (select 1 from public.curriculum_lessons l where l.id = lesson_assets.lesson_id
    and ((l.published and l.review_status = 'approved') or public.is_content_editor() or l.created_by = auth.uid())));
create policy "managers manage lesson assets" on public.lesson_assets
  for all to authenticated using (public.is_content_editor()) with check (public.is_content_editor());
create policy "teacher manages own lesson assets" on public.lesson_assets
  for all to authenticated
  using (public.is_teacher() and exists (select 1 from public.curriculum_lessons l
    where l.id = lesson_assets.lesson_id and l.created_by = auth.uid() and l.review_status in ('draft','rejected')))
  with check (public.is_teacher() and exists (select 1 from public.curriculum_lessons l
    where l.id = lesson_assets.lesson_id and l.created_by = auth.uid() and l.review_status in ('draft','rejected')));

drop policy if exists "staff manages media" on public.curriculum_media;
create policy "managers manage media" on public.curriculum_media
  for all to authenticated using (public.is_content_editor()) with check (public.is_content_editor());
create policy "teacher inserts own media" on public.curriculum_media
  for insert to authenticated with check (public.is_teacher() and uploaded_by = auth.uid());

-- ===== 8) Storage: المعلم يرفع في مجلد باسمه فقط، والحذف للإدارة =====
drop policy if exists "Staff can upload curriculum media" on storage.objects;
drop policy if exists "Staff can delete curriculum media" on storage.objects;
drop policy if exists "staff can upload lesson files" on storage.objects;

create policy "Staff can upload curriculum media" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'curriculum-media'
    and (public.is_content_editor() or (public.is_teacher() and (storage.foldername(name))[1] = auth.uid()::text)));
create policy "Managers can delete curriculum media" on storage.objects
  for delete to authenticated using (bucket_id = 'curriculum-media' and public.is_content_editor());
create policy "staff can upload lesson files" on storage.objects
  for insert to authenticated with check (
    bucket_id in ('lesson-files', 'lesson-videos')
    and (public.is_content_editor() or (public.is_teacher() and (storage.foldername(name))[1] = auth.uid()::text)));
