-- Move all legacy answer keys out of the publicly readable curriculum_lessons JSON.
-- Apply before releasing the matching client; this migration is transactional.
create table public.legacy_lesson_answers (
  lesson_id text primary key references public.curriculum_lessons(id) on delete cascade,
  quiz_answer jsonb,
  builder_order jsonb,
  builder_target_word text
);
revoke all on public.legacy_lesson_answers from public, anon, authenticated;
alter table public.legacy_lesson_answers enable row level security;

-- Recursive scrub: nested answer-bearing keys are forbidden, not just top-level ones.
create function public.strip_legacy_answer_keys(p_value jsonb)
returns jsonb language sql immutable set search_path = public, pg_temp as $$
  select case jsonb_typeof(p_value)
    when 'object' then coalesce((select jsonb_object_agg(key, public.strip_legacy_answer_keys(value))
      from jsonb_each(p_value) where key not in ('answer', 'correct', 'correctOrder', 'targetWord')), '{}'::jsonb)
    when 'array' then coalesce((select jsonb_agg(public.strip_legacy_answer_keys(value) order by ord)
      from jsonb_array_elements(p_value) with ordinality as e(value, ord)), '[]'::jsonb)
    else p_value end
$$;
revoke all on function public.strip_legacy_answer_keys(jsonb) from public, anon, authenticated;

-- Capture all historical answer formats before stripping. Explicit `answer` takes priority.
-- Refuse ambiguous historical keys; never silently pick the first correct option.
do $$
begin
  if exists (
    select 1 from public.curriculum_lessons l
    cross join lateral jsonb_array_elements(case when jsonb_typeof(l.content->'options') = 'array'
      then l.content->'options' else '[]'::jsonb end) with ordinality as o(value, ord)
    where o.value->>'correct' = 'true'
    group by l.id, l.content
    having count(*) > 1 or (l.content ? 'answer'
      and l.content->'answer' <> to_jsonb(min(o.ord - 1)::integer))
  ) then raise exception 'ambiguous legacy lesson answers: review source before migration' using errcode = '22023';
  end if;
end $$;
insert into public.legacy_lesson_answers (lesson_id, quiz_answer, builder_order, builder_target_word)
select l.id,
  case when l.content ? 'answer' then l.content->'answer'
       else (select to_jsonb(min(ord - 1)::integer)
             from jsonb_array_elements(case when jsonb_typeof(l.content->'options') = 'array'
               then l.content->'options' else '[]'::jsonb end) with ordinality as o(value, ord)
             where o.value->>'correct' = 'true') end,
  coalesce(l.content#>'{interactiveBuilder,correctOrder}', l.content#>'{wordBuilder,correctOrder}'),
  coalesce(l.content#>>'{interactiveBuilder,targetWord}', l.content#>>'{wordBuilder,targetWord}')
from public.curriculum_lessons l
where l.content is not null;

update public.curriculum_lessons
set content = public.strip_legacy_answer_keys(content)
where content is distinct from public.strip_legacy_answer_keys(content);

create function public.reject_legacy_answer_keys()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if new.content is distinct from public.strip_legacy_answer_keys(new.content) then
    raise exception 'answer keys must be saved in private lesson answers' using errcode = '22023';
  end if;
  return new;
end $$;
create trigger curriculum_lessons_no_answers
  before insert or update on public.curriculum_lessons
  for each row execute function public.reject_legacy_answer_keys();
revoke all on function public.reject_legacy_answer_keys() from public, anon, authenticated;

-- One authoritative evaluation per child, lesson and activity. Never return the key.
create table public.legacy_lesson_attempts (
  lesson_id text not null references public.curriculum_lessons(id) on delete cascade,
  parent_id uuid not null,
  child_id uuid not null references public.children(id) on delete cascade,
  kind text not null check (kind in ('quiz', 'builder')),
  is_correct boolean not null,
  created_at timestamptz not null default now(),
  primary key (lesson_id, child_id, kind)
);
revoke all on public.legacy_lesson_attempts from public, anon, authenticated;
alter table public.legacy_lesson_attempts enable row level security;
create index legacy_lesson_attempts_parent_day_idx
  on public.legacy_lesson_attempts (parent_id, created_at);

create function public.submit_legacy_lesson_answer(
  p_lesson_id text, p_child_id uuid, p_kind text, p_selected jsonb
) returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare v_key jsonb; v_syllables jsonb; v_correct boolean;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if p_lesson_id is null or p_child_id is null or p_kind not in ('quiz','builder')
    or p_kind is null or p_selected is null then
    raise exception 'invalid answer' using errcode = '22023';
  end if;
  if not exists (select 1 from public.children c where c.id = p_child_id and c.parent_id = auth.uid()) then
    raise exception 'child not found' using errcode = '42501';
  end if;
  -- Account-wide bound prevents farming guesses through many children/lessons.
  perform pg_advisory_xact_lock(hashtextextended('legacy-parent:' || auth.uid()::text, 0));
  if (select count(*) from public.legacy_lesson_attempts
      where parent_id = auth.uid() and created_at >= now() - interval '1 day') >= 80 then
    raise exception 'daily attempt limit' using errcode = '22023';
  end if;
  -- Serialize concurrent submissions before checking; a unique key is a second defense.
  perform pg_advisory_xact_lock(hashtextextended(p_lesson_id || ':' || p_child_id::text || ':' || p_kind, 0));
  if exists (select 1 from public.legacy_lesson_attempts a
             where a.lesson_id = p_lesson_id and a.child_id = p_child_id and a.kind = p_kind) then
    raise exception 'already_answered' using errcode = '22023';
  end if;
  select case p_kind when 'quiz' then a.quiz_answer else a.builder_order end,
         coalesce(l.content#>'{interactiveBuilder,syllables}', l.content#>'{wordBuilder,syllables}')
    into v_key, v_syllables
  from public.legacy_lesson_answers a
  join public.curriculum_lessons l on l.id = a.lesson_id
  where l.id = p_lesson_id and l.published and l.review_status = 'approved'
    and not coalesce(l.archived, false);
  if not found or v_key is null or v_key = 'null'::jsonb then
    raise exception 'activity not available' using errcode = 'P0002';
  end if;
  if (p_kind = 'quiz' and jsonb_typeof(p_selected) <> jsonb_typeof(v_key))
    or (p_kind = 'builder' and jsonb_typeof(p_selected) <> 'array') then
    raise exception 'invalid answer' using errcode = '22023';
  end if;
  -- The original seed stores ordered syllable TEXT; the CMS stores zero-based
  -- numeric indices. Both are private, but the player always submits visible text.
  if p_kind = 'builder' and jsonb_typeof(v_key->0) = 'number' then
    if jsonb_typeof(v_syllables) <> 'array' or exists (
      select 1 from jsonb_array_elements(v_key) as e(value)
      where jsonb_typeof(e.value) <> 'number'
        or e.value::text !~ '^[0-9]+$'
        or length(e.value::text) > 8
        or (case when e.value::text ~ '^[0-9]{1,8}$'
            then e.value::text::integer else -1 end) >= jsonb_array_length(v_syllables)
    ) then raise exception 'invalid builder key' using errcode = '22023'; end if;
    select jsonb_agg(v_syllables->(e.value::text::integer) order by e.ord)
      into v_key from jsonb_array_elements(v_key) with ordinality as e(value, ord);
  end if;
  v_correct := v_key = p_selected;
  insert into public.legacy_lesson_attempts (lesson_id, parent_id, child_id, kind, is_correct)
    values (p_lesson_id, auth.uid(), p_child_id, p_kind, v_correct);
  return v_correct;
end $$;
revoke all on function public.submit_legacy_lesson_answer(text, uuid, text, jsonb) from public, anon;
grant execute on function public.submit_legacy_lesson_answer(text, uuid, text, jsonb) to authenticated;

create function public.editor_get_legacy_lesson_answers(p_lesson_id text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null or not (public.is_content_editor() or exists (
    select 1 from public.curriculum_lessons l where l.id = p_lesson_id
      and l.created_by = auth.uid() and public.is_teacher()
      and l.review_status in ('draft','rejected') and public.teacher_has_subject(l.subject_key)
  )) then raise exception 'forbidden' using errcode = '42501'; end if;
  return (select jsonb_build_object('answer', quiz_answer, 'correctOrder', builder_order,
            'targetWord', builder_target_word)
          from public.legacy_lesson_answers where lesson_id = p_lesson_id);
end $$;
revoke all on function public.editor_get_legacy_lesson_answers(text) from public, anon;
grant execute on function public.editor_get_legacy_lesson_answers(text) to authenticated;

-- Atomic metadata/content/answer update; no independent public content write with keys.
create function public.editor_save_legacy_lesson_answers(
  p_lesson_id text, p_content jsonb, p_answer jsonb, p_builder_order jsonb,
  p_builder_target_word text, p_metadata jsonb
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_lesson public.curriculum_lessons%rowtype;
begin
  if auth.uid() is null then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into v_lesson from public.curriculum_lessons where id = p_lesson_id for update;
  if not found then raise exception 'lesson not found' using errcode = 'P0002'; end if;
  if not (public.is_content_editor() or (
    public.is_teacher() and v_lesson.created_by = auth.uid()
    and v_lesson.review_status in ('draft','rejected')
    and public.teacher_has_subject(v_lesson.subject_key)
    and public.teacher_has_subject(p_metadata->>'subject_key')
  )) then raise exception 'forbidden' using errcode = '42501'; end if;
  if jsonb_typeof(p_content) <> 'object' or p_content <> public.strip_legacy_answer_keys(p_content)
    or jsonb_typeof(p_metadata) <> 'object'
    or (p_answer is not null and jsonb_typeof(p_answer) not in ('number','boolean','array'))
    or (p_builder_order is not null and jsonb_typeof(p_builder_order) <> 'array') then
    raise exception 'invalid lesson answers' using errcode = '22023';
  end if;
  -- Only the content editor can publish. Teachers keep the prior publication state.
  update public.curriculum_lessons l set
    title = p_metadata->>'title',
    subject_key = p_metadata->>'subject_key',
    sort_order = (p_metadata->>'sort_order')::integer,
    published = case when public.is_content_editor() then (p_metadata->>'published')::boolean else l.published end,
    video_url = nullif(p_metadata->>'video_url', ''),
    video_type = p_metadata->>'video_type',
    pdf_url = nullif(p_metadata->>'pdf_url', ''),
    pdf_type = p_metadata->>'pdf_type',
    content = p_content
  where l.id = p_lesson_id;
  if not found then raise exception 'lesson not found' using errcode = 'P0002'; end if;
  insert into public.legacy_lesson_answers (lesson_id, quiz_answer, builder_order, builder_target_word)
    values (p_lesson_id, p_answer, p_builder_order, p_builder_target_word)
    on conflict (lesson_id) do update set quiz_answer = excluded.quiz_answer,
      builder_order = excluded.builder_order, builder_target_word = excluded.builder_target_word;
end $$;
revoke all on function public.editor_save_legacy_lesson_answers(text, jsonb, jsonb, jsonb, text, jsonb) from public, anon;
grant execute on function public.editor_save_legacy_lesson_answers(text, jsonb, jsonb, jsonb, text, jsonb) to authenticated;
