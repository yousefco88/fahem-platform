\set ON_ERROR_STOP on
insert into public.curriculum_lessons (id, title, subject_key, sort_order, content)
values ('ambiguous', 'Ambiguous', 'math', 99,
  '{"options":[{"text":"A","correct":true},{"text":"B","correct":true}]}');
