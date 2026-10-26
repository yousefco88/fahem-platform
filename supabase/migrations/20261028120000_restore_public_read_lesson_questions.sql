-- استعادة قراءة أسئلة الدروس المنشورة للزائر (كانت عامة قبل 20261028090000 وقصرتُها خطأً على المسجّلين).
grant select on public.lesson_questions to anon;
drop policy if exists "lesson questions readable" on public.lesson_questions;
create policy "lesson questions readable" on public.lesson_questions
  for select using (
    public.is_content_editor()
    or exists (select 1 from public.curriculum_lessons l where l.id = lesson_questions.lesson_id and l.created_by = auth.uid())
    or (is_published and exists (select 1 from public.curriculum_lessons l
        where l.id = lesson_questions.lesson_id and l.published and l.review_status = 'approved'))
  );
