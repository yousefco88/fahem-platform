-- إخفاء الإجابة الصحيحة لأسئلة البنك عن الزائر (anon)
-- الزائر يقرأ الأعمدة الآمنة فقط، والتصحيح عبر دالة تُرجع صح/خطأ دون كشف الإجابة.
revoke select on public.lesson_questions from anon;
grant select (id, lesson_id, quiz_type, question, choices, skill, difficulty, celebration, sort_order, is_published)
  on public.lesson_questions to anon;

create or replace function public.check_lesson_question_answer(p_question_id uuid, p_selected jsonb)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_answer jsonb;
begin
  select q.answer into v_answer
  from public.lesson_questions q
  join public.curriculum_lessons l on l.id = q.lesson_id
  where q.id = p_question_id
    and q.is_published
    and l.published
    and l.review_status = 'approved';
  if not found then
    raise exception 'question not available' using errcode = 'P0002';
  end if;
  if p_selected is null then
    raise exception 'invalid answer' using errcode = '22023';
  end if;
  return v_answer = p_selected;
end;
$$;

revoke all on function public.check_lesson_question_answer(uuid, jsonb) from public;
grant execute on function public.check_lesson_question_answer(uuid, jsonb) to anon, authenticated;
