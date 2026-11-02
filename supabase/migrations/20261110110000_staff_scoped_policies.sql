-- سياسات ودوال إضافية تطبّق صلاحيات الطاقم المحدودة بنطاق.
-- يعتمد على 20261110100000_staff_scoped_permissions.sql.
-- كل السياسات هنا إضافية (permissive) بأسماء جديدة؛ لا تُحذف أو تُضيَّق أي سياسة قائمة.
-- الدوال المعاد تعريفها منسوخة من تعريف الإنتاج (pg_get_functiondef 2026-11-03) مع تعديل شرط التفويض فقط.

-- 0) مساعد: هل يملك المستخدم تحرير محتوى درس؟ ------------------------------
create or replace function public.staff_can_edit_lesson(p_lesson_id text)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.curriculum_lessons l
    where l.id = p_lesson_id and public.has_capability('content.edit', l.subject_key)
  )
$$;
create or replace function public.staff_can_see_lesson(p_subject_key text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_capability('content.edit', p_subject_key)
      or public.has_capability('lessons.review', p_subject_key)
      or public.has_capability('recordings.review', p_subject_key)
      or public.has_capability('teachers.assign', p_subject_key)
$$;
create or replace function public.staff_can_view_child(p_child_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_capability_for_child('children.view', p_child_id)
      or public.has_capability_for_child('children.edit', p_child_id)
$$;
revoke all on function public.staff_can_edit_lesson(text) from public, anon;
revoke all on function public.staff_can_see_lesson(text) from public, anon;
revoke all on function public.staff_can_view_child(uuid) from public, anon;
grant execute on function public.staff_can_edit_lesson(text) to authenticated;
grant execute on function public.staff_can_see_lesson(text) to authenticated;
grant execute on function public.staff_can_view_child(uuid) to authenticated;

-- 1) المحتوى: المواد والدروس والأسئلة والوسائط -------------------------------
drop policy if exists "scoped staff read subjects" on public.curriculum_subjects;
create policy "scoped staff read subjects" on public.curriculum_subjects
  for select to authenticated using (public.staff_can_see_lesson(key));
drop policy if exists "scoped staff manage subjects" on public.curriculum_subjects;
create policy "scoped staff manage subjects" on public.curriculum_subjects
  for all to authenticated
  using (public.has_capability('content.edit', key, grade_id))
  with check (public.has_capability('content.edit', key, grade_id));

drop policy if exists "scoped staff read lessons" on public.curriculum_lessons;
create policy "scoped staff read lessons" on public.curriculum_lessons
  for select to authenticated using (public.staff_can_see_lesson(subject_key));
drop policy if exists "scoped staff manage lessons" on public.curriculum_lessons;
create policy "scoped staff manage lessons" on public.curriculum_lessons
  for all to authenticated
  using (public.has_capability('content.edit', subject_key))
  with check (public.has_capability('content.edit', subject_key));

drop policy if exists "scoped staff manage lesson questions" on public.lesson_questions;
create policy "scoped staff manage lesson questions" on public.lesson_questions
  for all to authenticated
  using (public.staff_can_edit_lesson(lesson_id))
  with check (public.staff_can_edit_lesson(lesson_id));

drop policy if exists "scoped staff manage lesson assets" on public.lesson_assets;
create policy "scoped staff manage lesson assets" on public.lesson_assets
  for all to authenticated
  using (public.staff_can_edit_lesson(lesson_id))
  with check (public.staff_can_edit_lesson(lesson_id));

drop policy if exists "scoped staff manage media" on public.curriculum_media;
create policy "scoped staff manage media" on public.curriculum_media
  for all to authenticated
  using (public.staff_can_edit_lesson(lesson_id))
  with check (public.staff_can_edit_lesson(lesson_id));

drop policy if exists "scoped staff read question attempts" on public.lesson_question_attempts;
create policy "scoped staff read question attempts" on public.lesson_question_attempts
  for select to authenticated using (
    public.staff_can_view_child(child_id)
    or exists (select 1 from public.curriculum_lessons l
               where l.id = lesson_question_attempts.lesson_id and public.has_capability('content.edit', l.subject_key))
  );

-- رفع الملفات: المشرف يرفع داخل مجلده مثل المعلم.
drop policy if exists "scoped staff upload curriculum media" on storage.objects;
create policy "scoped staff upload curriculum media" on storage.objects
  for insert to authenticated with check (
    bucket_id in ('curriculum-media', 'lesson-files', 'lesson-videos')
    and public.has_any_capability('content.edit')
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

-- حارس كتابة الدرس: من يملك content.edit في مادة الدرس يُعامل كمحرر محتوى.
create or replace function public.guard_teacher_lesson_write()
returns trigger language plpgsql security definer set search_path = public as $function$
begin
  if auth.uid() is null then return new; end if;
  if public.is_content_editor() or public.has_capability('content.edit', new.subject_key) then
    if new.published and new.review_status <> 'approved' then
      new.review_status := 'approved'; new.reviewed_by := auth.uid(); new.reviewed_at := now();
    end if;
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
end $function$;

-- RPCs المحرر: نفس الإنتاج + المشرف صاحب content.edit في مادة الدرس.
create or replace function public.editor_delete_lesson_question(p_question_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $function$
declare v_lesson_id text;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  select q.lesson_id into v_lesson_id from public.lesson_questions q where q.id = p_question_id;
  if v_lesson_id is null then raise exception 'question not found' using errcode = 'P0002'; end if;
  if not (
    public.is_content_editor()
    or public.teacher_can_edit_lesson(v_lesson_id)
    or public.staff_can_edit_lesson(v_lesson_id)
  ) then raise exception 'forbidden' using errcode = '42501'; end if;
  if exists (select 1 from public.lesson_question_attempts where question_id = p_question_id) then
    update public.lesson_questions set is_published = false where id = p_question_id;
  else
    delete from public.lesson_questions where id = p_question_id;
  end if;
end;
$function$;

create or replace function public.editor_get_legacy_lesson_answers(p_lesson_id text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $function$
begin
  if auth.uid() is null or not (public.is_content_editor() or public.teacher_can_edit_lesson(p_lesson_id)
     or public.staff_can_edit_lesson(p_lesson_id)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return (select jsonb_build_object('answer', quiz_answer, 'correctOrder', builder_order,
            'targetWord', builder_target_word)
          from public.legacy_lesson_answers where lesson_id = p_lesson_id);
end $function$;

create or replace function public.editor_list_lesson_questions(p_lesson_id text)
returns setof public.lesson_questions language plpgsql stable security definer set search_path = public, pg_temp as $function$
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if not (
    public.is_content_editor()
    or public.teacher_can_edit_lesson(p_lesson_id)
    or public.staff_can_edit_lesson(p_lesson_id)
  ) then raise exception 'forbidden' using errcode = '42501'; end if;

  return query
    select q.* from public.lesson_questions q
    where q.lesson_id = p_lesson_id
    order by q.sort_order, q.id;
end;
$function$;

create or replace function public.editor_save_legacy_lesson_answers(p_lesson_id text, p_content jsonb, p_answer jsonb, p_builder_order jsonb, p_builder_target_word text, p_metadata jsonb)
returns void language plpgsql security definer set search_path = public, pg_temp as $function$
declare
  v_lesson public.curriculum_lessons%rowtype;
  v_editor boolean;
begin
  if auth.uid() is null then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into v_lesson from public.curriculum_lessons where id = p_lesson_id for update;
  if not found then raise exception 'lesson not found' using errcode = 'P0002'; end if;
  -- محرر = محرر المحتوى العام، أو مشرف يملك content.edit في المادة الحالية والمادة الجديدة معاً.
  v_editor := public.is_content_editor() or (
    public.has_capability('content.edit', v_lesson.subject_key)
    and public.has_capability('content.edit', p_metadata->>'subject_key'));
  if not (v_editor or (
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
  update public.curriculum_lessons l set
    title = p_metadata->>'title',
    subject_key = p_metadata->>'subject_key',
    sort_order = (p_metadata->>'sort_order')::integer,
    published = case when v_editor then (p_metadata->>'published')::boolean else l.published end,
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
end $function$;

create or replace function public.editor_save_lesson_question(p_question_id uuid, p_lesson_id text, p_payload jsonb, p_sort_order integer DEFAULT 0)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $function$
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
    or public.staff_can_edit_lesson(p_lesson_id)
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
$function$;

-- 2) مراجعة الدروس ------------------------------------------------------------
create or replace function public.review_lesson(p_id text, p_approve boolean, p_note text DEFAULT NULL::text)
returns void language plpgsql security definer set search_path = public as $function$
declare v_status text; v_subject text;
begin
  if not (public.is_content_editor() or public.has_any_capability('lessons.review')) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  select review_status, subject_key into v_status, v_subject from public.curriculum_lessons where id = p_id for update;
  if not found then raise exception 'lesson not found' using errcode = 'P0002'; end if;
  if not (public.is_content_editor() or public.has_capability('lessons.review', v_subject)) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if v_status <> 'submitted' then raise exception 'الدرس ليس بانتظار المراجعة' using errcode = '22023'; end if;
  if p_approve then
    update public.curriculum_lessons
      set review_status = 'approved', published = true, review_note = nullif(trim(p_note), ''),
          reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
      where id = p_id;
  else
    if p_note is null or length(trim(p_note)) = 0 then raise exception 'سبب الرفض مطلوب' using errcode = '22023'; end if;
    update public.curriculum_lessons
      set review_status = 'rejected', published = false, review_note = trim(p_note),
          reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
      where id = p_id;
  end if;
end $function$;

-- 3) مراجعة التسجيلات ---------------------------------------------------------
drop policy if exists "scoped staff read recordings" on public.lesson_recordings;
create policy "scoped staff read recordings" on public.lesson_recordings
  for select to authenticated using (
    public.has_capability('recordings.review',
      (select l.subject_key from public.curriculum_lessons l where l.id = lesson_recordings.lesson_id))
  );

drop policy if exists "scoped staff read recording files" on storage.objects;
create policy "scoped staff read recording files" on storage.objects
  for select to authenticated using (
    bucket_id = 'lesson-recordings' and exists (
      select 1 from public.lesson_recordings r
      left join public.curriculum_lessons l on l.id = r.lesson_id
      where r.storage_path = objects.name and public.has_capability('recordings.review', l.subject_key))
  );

create or replace function public.review_lesson_recording(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $function$
declare v_subject text;
begin
  if not (public.is_admin() or public.has_any_capability('recordings.review')) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_status not in ('accepted','rejected') then raise exception 'invalid status' using errcode = '22023'; end if;
  select l.subject_key into v_subject
    from public.lesson_recordings r left join public.curriculum_lessons l on l.id = r.lesson_id
   where r.id = p_id for update of r;
  if not found then raise exception 'recording not found' using errcode = 'P0002'; end if;
  if not (public.is_admin() or public.has_capability('recordings.review', v_subject)) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.lesson_recordings set status = p_status, reviewed_by = auth.uid(), reviewed_at = now() where id = p_id;
end $function$;

-- 4) إسناد المعلمين -----------------------------------------------------------
drop policy if exists "scoped staff manage teacher subjects" on public.teacher_subjects;
create policy "scoped staff manage teacher subjects" on public.teacher_subjects
  for all to authenticated
  using (public.has_capability('teachers.assign', subject_key))
  with check (public.has_capability('teachers.assign', subject_key));

drop policy if exists "scoped staff manage teacher students" on public.teacher_students;
create policy "scoped staff manage teacher students" on public.teacher_students
  for all to authenticated
  using (public.has_capability_for_child('teachers.assign', child_id))
  with check (public.has_capability_for_child('teachers.assign', child_id));

-- 5) الأطفال وتقدمهم ---------------------------------------------------------
drop policy if exists "scoped staff read children" on public.children;
create policy "scoped staff read children" on public.children
  for select to authenticated using (public.staff_can_view_child(id));
drop policy if exists "scoped staff read learning records" on public.learning_records;
create policy "scoped staff read learning records" on public.learning_records
  for select to authenticated using (public.staff_can_view_child(child_id));
drop policy if exists "scoped staff read child streaks" on public.child_streaks;
create policy "scoped staff read child streaks" on public.child_streaks
  for select to authenticated using (public.staff_can_view_child(child_id));
drop policy if exists "scoped staff read child daily activity" on public.child_daily_activity;
create policy "scoped staff read child daily activity" on public.child_daily_activity
  for select to authenticated using (public.staff_can_view_child(child_id));
drop policy if exists "scoped staff read exam attempts" on public.exam_attempts;
create policy "scoped staff read exam attempts" on public.exam_attempts
  for select to authenticated using (public.staff_can_view_child(child_id));
drop policy if exists "scoped staff read live joins" on public.live_join_log;
create policy "scoped staff read live joins" on public.live_join_log
  for select to authenticated using (public.staff_can_view_child(child_id));

-- التعديل: الاسم والصف فقط (نفس حقول RPC الإدارة)، والصف الجديد يجب أن يبقى داخل نطاق المشرف.
create or replace function public.admin_update_child_profile(p_child_id uuid, p_name text, p_grade text)
returns void language plpgsql security definer set search_path = public as $function$
declare v_new_grade text;
begin
  if not (public.is_admin() or public.has_any_capability('children.edit')) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_child_id is null
     or p_name is null
     or length(trim(p_name)) not between 2 and 80
     or p_grade is null
     or length(trim(p_grade)) not between 2 and 100 then
    raise exception 'invalid child profile' using errcode = '22023';
  end if;
  if not public.is_admin() then
    perform 1 from public.children where id = p_child_id for update;
    if not found or not public.has_capability_for_child('children.edit', p_child_id) then
      raise exception 'not authorized' using errcode = '42501';
    end if;
    v_new_grade := public.resolve_grade_id(p_grade);
    if v_new_grade is null or not public.has_capability('children.edit', null, v_new_grade) then
      raise exception 'grade outside your scope' using errcode = '42501';
    end if;
  end if;

  update public.children
     set name = trim(p_name), grade = trim(p_grade)
   where id = p_child_id;
  if not found then
    raise exception 'child not found' using errcode = 'P0002';
  end if;
end;
$function$;

create or replace function public.set_exam_unlocked(p_child_id uuid, p_unlocked boolean)
returns void language plpgsql security definer set search_path = public as $function$
begin
  if not (
    public.is_admin()
    or exists (
      select 1 from public.teacher_students ts
      where ts.child_id = p_child_id and ts.teacher_id = auth.uid()
    )
    or public.has_capability_for_child('children.edit', p_child_id)
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.children
     set exam_unlocked    = coalesce(p_unlocked, false),
         exam_unlocked_by = case when p_unlocked then auth.uid() else null end,
         exam_unlocked_at = case when p_unlocked then now() else null end
   where id = p_child_id;
end;
$function$;

-- 6) الجدول الأسبوعي ---------------------------------------------------------
drop policy if exists "scoped staff manage schedule" on public.schedule_slots;
create policy "scoped staff manage schedule" on public.schedule_slots
  for all to authenticated
  using (public.has_capability_for_child('schedule.manage', child_id)
         or (child_id is null and public.has_capability('schedule.manage')))
  with check (public.has_capability_for_child('schedule.manage', child_id)
         or (child_id is null and public.has_capability('schedule.manage')));

create or replace function public.set_slot_meeting_url(p_slot_id text, p_url text)
returns void language plpgsql security definer set search_path = public as $function$
begin
  if p_url is not null and btrim(p_url) <> '' and p_url !~* '^https://[^\s]+$' then
    raise exception 'invalid url' using errcode = '22023';
  end if;
  if not (public.is_admin()
          or exists (select 1 from public.schedule_slots s where s.id = p_slot_id and s.teacher_id = auth.uid())
          or exists (select 1 from public.schedule_slots s where s.id = p_slot_id
                     and (public.has_capability_for_child('schedule.manage', s.child_id)
                          or (s.child_id is null and public.has_capability('schedule.manage'))))) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.schedule_slots set meeting_url = nullif(btrim(p_url), '') where id = p_slot_id;
end;
$function$;

-- 7) صلاحيات على مستوى المنصة (نطاق "الكل" فقط) -------------------------------
drop policy if exists "staff manage bookings" on public.bookings;
create policy "staff manage bookings" on public.bookings
  for all to authenticated
  using (public.has_capability('bookings.manage'))
  with check (public.has_capability('bookings.manage'));

drop policy if exists "staff read parent profiles" on public.parent_profiles;
create policy "staff read parent profiles" on public.parent_profiles
  for select to authenticated using (public.has_capability('families.manage'));

create or replace function public.admin_update_family_profile(p_parent_id uuid, p_full_name text, p_whatsapp text, p_country_code text)
returns void language plpgsql security definer set search_path = public as $function$
begin
  if not (public.is_admin() or public.has_capability('families.manage')) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_parent_id is null
     or p_full_name is null
     or length(trim(p_full_name)) not between 2 and 100
     or (p_whatsapp is not null and length(trim(p_whatsapp)) not between 6 and 40)
     or (p_country_code is not null and length(trim(p_country_code)) not between 2 and 40) then
    raise exception 'invalid family profile' using errcode = '22023';
  end if;
  -- مدير المنصة لا يعدّل حساب طاقم عبر مسار الأسر.
  if not public.is_admin() and exists (
    select 1 from public.profiles where id = p_parent_id and role <> 'parent') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  update public.parent_profiles
     set full_name = trim(p_full_name),
         whatsapp = nullif(trim(p_whatsapp), ''),
         country_code = nullif(trim(p_country_code), ''),
         updated_at = now()
   where id = p_parent_id;
  if not found then
    raise exception 'family not found' using errcode = 'P0002';
  end if;

  update public.profiles
     set full_name = trim(p_full_name), updated_at = now()
   where id = p_parent_id;
end;
$function$;

drop policy if exists "staff manage site settings" on public.site_settings;
create policy "staff manage site settings" on public.site_settings
  for all to authenticated
  using (public.has_capability('settings.edit'))
  with check (public.has_capability('settings.edit'));

drop policy if exists "staff read activity log" on public.activity_log;
create policy "staff read activity log" on public.activity_log
  for select to authenticated using (public.has_capability('analytics.view'));

-- الاشتراكات: عرض فقط (التعديل يبقى للمدير العام عبر RPCs القائمة).
drop policy if exists "staff read subscription plans" on public.subscription_plans;
create policy "staff read subscription plans" on public.subscription_plans
  for select to authenticated using (public.has_capability('subscriptions.view'));
drop policy if exists "staff read subscription plan subjects" on public.subscription_plan_subjects;
create policy "staff read subscription plan subjects" on public.subscription_plan_subjects
  for select to authenticated using (public.has_capability('subscriptions.view'));
drop policy if exists "staff read subscription plan audit" on public.subscription_plan_audit;
create policy "staff read subscription plan audit" on public.subscription_plan_audit
  for select to authenticated using (public.has_capability('subscriptions.view'));
drop policy if exists "staff read child subscription contracts" on public.child_subscription_contracts;
create policy "staff read child subscription contracts" on public.child_subscription_contracts
  for select to authenticated using (public.has_capability('subscriptions.view'));
drop policy if exists "staff read child subscription subjects" on public.child_subscription_subjects;
create policy "staff read child subscription subjects" on public.child_subscription_subjects
  for select to authenticated using (public.has_capability('subscriptions.view'));
drop policy if exists "staff read hour ledger" on public.subscription_hour_ledger;
create policy "staff read hour ledger" on public.subscription_hour_ledger
  for select to authenticated using (public.has_capability('subscriptions.view'));
