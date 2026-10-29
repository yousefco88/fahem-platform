-- اختبار تقييم مستقل: أسئلته من بنك lesson_questions (يكتبها المعلم/المحرر/الإدارة)، التصحيح وحفظ النتيجة على الخادم.
alter table public.exam_attempts
  add column if not exists child_id uuid references public.children(id) on delete set null,
  add column if not exists subject_key text;
create index if not exists exam_attempts_child_idx on public.exam_attempts(child_id, created_at desc);

-- الحد الأدنى لعدد الأسئلة المتاحة حتى يُفعَّل الاختبار لمادة (حماية من اختبار بسؤال واحد)
create or replace function public.start_assessment(p_child uuid, p_subject text, p_count int default 10)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_rows jsonb; v_n int;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if not exists (select 1 from public.children c where c.id = p_child and c.parent_id = auth.uid()) then
    raise exception 'child not found' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb), count(*) into v_rows, v_n from (
    select q.id, q.lesson_id, q.quiz_type, q.question, q.choices, q.skill
    from public.lesson_questions q
    join public.curriculum_lessons l on l.id = q.lesson_id
    where q.is_published and l.published and l.review_status = 'approved' and not coalesce(l.archived, false)
      and l.subject_key = p_subject and q.quiz_type in ('choice', 'truefalse')
    order by random() limit greatest(1, least(coalesce(p_count, 10), 20))
  ) t;
  if v_n < 5 then raise exception 'not_enough_questions' using errcode = 'P0002'; end if;
  return v_rows;
end; $$;

create or replace function public.submit_assessment(p_child uuid, p_subject text, p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_total int := 0; v_correct int := 0; v_pct numeric; v_band text; v_name text; r record; v_detail jsonb := '[]'::jsonb; v_ok boolean;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  select c.name into v_name from public.children c where c.id = p_child and c.parent_id = auth.uid();
  if not found then raise exception 'child not found' using errcode = '42501'; end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then raise exception 'invalid answers' using errcode = '22023'; end if;
  for r in
    select q.id, q.answer, q.skill, a.value as selected
    from jsonb_each(p_answers) a
    join public.lesson_questions q on q.id::text = a.key
    join public.curriculum_lessons l on l.id = q.lesson_id
    where q.is_published and l.published and l.review_status = 'approved' and l.subject_key = p_subject
  loop
    v_total := v_total + 1; v_ok := (r.answer = r.selected);
    if v_ok then v_correct := v_correct + 1; end if;
    v_detail := v_detail || jsonb_build_object('question_id', r.id, 'correct', v_ok, 'skill', r.skill);
  end loop;
  if v_total < 5 then raise exception 'too_few_answers' using errcode = '22023'; end if;
  v_pct := round(v_correct::numeric * 100 / v_total, 1);
  v_band := case when v_pct < 50 then 'needs_support' when v_pct < 80 then 'developing' else 'strong' end;
  insert into public.exam_attempts (parent_id, child_id, child_name, subject_key, total_questions, attempted_count, correct_count, percentage, band, answers)
  values (auth.uid(), p_child, v_name, p_subject, v_total, v_total, v_correct, v_pct, v_band, v_detail);
  return jsonb_build_object('total', v_total, 'correct', v_correct, 'percentage', v_pct, 'band', v_band);
end; $$;

revoke all on function public.start_assessment(uuid, text, int) from public, anon;
revoke all on function public.submit_assessment(uuid, text, jsonb) from public, anon;
grant execute on function public.start_assessment(uuid, text, int) to authenticated;
grant execute on function public.submit_assessment(uuid, text, jsonb) to authenticated;
