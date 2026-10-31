-- Security hardening for lesson-question answers and server-bound assessments.
-- Local migration only: do not apply to a hosted database without separate authorization.

-- Revoke the earlier table-level SELECT grant from authenticated and expose only
-- answer-free columns. Staff answer access moves to narrowly scoped RPCs below.
revoke select, insert, update, delete on public.lesson_questions from anon, authenticated;
grant select (id, lesson_id, quiz_type, question, choices, skill, difficulty, celebration, sort_order, is_published)
  on public.lesson_questions to anon, authenticated;

create or replace function public.editor_list_lesson_questions(p_lesson_id text)
returns setof public.lesson_questions
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if not (
    public.is_content_editor()
    or exists (
      select 1 from public.curriculum_lessons l
      where l.id = p_lesson_id and l.created_by = auth.uid()
        and public.is_teacher() and l.review_status in ('draft', 'rejected')
    )
  ) then raise exception 'forbidden' using errcode = '42501'; end if;

  return query
    select q.* from public.lesson_questions q
    where q.lesson_id = p_lesson_id
    order by q.sort_order, q.id;
end;
$$;

create or replace function public.editor_save_lesson_question(
  p_question_id uuid,
  p_lesson_id text,
  p_payload jsonb,
  p_sort_order integer default 0
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_type text;
  v_question text;
  v_choices jsonb;
  v_answer jsonb;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if not (
    public.is_content_editor()
    or exists (
      select 1 from public.curriculum_lessons l
      where l.id = p_lesson_id and l.created_by = auth.uid()
        and public.is_teacher() and l.review_status in ('draft', 'rejected')
    )
  ) then raise exception 'forbidden' using errcode = '42501'; end if;
  if jsonb_typeof(p_payload) <> 'object' then raise exception 'invalid question' using errcode = '22023'; end if;

  v_type := p_payload->>'quiz_type';
  v_question := nullif(btrim(p_payload->>'question'), '');
  v_choices := coalesce(p_payload->'choices', '[]'::jsonb);
  v_answer := p_payload->'answer';
  if v_type not in ('choice', 'truefalse', 'arrange') or v_question is null
     or jsonb_typeof(v_choices) <> 'array' or v_answer is null then
    raise exception 'invalid question' using errcode = '22023';
  end if;

  if v_type = 'choice' then
    if jsonb_typeof(v_answer) <> 'number' then
      raise exception 'invalid choice question' using errcode = '22023';
    end if;
    if (v_answer #>> '{}')::numeric <> trunc((v_answer #>> '{}')::numeric)
       or (v_answer #>> '{}')::numeric < 0
       or (v_answer #>> '{}')::numeric >= jsonb_array_length(v_choices)
       or jsonb_array_length(v_choices) < 2
       or exists (
         select 1 from jsonb_array_elements(v_choices) as item(value)
         where jsonb_typeof(item.value) <> 'string' or btrim(item.value #>> '{}') = ''
       ) then
      raise exception 'invalid choice question' using errcode = '22023';
    end if;
  end if;

  if v_type = 'truefalse' then
    if jsonb_typeof(v_answer) <> 'boolean' or jsonb_array_length(v_choices) <> 0 then
      raise exception 'invalid truefalse question' using errcode = '22023';
    end if;
  end if;

  if v_type = 'arrange' then
    if jsonb_typeof(v_answer) <> 'array' then
      raise exception 'invalid arrange question' using errcode = '22023';
    end if;
    if jsonb_array_length(v_choices) < 2
       or jsonb_array_length(v_answer) <> jsonb_array_length(v_choices)
       or exists (
         select 1 from jsonb_array_elements(v_choices) as item(value)
         where jsonb_typeof(item.value) <> 'string' or btrim(item.value #>> '{}') = ''
       )
       or exists (
         select 1 from jsonb_array_elements(v_answer) as item(value)
         where jsonb_typeof(item.value) <> 'string' or btrim(item.value #>> '{}') = ''
       ) then
      raise exception 'invalid arrange question' using errcode = '22023';
    end if;
  end if;

  if p_question_id is null then
    insert into public.lesson_questions (
      lesson_id, quiz_type, question, choices, answer, skill, difficulty,
      celebration, sort_order, is_published, created_by
    ) values (
      p_lesson_id, v_type, v_question, v_choices, v_answer,
      nullif(btrim(p_payload->>'skill'), ''),
      coalesce(nullif(p_payload->>'difficulty', ''), 'normal'),
      nullif(btrim(p_payload->>'celebration'), ''), greatest(coalesce(p_sort_order, 0), 0),
      coalesce((p_payload->>'is_published')::boolean, true), auth.uid()
    ) returning id into v_id;
  else
    update public.lesson_questions q set
      quiz_type = v_type,
      question = v_question,
      choices = v_choices,
      answer = v_answer,
      skill = nullif(btrim(p_payload->>'skill'), ''),
      difficulty = coalesce(nullif(p_payload->>'difficulty', ''), 'normal'),
      celebration = nullif(btrim(p_payload->>'celebration'), ''),
      sort_order = greatest(coalesce(p_sort_order, q.sort_order), 0),
      is_published = coalesce((p_payload->>'is_published')::boolean, q.is_published)
    where q.id = p_question_id and q.lesson_id = p_lesson_id
    returning q.id into v_id;
    if v_id is null then raise exception 'question not found' using errcode = 'P0002'; end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.editor_delete_lesson_question(p_question_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_lesson_id text;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  select q.lesson_id into v_lesson_id from public.lesson_questions q where q.id = p_question_id;
  if v_lesson_id is null then raise exception 'question not found' using errcode = 'P0002'; end if;
  if not (
    public.is_content_editor()
    or exists (
      select 1 from public.curriculum_lessons l
      where l.id = v_lesson_id and l.created_by = auth.uid()
        and public.is_teacher() and l.review_status in ('draft', 'rejected')
    )
  ) then raise exception 'forbidden' using errcode = '42501'; end if;
  -- Historical attempts reference this question with ON DELETE CASCADE.
  -- Hide answered questions instead of erasing a child's learning history.
  if exists (select 1 from public.lesson_question_attempts where question_id = p_question_id) then
    update public.lesson_questions set is_published = false where id = p_question_id;
  else
    delete from public.lesson_questions where id = p_question_id;
  end if;
end;
$$;

revoke all on function public.editor_list_lesson_questions(text) from public, anon;
revoke all on function public.editor_save_lesson_question(uuid, text, jsonb, integer) from public, anon;
revoke all on function public.editor_delete_lesson_question(uuid) from public, anon;
grant execute on function public.editor_list_lesson_questions(text) to authenticated;
grant execute on function public.editor_save_lesson_question(uuid, text, jsonb, integer) to authenticated;
grant execute on function public.editor_delete_lesson_question(uuid) to authenticated;

-- A submission must reference the exact server-selected question set and can be
-- consumed once before expiry. The client never supplies the authoritative set.
create table if not exists public.assessment_sessions (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  subject_key text not null,
  question_ids uuid[] not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  submitted_at timestamptz
);
alter table public.assessment_sessions enable row level security;
revoke all on public.assessment_sessions from public, anon, authenticated;

alter table public.exam_attempts
  add column if not exists assessment_session_id uuid unique references public.assessment_sessions(id);

-- Results are inserted only by the SECURITY DEFINER grading RPC, never by clients.
revoke insert on public.exam_attempts from anon, authenticated;
drop policy if exists "parents insert own exam attempts" on public.exam_attempts;

create or replace function public.start_assessment(p_child uuid, p_subject text, p_count int default 10)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rows jsonb;
  v_ids uuid[];
  v_n integer;
  v_session uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if not exists (select 1 from public.children c where c.id = p_child and c.parent_id = auth.uid()) then
    raise exception 'child not found' using errcode = '42501';
  end if;

  select
    coalesce(jsonb_agg(jsonb_build_object(
      'id', t.id, 'lesson_id', t.lesson_id, 'quiz_type', t.quiz_type,
      'question', t.question, 'choices', t.choices, 'skill', t.skill
    )), '[]'::jsonb),
    coalesce(array_agg(t.id), '{}'::uuid[]),
    count(*)
  into v_rows, v_ids, v_n
  from (
    select q.id, q.lesson_id, q.quiz_type, q.question, q.choices, q.skill
    from public.lesson_questions q
    join public.curriculum_lessons l on l.id = q.lesson_id
    where q.is_published and l.published and l.review_status = 'approved'
      and not coalesce(l.archived, false) and l.subject_key = p_subject
      and q.quiz_type in ('choice', 'truefalse')
    order by random() limit greatest(1, least(coalesce(p_count, 10), 20))
  ) t;
  if v_n < 5 then raise exception 'not_enough_questions' using errcode = 'P0002'; end if;

  insert into public.assessment_sessions (parent_id, child_id, subject_key, question_ids, expires_at)
  values (auth.uid(), p_child, p_subject, v_ids, now() + interval '30 minutes')
  returning id into v_session;

  return jsonb_build_object('assessment_id', v_session, 'questions', v_rows);
end;
$$;

-- Disable the legacy client-submitted scoring RPC. Its distinct signature remains
-- in the catalog after creating the session-bound overload, so revoke it explicitly.
revoke all on function public.submit_assessment(uuid, text, jsonb) from public, anon, authenticated;

create or replace function public.submit_assessment(
  p_child uuid,
  p_subject text,
  p_assessment_id uuid,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session public.assessment_sessions%rowtype;
  v_total integer := 0;
  v_correct integer := 0;
  v_pct numeric;
  v_band text;
  v_name text;
  v_qid uuid;
  v_question public.lesson_questions%rowtype;
  v_selected jsonb;
  v_ok boolean;
  v_detail jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  select * into v_session from public.assessment_sessions s
  where s.id = p_assessment_id and s.parent_id = auth.uid()
    and s.child_id = p_child and s.subject_key = p_subject
  for update;
  if not found then raise exception 'assessment not found' using errcode = '42501'; end if;
  if v_session.submitted_at is not null then raise exception 'assessment already submitted' using errcode = '22023'; end if;
  if v_session.expires_at <= now() then raise exception 'assessment expired' using errcode = '22023'; end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object'
     or (select count(*) from jsonb_object_keys(p_answers)) <> cardinality(v_session.question_ids) then
    raise exception 'invalid answers' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_object_keys(p_answers) as submitted(question_id)
    where not (submitted.question_id = any (
      array(select unnest(v_session.question_ids)::text)
    ))
  ) then raise exception 'invalid question set' using errcode = '22023'; end if;

  select c.name into v_name from public.children c
  where c.id = p_child and c.parent_id = auth.uid();
  if not found then raise exception 'child not found' using errcode = '42501'; end if;

  foreach v_qid in array v_session.question_ids loop
    select q.* into v_question from public.lesson_questions q
    join public.curriculum_lessons l on l.id = q.lesson_id
    where q.id = v_qid and q.is_published and l.published
      and l.review_status = 'approved' and l.subject_key = p_subject
      and not coalesce(l.archived, false);
    if not found then raise exception 'assessment question unavailable' using errcode = '22023'; end if;
    v_selected := p_answers->v_qid::text;
    v_ok := v_question.answer = v_selected;
    v_total := v_total + 1;
    if v_ok then v_correct := v_correct + 1; end if;
    v_detail := v_detail || jsonb_build_array(jsonb_build_object(
      'question_id', v_qid, 'correct', v_ok, 'skill', v_question.skill
    ));
  end loop;

  v_pct := round(v_correct::numeric * 100 / v_total, 1);
  v_band := case when v_pct < 50 then 'needs_support' when v_pct < 80 then 'developing' else 'strong' end;
  update public.assessment_sessions set submitted_at = now() where id = v_session.id;
  insert into public.exam_attempts (
    parent_id, child_id, child_name, subject_key, total_questions,
    attempted_count, correct_count, percentage, band, answers, assessment_session_id
  ) values (
    auth.uid(), p_child, v_name, p_subject, v_total,
    v_total, v_correct, v_pct, v_band, v_detail, v_session.id
  );
  return jsonb_build_object('total', v_total, 'correct', v_correct, 'percentage', v_pct, 'band', v_band);
end;
$$;

revoke all on function public.start_assessment(uuid, text, integer) from public, anon;
revoke all on function public.submit_assessment(uuid, text, uuid, jsonb) from public, anon;
grant execute on function public.start_assessment(uuid, text, integer) to authenticated;
grant execute on function public.submit_assessment(uuid, text, uuid, jsonb) to authenticated;
