-- إصلاح: سياسة قراءة المواد كانت تستعلم teacher_subjects مباشرة فتفشل للزائر (anon) بـ permission denied.
-- الدالة security definer وتُرجع false عند عدم وجود مستخدم.
drop policy if exists "subjects readable" on public.curriculum_subjects;
create policy "subjects readable" on public.curriculum_subjects
  for select using (published = true or public.is_content_editor() or public.teacher_has_subject(key));
grant execute on function public.teacher_has_subject(text) to anon;
