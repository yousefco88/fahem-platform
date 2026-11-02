-- إسناد معلم لدرس محدد (اختياري، فوق إسناد المادة teacher_subjects).
-- * المدير/محرر المحتوى فقط يحدد assigned_teacher_id؛ الحارس يثبّته ضد المعلم.
-- * المعلم المُسند يجب أن يكون role='teacher' ومسنداً لمادة الدرس.
-- * إسناد درس غير منشور يعيده «مسودة» ليصبح قابلاً للتحرير عند المعلم؛ الدرس المنشور يبقى للعرض فقط.
-- * المعلم المُسند يقرأ الدرس ويحرره (مسودة/مرفوض) ويرسله للمراجعة؛ لا ينشر ولا يؤرشف ولا ينقل المادة.
-- * إلغاء إسناد المادة من المعلم يلغي إسناداته على دروس تلك المادة.
-- Applied to production (ehpyxinemoissuvbyawy) 2026-11-03 بموافقة يوسف («انشر»).

alter table public.curriculum_lessons
  add column if not exists assigned_teacher_id uuid references auth.users(id) on delete set null;
create index if not exists curriculum_lessons_assigned_teacher_idx
  on public.curriculum_lessons (assigned_teacher_id) where assigned_teacher_id is not null;

-- هل يستطيع المعلم الحالي تحرير هذا الدرس (منشئه أو المُسند إليه)؟
create or replace function public.teacher_can_edit_lesson(p_lesson_id text)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select public.is_teacher() and exists (
    select 1 from public.curriculum_lessons l
    where l.id = p_lesson_id
      and (l.created_by = auth.uid() or l.assigned_teacher_id = auth.uid())
      and l.review_status in ('draft','rejected')
      and public.teacher_has_subject(l.subject_key)
  )
$$;
revoke all on function public.teacher_can_edit_lesson(text) from public, anon;
grant execute on function public.teacher_can_edit_lesson(text) to authenticated;

-- ===== الحارس: يشمل حقل الإسناد =====
create or replace function public.guard_teacher_lesson_write()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if auth.uid() is null then return new; end if;
  if public.is_content_editor() then
    if new.published and new.review_status <> 'approved' then
      new.review_status := 'approved'; new.reviewed_by := auth.uid(); new.reviewed_at := now();
    end if;
    -- إسناد درس غير منشور لمعلم يفتحه للتحرير كمسودة.
    if new.assigned_teacher_id is not null and not new.published
       and (tg_op = 'INSERT' or new.assigned_teacher_id is distinct from old.assigned_teacher_id)
       and new.review_status = 'approved' then
      new.review_status := 'draft';
    end if;
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.created_by := auth.uid(); new.review_status := 'draft'; new.published := false;
    new.review_note := null; new.reviewed_by := null; new.reviewed_at := null;
    new.assigned_teacher_id := null;
    return new;
  end if;
  new.published := old.published;
  new.created_by := old.created_by;
  new.review_note := old.review_note;
  new.reviewed_by := old.reviewed_by;
  new.reviewed_at := old.reviewed_at;
  new.assigned_teacher_id := old.assigned_teacher_id;
  -- المعلم المُسند (غير المنشئ) لا يؤرشف الدرس ولا ينقله لمادة أخرى.
  if old.created_by is distinct from auth.uid() then
    new.archived := old.archived;
    new.subject_key := old.subject_key;
  end if;
  if new.review_status is distinct from old.review_status
     and not (old.review_status in ('draft','rejected') and new.review_status in ('draft','submitted')) then
    raise exception 'غير مسموح بتغيير حالة المراجعة' using errcode = '42501';
  end if;
  if new.review_status = 'submitted' and old.review_status <> 'submitted' then
    new.review_note := null;
  end if;
  return new;
end $$;

-- تحقق مستقل يعمل بعد الحارس (ترتيب أبجدي للمشغلات: guard_ ثم validate_)،
-- فيرى القيم بعد التثبيت، ويسري على كل كاتب بما فيه الخدمة.
create or replace function public.validate_lesson_teacher_assignment()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.assigned_teacher_id is not null
     and (tg_op = 'INSERT'
          or new.assigned_teacher_id is distinct from old.assigned_teacher_id
          or new.subject_key is distinct from old.subject_key) then
    if not exists (select 1 from public.profiles p where p.id = new.assigned_teacher_id and p.role = 'teacher') then
      raise exception 'المستخدم المُسند ليس معلماً' using errcode = '23514';
    end if;
    if not exists (select 1 from public.teacher_subjects t
                   where t.teacher_id = new.assigned_teacher_id and t.subject_key = new.subject_key) then
      raise exception 'أسند المادة للمعلم أولاً قبل إسناد دروسها' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.validate_lesson_teacher_assignment() from public, anon, authenticated;
drop trigger if exists validate_lesson_teacher_assignment on public.curriculum_lessons;
create trigger validate_lesson_teacher_assignment before insert or update on public.curriculum_lessons
  for each row execute function public.validate_lesson_teacher_assignment();

-- ===== قراءة الدروس: سياسة SELECT واحدة فقط (السياسات المتساهلة تُدمج بـ OR) =====
drop policy if exists "lessons readable" on public.curriculum_lessons;
create policy "lessons readable" on public.curriculum_lessons
  for select using (
    (
      published = true
      and review_status = 'approved'
      and exists (
        select 1 from public.curriculum_subjects s
        where s.key = curriculum_lessons.subject_key and s.published = true
      )
    )
    or public.is_content_editor()
    or (auth.uid() is not null and created_by = auth.uid())
    or (auth.uid() is not null and assigned_teacher_id = auth.uid())
  );

-- ===== تعديل المعلم: منشئ الدرس أو المُسند إليه =====
drop policy if exists "teacher edits own unlocked lessons" on public.curriculum_lessons;
create policy "teacher edits own unlocked lessons" on public.curriculum_lessons
  for update to authenticated
  using (public.is_teacher() and (created_by = auth.uid() or assigned_teacher_id = auth.uid())
         and review_status in ('draft','rejected'))
  with check (
    public.is_teacher() and (created_by = auth.uid() or assigned_teacher_id = auth.uid())
    and published = false and review_status in ('draft','submitted','rejected')
    and public.teacher_has_subject(subject_key)
  );

-- ===== ملفات الدرس =====
drop policy if exists "lesson assets readable" on public.lesson_assets;
create policy "lesson assets readable" on public.lesson_assets
  for select using (exists (select 1 from public.curriculum_lessons l where l.id = lesson_assets.lesson_id
    and ((l.published and l.review_status = 'approved') or public.is_content_editor()
         or l.created_by = auth.uid() or l.assigned_teacher_id = auth.uid())));
drop policy if exists "teacher manages own lesson assets" on public.lesson_assets;
create policy "teacher manages own lesson assets" on public.lesson_assets
  for all to authenticated
  using (public.teacher_can_edit_lesson(lesson_assets.lesson_id))
  with check (public.teacher_can_edit_lesson(lesson_assets.lesson_id));

-- ===== إلغاء إسناد المادة يلغي إسناد دروسها =====
create or replace function public.clear_lesson_assignments_on_subject_unassign()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.curriculum_lessons
    set assigned_teacher_id = null
    where assigned_teacher_id = old.teacher_id and subject_key = old.subject_key;
  return old;
end $$;
revoke all on function public.clear_lesson_assignments_on_subject_unassign() from public, anon, authenticated;
drop trigger if exists clear_lesson_assignments_on_subject_unassign on public.teacher_subjects;
create trigger clear_lesson_assignments_on_subject_unassign after delete on public.teacher_subjects
  for each row execute function public.clear_lesson_assignments_on_subject_unassign();

-- ===== RPCs المحرر: نفس الأجسام السابقة، مع teacher_can_edit_lesson بدل شرط المنشئ =====
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
    or public.teacher_can_edit_lesson(p_lesson_id)
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
    or public.teacher_can_edit_lesson(p_lesson_id)
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
    or public.teacher_can_edit_lesson(v_lesson_id)
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

create or replace function public.editor_get_legacy_lesson_answers(p_lesson_id text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null or not (public.is_content_editor() or public.teacher_can_edit_lesson(p_lesson_id)) then raise exception 'forbidden' using errcode = '42501'; end if;
  return (select jsonb_build_object('answer', quiz_answer, 'correctOrder', builder_order,
            'targetWord', builder_target_word)
          from public.legacy_lesson_answers where lesson_id = p_lesson_id);
end $$;

create or replace function public.editor_save_legacy_lesson_answers(
  p_lesson_id text, p_content jsonb, p_answer jsonb, p_builder_order jsonb,
  p_builder_target_word text, p_metadata jsonb
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_lesson public.curriculum_lessons%rowtype;
begin
  if auth.uid() is null then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into v_lesson from public.curriculum_lessons where id = p_lesson_id for update;
  if not found then raise exception 'lesson not found' using errcode = 'P0002'; end if;
  if not (public.is_content_editor() or (
    public.is_teacher() and (v_lesson.created_by = auth.uid() or v_lesson.assigned_teacher_id = auth.uid())
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
