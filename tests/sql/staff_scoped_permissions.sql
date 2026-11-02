-- Acceptance for 20261110100000 + 20261110110000 (staff scoped permissions). Synthetic data only.
\set ON_ERROR_STOP on
create function public.t_fails(p_sql text, p_code text default '42501') returns boolean
language plpgsql as $$
begin
  execute p_sql;
  return false;
exception when others then
  if sqlstate <> p_code then raise notice 'unexpected % (%): %', sqlstate, p_sql, sqlerrm; return false; end if;
  return true;
end $$;
create function public.t_rows(p_sql text) returns bigint language plpgsql as $$
declare n bigint; begin execute 'select count(*) from (' || p_sql || ') q' into n; return n; end $$;
create function public.t_affected(p_sql text) returns bigint language plpgsql as $$
declare n bigint; begin execute p_sql; get diagnostics n = row_count; return n; end $$;
grant execute on function public.t_fails(text, text), public.t_rows(text), public.t_affected(text) to authenticated;

create function public.t_act(p uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p::text, false) $$;

-- ===== admin =====
set role authenticated;
select public.t_act('00000000-0000-0000-0000-00000000000a');
do $$ begin
  perform public.admin_set_user_role('00000000-0000-0000-0000-00000000000b', 'platform_manager');
  perform public.admin_set_user_role('00000000-0000-0000-0000-0000000000b2', 'platform_manager');
  perform public.admin_set_user_role('00000000-0000-0000-0000-00000000000c', 'supervisor');
  perform public.admin_set_user_role('00000000-0000-0000-0000-0000000000c2', 'supervisor');
  assert public.staff_apply_role_preset('00000000-0000-0000-0000-00000000000b') = 12, 'preset grants 12 caps';
  assert public.t_fails($q$select public.staff_apply_role_preset('00000000-0000-0000-0000-00000000000c')$q$, '22023'),
    'no preset for supervisor';
  assert public.t_fails($q$select public.admin_set_user_role('00000000-0000-0000-0000-00000000000b', 'super')$q$, '22023'),
    'unknown role rejected';
  assert public.admin_invite_staff('new.sup@example.com', 'supervisor') is not null, 'invite supervisor';
  assert public.has_capability('children.edit', null, 'm1'), 'admin has everything';
end $$;

-- ===== platform manager grants a scoped supervisor =====
select public.t_act('00000000-0000-0000-0000-00000000000b');
do $$ declare c uuid := '00000000-0000-0000-0000-00000000000c'; begin
  perform public.staff_grant_capability(c, 'content.edit', 'grade', 'g3');
  perform public.staff_grant_capability(c, 'lessons.review', 'subject', 'math-g3');
  perform public.staff_grant_capability(c, 'recordings.review', 'grade', 'g3');
  perform public.staff_grant_capability(c, 'children.view', 'grade', 'g3');
  perform public.staff_grant_capability(c, 'children.edit', 'stage', 'primary');
  perform public.staff_grant_capability(c, 'schedule.manage', 'grade', 'g3');
  -- idempotent: same grant twice is one row
  perform public.staff_grant_capability(c, 'content.edit', 'grade', 'g3');
  assert (select count(*) from public.staff_permissions where user_id = c) = 6, 'six grants visible to PM';

  assert public.t_fails($q$select public.staff_grant_capability('00000000-0000-0000-0000-00000000000b','content.edit','all')$q$),
    'PM cannot grant to self';
  assert public.t_fails($q$select public.staff_grant_capability('00000000-0000-0000-0000-0000000000b2','content.edit','all')$q$),
    'PM cannot grant another PM';
  assert public.t_fails($q$select public.staff_grant_capability('00000000-0000-0000-0000-00000000000a','content.edit','all')$q$, '22023'),
    'admin takes no scoped grants';
  assert public.t_fails($q$select public.staff_grant_capability('00000000-0000-0000-0000-00000000000d','content.edit','all')$q$, '22023'),
    'teacher takes no scoped grants';
  assert public.t_fails($q$select public.staff_grant_capability('00000000-0000-0000-0000-00000000000c','families.manage','all')$q$, '22023'),
    'families.manage beyond supervisor ceiling';
  assert public.t_fails($q$select public.staff_grant_capability('00000000-0000-0000-0000-00000000000c','users.manage','all')$q$, '22023'),
    'users.manage does not exist';
  assert public.t_fails($q$select public.staff_grant_capability('00000000-0000-0000-0000-00000000000c','content.edit','stage','nowhere')$q$, '22023'),
    'unknown stage rejected';
  assert public.t_fails($q$select public.staff_apply_role_preset('00000000-0000-0000-0000-0000000000b2')$q$),
    'PM cannot apply presets';
  assert public.t_fails($q$select public.admin_set_user_role('00000000-0000-0000-0000-00000000000d','supervisor')$q$),
    'PM cannot change roles';
  assert public.t_fails($q$select public.admin_invite_staff('x@example.com','admin')$q$), 'PM cannot invite';
  assert public.t_rows('select * from public.staff_list_permissions()') = 3, 'PM lists self + 2 supervisors';
  assert public.t_rows($q$select * from public.staff_permissions where user_id = '00000000-0000-0000-0000-0000000000b2'$q$) = 0,
    'PM cannot read another PM grants';
  -- subscriptions: view only
  assert public.t_rows('select * from public.subscription_plans') = 1, 'PM reads plans';
  assert public.t_affected('update public.subscription_plans set price = 1') = 0, 'PM cannot edit plans';
  -- families
  assert public.t_rows('select * from public.parent_profiles') = 1, 'PM reads families';
  perform public.admin_update_family_profile('00000000-0000-0000-0000-00000000000f', 'ولي أمر جديد', null, null);
end $$;

-- ===== PM with narrowed own scope cannot exceed it =====
select public.t_act('00000000-0000-0000-0000-00000000000a');
select public.staff_revoke_capability(id) from public.staff_permissions
 where user_id = '00000000-0000-0000-0000-00000000000b' and capability = 'content.edit';
select public.staff_grant_capability('00000000-0000-0000-0000-00000000000b', 'content.edit', 'stage', 'primary');
select public.t_act('00000000-0000-0000-0000-00000000000b');
do $$ declare c2 uuid := '00000000-0000-0000-0000-0000000000c2'; begin
  perform public.staff_grant_capability(c2, 'content.edit', 'subject', 'math-g4'); -- inside primary
  assert public.t_fails($q$select public.staff_grant_capability('00000000-0000-0000-0000-0000000000c2','content.edit','grade','m1')$q$),
    'PM cannot grant outside own stage';
  assert public.t_fails($q$select public.staff_grant_capability('00000000-0000-0000-0000-0000000000c2','content.edit','all')$q$),
    'PM cannot widen to all';
end $$;

-- ===== scoped supervisor =====
select public.t_act('00000000-0000-0000-0000-00000000000c');
do $$ begin
  assert public.t_rows('select * from public.curriculum_lessons') = 1, 'supervisor sees only g3 lessons';
  assert public.t_affected($q$update public.curriculum_lessons set title = 'x' where id = 'L-g3'$q$) = 1, 'edit in scope';
  assert public.t_affected($q$update public.curriculum_lessons set title = 'x' where id = 'L-m1'$q$) = 0, 'no edit outside scope';
  -- guard trigger silently keeps the old subject, or RLS rejects it; either way it stays in scope.
  perform public.t_fails($q$update public.curriculum_lessons set subject_key = 'sci-m1' where id = 'L-g3'$q$);
  assert (select subject_key from public.curriculum_lessons where id = 'L-g3') = 'math-g3',
    'cannot move lesson out of scope';
  perform public.review_lesson('L-g3', true, null);
  assert public.t_fails($q$select public.review_lesson('L-g4', true, null)$q$), 'no review outside scope';
  perform public.editor_save_lesson_question(null, 'L-g3',
    '{"quiz_type":"truefalse","question":"س؟","choices":[],"answer":true}'::jsonb, 0);
  assert public.t_fails($q$select public.editor_save_lesson_question(null, 'L-m1', '{"quiz_type":"truefalse","question":"س؟","choices":[],"answer":true}'::jsonb, 0)$q$),
    'no question outside scope';

  assert public.t_rows('select * from public.children') = 2, 'children in scope only: g3 by title + g4 via primary edit';
  assert public.t_rows('select * from public.learning_records') = 1, 'progress in scope only';
  perform public.admin_update_child_profile('10000000-0000-0000-0000-000000000003', 'اسم معدل', 'g4');
  assert public.t_fails($q$select public.admin_update_child_profile('10000000-0000-0000-0000-000000000004', 'اسم', 'm1')$q$),
    'cannot move child out of scope';
  assert public.t_fails($q$select public.admin_update_child_profile('10000000-0000-0000-0000-000000000007', 'اسم', 'g3')$q$),
    'cannot edit child outside scope';
  assert public.t_affected($q$delete from public.children$q$) = 0, 'cannot delete children';
  perform public.set_exam_unlocked('10000000-0000-0000-0000-000000000004', true);
  assert public.t_fails($q$select public.set_exam_unlocked('10000000-0000-0000-0000-000000000007', true)$q$, '42501'),
    'no exam unlock outside scope';

  assert public.t_rows('select * from public.lesson_recordings') = 1, 'recordings in scope only';
  perform public.review_lesson_recording((select id from public.lesson_recordings where lesson_id = 'L-g3'), 'accepted');
  assert public.t_rows($q$select * from public.schedule_slots$q$) = 0, 'schedule follows child grade (child 3 moved to g4)';

  assert public.t_rows('select * from public.subscription_plans') = 0, 'no subscriptions';
  assert public.t_rows('select * from public.parent_profiles') = 0, 'no families';
  assert public.t_fails('insert into public.bookings default values'), 'no bookings';
  assert public.t_fails($q$select public.staff_grant_capability('00000000-0000-0000-0000-0000000000c2','content.edit','grade','g3')$q$),
    'supervisor cannot grant';
  assert public.t_fails('select * from public.staff_list_permissions()'), 'supervisor cannot list staff';
  assert public.t_rows('select * from public.my_capabilities()') = 6, 'own capabilities';
end $$;

-- ===== fresh supervisor sees nothing beyond grants =====
select public.t_act('00000000-0000-0000-0000-0000000000c2');
do $$ begin
  assert public.t_rows('select * from public.children') = 0, 'fresh supervisor: no children';
  assert public.t_rows($q$select * from public.curriculum_lessons where id in ('L-g4')$q$) = 1
     and public.t_rows($q$select * from public.curriculum_lessons where id in ('L-m1')$q$) = 0, 'fresh supervisor: math-g4 draft yes, m1 draft no';
end $$;

-- ===== revoke and role change cleanup =====
select public.t_act('00000000-0000-0000-0000-00000000000b');
do $$ begin
  perform public.staff_revoke_capability((select id from public.staff_permissions
    where user_id = '00000000-0000-0000-0000-00000000000c' and capability = 'children.view'));
  assert public.t_fails($q$select public.staff_revoke_capability((select id from public.staff_permissions
    where user_id = '00000000-0000-0000-0000-00000000000b' and capability = 'bookings.manage'))$q$),
    'PM cannot revoke own grants';
end $$;
select public.t_act('00000000-0000-0000-0000-00000000000a');
do $$ begin
  assert (select count(*) from public.staff_permission_audit
          where actor = '00000000-0000-0000-0000-00000000000b' and action in ('grant','revoke')) = 8, 'audit rows for PM';
  perform public.admin_set_user_role('00000000-0000-0000-0000-00000000000c', 'teacher');
  assert (select count(*) from public.staff_permissions where user_id = '00000000-0000-0000-0000-00000000000c') = 0,
    'role change clears grants';
  assert (select count(*) from public.staff_permission_audit where action = 'role_reset') = 5, 'role reset audited';
end $$;

-- ===== teacher / editor / parent unaffected =====
select public.t_act('00000000-0000-0000-0000-00000000000c');
do $$ begin
  assert not public.has_any_capability('content.edit'), 'demoted user lost capability';
  assert public.t_rows('select * from public.children') = 0, 'demoted user sees no children';
end $$;
select public.t_act('00000000-0000-0000-0000-00000000000e');
do $$ begin
  assert public.t_rows('select * from public.curriculum_lessons') = 3, 'content editor unchanged';
  perform public.review_lesson('L-g4', false, 'سبب');
end $$;
select public.t_act('00000000-0000-0000-0000-00000000000f');
do $$ begin
  assert public.t_rows('select * from public.children') = 3, 'parent sees own children';
  assert not public.has_capability('content.edit'), 'parent has no capability';
  assert public.t_fails('select * from public.staff_list_permissions()'), 'parent cannot list staff';
end $$;
reset role;
select 'staff scoped permissions: all assertions passed' as result;
