-- ربط إجابات الأسئلة بمعرّف الطفل (uuid) بدل الاسم النصي؛ الأعمدة القديمة تبقى للتوافق.
alter table public.lesson_question_attempts
  add column if not exists child_id uuid references public.children(id) on delete set null;
create index if not exists lesson_question_attempts_child_idx on public.lesson_question_attempts(child_id);
