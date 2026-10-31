-- Close the answer-checking oracle and make lesson attempts authoritative on the server.
-- Local migration only; do not apply to a hosted database without separate authorization.

revoke all on function public.check_lesson_question_answer(uuid, jsonb)
  from public, anon, authenticated;
revoke insert on public.lesson_question_attempts from anon, authenticated;
drop policy if exists "parents insert own question attempts" on public.lesson_question_attempts;

create or replace function public.submit_lesson_question_answer(
  p_question_id uuid,
  p_child_id uuid,
  p_selected jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_question public.lesson_questions%rowtype;
  v_child_name text;
  v_correct boolean;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_question_id is null or p_child_id is null or p_selected is null then
    raise exception 'invalid answer' using errcode = '22023';
  end if;

  select c.name into v_child_name
  from public.children c
  where c.id = p_child_id and c.parent_id = auth.uid();
  if not found then
    raise exception 'child not found' using errcode = '42501';
  end if;

  -- Serialize same-child/same-question submissions so concurrent requests cannot
  -- bypass the one-attempt rule and turn this boolean response into an oracle.
  perform pg_advisory_xact_lock(hashtextextended(
    auth.uid()::text || ':' || p_child_id::text || ':' || p_question_id::text, 0
  ));

  if exists (
    select 1 from public.lesson_question_attempts a
    where a.parent_id = auth.uid()
      and a.child_id = p_child_id
      and a.question_id = p_question_id
  ) then
    raise exception 'already_answered' using errcode = '22023';
  end if;

  select q.* into v_question
  from public.lesson_questions q
  join public.curriculum_lessons l on l.id = q.lesson_id
  where q.id = p_question_id
    and q.is_published
    and l.published
    and l.review_status = 'approved'
    and not coalesce(l.archived, false);
  if not found then
    raise exception 'question not available' using errcode = 'P0002';
  end if;

  v_correct := v_question.answer = p_selected;
  insert into public.lesson_question_attempts (
    question_id, lesson_id, parent_id, child_id, child_name,
    is_correct, skill, quiz_type
  ) values (
    p_question_id, v_question.lesson_id, auth.uid(), p_child_id, v_child_name,
    v_correct, v_question.skill, v_question.quiz_type
  );

  return v_correct;
end;
$$;

revoke all on function public.submit_lesson_question_answer(uuid, uuid, jsonb)
  from public, anon;
grant execute on function public.submit_lesson_question_answer(uuid, uuid, jsonb)
  to authenticated;
