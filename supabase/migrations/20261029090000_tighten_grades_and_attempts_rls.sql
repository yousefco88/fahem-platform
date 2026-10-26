-- grades: كان أي معلم يملك ALL عبر is_staff؛ الآن للمدير/محرر المحتوى فقط.
drop policy if exists "staff manages grades" on public.grades;
drop policy if exists "published grades are readable" on public.grades;
create policy "managers manage grades" on public.grades for all to authenticated
  using (public.is_content_editor()) with check (public.is_content_editor());
create policy "grades readable" on public.grades for select
  using (published = true or public.is_content_editor());

-- محاولات الأسئلة: كان كل معلم يرى محاولات كل الأسر؛ الآن صاحبها، أو المدير/المحرر، أو منشئ الدرس.
drop policy if exists "own or staff read question attempts" on public.lesson_question_attempts;
create policy "own or owner-staff read question attempts" on public.lesson_question_attempts for select to authenticated
  using (
    parent_id = auth.uid()
    or public.is_content_editor()
    or exists (select 1 from public.curriculum_lessons l
               where l.id = lesson_question_attempts.lesson_id and l.created_by = auth.uid())
  );
