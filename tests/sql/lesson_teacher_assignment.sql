-- Acceptance for 20261108100000_lesson_teacher_assignment.sql (isolated DB only).
\set ON_ERROR_STOP on
\set t1 '00000000-0000-0000-0000-0000000000a1'
\set t2 '00000000-0000-0000-0000-0000000000a2'
\set ad '00000000-0000-0000-0000-0000000000ad'
\set pa '00000000-0000-0000-0000-0000000000ae'
do $$ begin
  if (select count(*) from pg_policies where schemaname = 'public'
      and tablename = 'curriculum_lessons' and cmd = 'SELECT') <> 1 then
    raise exception 'multiple SELECT policies can combine with OR to expose drafts';
  end if;
end $$;

set role authenticated;
-- 1) Teacher cannot self-assign.
select set_config('request.jwt.claim.sub', :'t1', false);
update public.curriculum_lessons set assigned_teacher_id = auth.uid() where id = 'L-draft';
do $$ begin
  if exists (select 1 from public.curriculum_lessons where id = 'L-draft') then
    raise exception 'teacher sees an unassigned unpublished lesson';
  end if;
end $$;

-- 2) Admin: parent/other-subject assignments are rejected.
select set_config('request.jwt.claim.sub', :'ad', false);
do $$ begin
  begin
    update public.curriculum_lessons set assigned_teacher_id = '00000000-0000-0000-0000-0000000000ae' where id = 'L-draft';
    raise exception 'assigned a non-teacher';
  exception when check_violation then null; end;
  begin
    update public.curriculum_lessons set assigned_teacher_id = '00000000-0000-0000-0000-0000000000a1' where id = 'L-math';
    raise exception 'assigned a teacher without the subject';
  exception when check_violation then null; end;
end $$;
-- 3) Admin assigns t1: unpublished lesson becomes an editable draft.
update public.curriculum_lessons set assigned_teacher_id = :'t1' where id in ('L-draft', 'L-pub');
do $$ begin
  if (select review_status from public.curriculum_lessons where id = 'L-draft') <> 'draft' then
    raise exception 'assigning an unpublished lesson did not reopen it as draft';
  end if;
  if (select review_status from public.curriculum_lessons where id = 'L-pub') <> 'approved' then
    raise exception 'assigning a published lesson changed its review state';
  end if;
end $$;

-- 4) Assigned teacher reads and edits, but cannot reassign/archive/move/publish.
select set_config('request.jwt.claim.sub', :'t1', false);
update public.curriculum_lessons
  set title = 'عدّله المعلم', assigned_teacher_id = :'t2', archived = true, subject_key = 'math', published = true
  where id = 'L-draft';
do $$ declare r record; begin
  select * into r from public.curriculum_lessons where id = 'L-draft';
  if r.title <> 'عدّله المعلم' then raise exception 'assigned teacher could not edit'; end if;
  if r.assigned_teacher_id <> '00000000-0000-0000-0000-0000000000a1' or r.archived or r.subject_key <> 'arabic' or r.published then
    raise exception 'assigned teacher changed a protected field';
  end if;
  if not public.teacher_can_edit_lesson('L-draft') then raise exception 'helper denies assigned draft'; end if;
  if public.teacher_can_edit_lesson('L-pub') then raise exception 'helper allows a published lesson'; end if;
end $$;
-- published lesson stays locked
update public.curriculum_lessons set title = 'x' where id = 'L-pub';
insert into public.lesson_assets (lesson_id, url) values ('L-draft', 'ok');
do $$ begin
  begin
    insert into public.lesson_assets (lesson_id, url) values ('L-pub', 'bad');
    raise exception 'teacher added an asset to a locked lesson';
  exception when insufficient_privilege then null; end;
end $$;
update public.curriculum_lessons set review_status = 'submitted' where id = 'L-draft';

-- 5) Other teacher and parent see nothing unpublished.
select set_config('request.jwt.claim.sub', :'t2', false);
do $$ begin
  if exists (select 1 from public.curriculum_lessons where id = 'L-draft') then raise exception 'other teacher sees assigned draft'; end if;
  if public.teacher_can_edit_lesson('L-draft') then raise exception 'other teacher may edit'; end if;
end $$;
update public.curriculum_lessons set title = 'hijack' where id = 'L-draft';
select set_config('request.jwt.claim.sub', :'pa', false);
do $$ begin
  if exists (select 1 from public.curriculum_lessons where id = 'L-draft') then raise exception 'parent sees draft'; end if;
end $$;

-- 6) Unassigning the subject clears lesson assignments.
select set_config('request.jwt.claim.sub', :'ad', false);
do $$ declare r record; begin
  select * into r from public.curriculum_lessons where id = 'L-draft';
  if r.title <> 'عدّله المعلم' or r.review_status <> 'submitted' then raise exception 'unexpected final lesson state %', row_to_json(r); end if;
  if (select title from public.curriculum_lessons where id = 'L-pub') <> 'منشور' then raise exception 'locked lesson was edited'; end if;
end $$;
delete from public.teacher_subjects where teacher_id = :'t1' and subject_key = 'arabic';
do $$ begin
  if exists (select 1 from public.curriculum_lessons where assigned_teacher_id is not null) then
    raise exception 'subject unassignment left lesson assignments behind';
  end if;
end $$;
reset role;
