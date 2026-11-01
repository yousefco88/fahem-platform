\set ON_ERROR_STOP on
select pg_get_serial_sequence('public.legacy_lesson_attempts', 'lesson_id');
do $$
declare v jsonb; b boolean;
begin
 if (select count(*) from public.legacy_lesson_answers) <> 6 then raise exception 'backfill row count'; end if;
 if (select quiz_answer from public.legacy_lesson_answers where lesson_id='lesson1') <> '0'::jsonb then raise exception 'zero-index answer'; end if;
 if (select quiz_answer from public.legacy_lesson_answers where lesson_id='lesson2') <> '1'::jsonb then raise exception 'boolean option answer'; end if;
 if (select quiz_answer from public.legacy_lesson_answers where lesson_id='truefalse') <> 'false'::jsonb then raise exception 'boolean answer'; end if;
 if (select quiz_answer from public.legacy_lesson_answers where lesson_id='lesson3') <> '0'::jsonb then raise exception 'option answer'; end if;
 if (select builder_order from public.legacy_lesson_answers where lesson_id='lesson2') <> '[2,1]'::jsonb then raise exception 'numeric builder'; end if;
 if (select builder_order from public.legacy_lesson_answers where lesson_id='lesson1') <> '["Y","X"]'::jsonb then raise exception 'string builder'; end if;
 if (select builder_target_word from public.legacy_lesson_answers where lesson_id='lesson1') <> 'YX' then raise exception 'private builder target'; end if;
 if exists (select 1 from public.curriculum_lessons l where l.content <> public.strip_legacy_answer_keys(l.content)) then raise exception 'content still contains keys'; end if;
 if has_table_privilege('authenticated','public.legacy_lesson_answers','SELECT')
    or has_table_privilege('anon','public.legacy_lesson_answers','SELECT')
    or has_table_privilege('authenticated','public.legacy_lesson_attempts','SELECT') then raise exception 'private table ACL'; end if;
 if has_function_privilege('anon','public.editor_get_legacy_lesson_answers(text)','EXECUTE')
    or has_function_privilege('anon','public.submit_legacy_lesson_answer(text,uuid,text,jsonb)','EXECUTE') then raise exception 'anon RPC ACL'; end if;
 begin
   update public.curriculum_lessons set content = '{"nested":{"correctOrder":["X"]}}' where id='lesson1';
   raise exception 'trigger allowed reintroduction';
 exception when sqlstate '22023' then null; end;
end $$;
-- Defense in depth: a mistaken SELECT grant still yields no rows via RLS.
grant select on public.legacy_lesson_answers, public.legacy_lesson_attempts to authenticated;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
do $$ begin
 if (select count(*) from public.legacy_lesson_answers) <> 0 then raise exception 'RLS exposed answer rows'; end if;
 if (select count(*) from public.legacy_lesson_attempts) <> 0 then raise exception 'RLS exposed attempts'; end if;
end $$;
do $$ begin
 begin
   perform public.submit_legacy_lesson_answer('lesson1','00000000-0000-0000-0000-000000000010','quiz','0');
   raise exception 'cross-parent succeeded';
 exception when sqlstate '42501' then null; end;
 begin
   perform public.editor_get_legacy_lesson_answers('lesson1');
   raise exception 'parent read private answers';
 exception when sqlstate '42501' then null; end;
 begin
   perform public.editor_save_legacy_lesson_answers('lesson1','{}', '1', null, null, '{}');
   raise exception 'parent edited private answers';
 exception when sqlstate '42501' then null; end;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
do $$ begin
 if public.submit_legacy_lesson_answer('lesson1','00000000-0000-0000-0000-000000000010','quiz','0') is distinct from true then raise exception 'correct quiz'; end if;
 begin
   perform public.submit_legacy_lesson_answer('lesson1','00000000-0000-0000-0000-000000000010','quiz','1');
   raise exception 'second guess succeeded';
 exception when sqlstate '22023' then null; end;
 if public.submit_legacy_lesson_answer('truefalse','00000000-0000-0000-0000-000000000010','quiz','false') is distinct from true then raise exception 'boolean quiz'; end if;
 if public.submit_legacy_lesson_answer('lesson1','00000000-0000-0000-0000-000000000010','builder','["X","Y"]') is distinct from false then raise exception 'wrong builder'; end if;
 if public.submit_legacy_lesson_answer('lesson2','00000000-0000-0000-0000-000000000010','builder','["C","B"]') is distinct from true then raise exception 'numeric builder indices must grade visible syllables'; end if;
 begin
   perform public.submit_legacy_lesson_answer('lesson1','00000000-0000-0000-0000-000000000010','builder','["Y","X"]');
   raise exception 'second builder guess succeeded';
 exception when sqlstate '22023' then null; end;
end $$;
reset role;
revoke select on public.legacy_lesson_answers, public.legacy_lesson_attempts from authenticated;
update public.curriculum_lessons set published = false where id='lesson2';
set role authenticated;
do $$ begin
 begin
   perform public.submit_legacy_lesson_answer('lesson2','00000000-0000-0000-0000-000000000010','quiz','1');
   raise exception 'unpublished answer succeeded';
 exception when sqlstate 'P0002' then null; end;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
do $$ declare v jsonb; begin
 v := public.editor_get_legacy_lesson_answers('lesson1');
 if v->'answer' <> '0'::jsonb then raise exception 'editor private read'; end if;
 if v->>'targetWord' <> 'YX' then raise exception 'editor private target'; end if;
 perform public.editor_save_legacy_lesson_answers('lesson1', '{"choices":["A","B"],"question":"?"}', '1', '["X","Y"]', 'XY',
   '{"title":"Edited","subject_key":"math","sort_order":1,"published":true,"video_type":"link","pdf_type":"link"}');
 if (select content from public.curriculum_lessons where id='lesson1') ? 'answer' then raise exception 'editor wrote public key'; end if;
 if (public.editor_get_legacy_lesson_answers('lesson1')->'answer') <> '1'::jsonb then raise exception 'editor failed private write'; end if;
 if (public.editor_get_legacy_lesson_answers('lesson1')->>'targetWord') <> 'XY' then raise exception 'editor lost private target'; end if;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000004';
do $$ begin
 if (public.editor_get_legacy_lesson_answers('teacher-draft')->'answer') <> '1'::jsonb then raise exception 'teacher draft read'; end if;
 perform public.editor_save_legacy_lesson_answers('teacher-draft','{"question":"New"}','0',null,null,
   '{"title":"New","subject_key":"math","sort_order":4,"published":true,"video_type":"link","pdf_type":"link"}');
 if (select published from public.curriculum_lessons where id='teacher-draft') then raise exception 'teacher published draft'; end if;
 begin
   perform public.editor_save_legacy_lesson_answers('teacher-other','{"question":"New"}','0',null,null,
     '{"title":"New","subject_key":"math","sort_order":6,"published":false}');
   raise exception 'teacher moved unassigned lesson into assigned subject';
 exception when insufficient_privilege then null;
 end;
 begin
   perform public.editor_save_legacy_lesson_answers('teacher-draft','{"question":"New"}','0',null,null,
     '{"title":"New","subject_key":"unassigned","sort_order":4,"published":false}');
   raise exception 'teacher moved lesson to unassigned subject';
 exception when sqlstate '42501' then null; end;
 begin
   perform public.editor_get_legacy_lesson_answers('lesson1');
   raise exception 'teacher read approved lesson answers';
 exception when sqlstate '42501' then null; end;
end $$;
reset role;
-- Simulate many children under one parent; the server must cap the account, not each child.
insert into public.children (id, parent_id)
 select ('00000000-0000-0000-0000-' || lpad(i::text,12,'0'))::uuid,
        '00000000-0000-0000-0000-000000000001'::uuid from generate_series(100,119) i;
insert into public.legacy_lesson_attempts (lesson_id, parent_id, child_id, kind, is_correct)
 select l.lesson_id, c.parent_id, c.id, k.kind, false
 from public.children c
 cross join (values ('lesson1'),('lesson2')) l(lesson_id)
 cross join (values ('quiz'),('builder')) k(kind)
 where c.id not in ('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000011')
 limit 76;
do $$ begin
 if (select count(*) from public.legacy_lesson_attempts where parent_id = '00000000-0000-0000-0000-000000000001') <> 80 then raise exception 'rate fixture must have 80 attempts'; end if;
end $$;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
do $$ begin
 begin
   perform public.submit_legacy_lesson_answer('lesson3','00000000-0000-0000-0000-000000000010','quiz','0');
   raise exception 'account-wide rate limit bypassed';
 exception when sqlstate '22023' then null; end;
end $$;
reset role;
select 'PASS: migration, ACL, RLS, grading, edits, trigger, rate limit' as result;
