\set ON_ERROR_STOP on
create role anon nologin;
create role authenticated nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create table public.children (id uuid primary key, parent_id uuid not null);
create table public.curriculum_lessons (
 id text primary key, title text, subject_key text, sort_order integer,
 published boolean not null default true, review_status text not null default 'approved',
 archived boolean not null default false, created_by uuid,
 content jsonb, video_url text, video_type text, pdf_url text, pdf_type text
);
create function public.is_content_editor() returns boolean language sql stable as $$
 select auth.uid() = '00000000-0000-0000-0000-000000000003'::uuid
$$;
create function public.is_teacher() returns boolean language sql stable as $$
 select auth.uid() = '00000000-0000-0000-0000-000000000004'::uuid
$$;
create function public.teacher_has_subject(p_key text) returns boolean language sql stable as $$
 select auth.uid() = '00000000-0000-0000-0000-000000000004'::uuid and p_key = 'math'
$$;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant select on public.curriculum_lessons to anon, authenticated;
insert into public.children values
 ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001'),
 ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000002');
insert into public.curriculum_lessons (id,title,subject_key,sort_order,content) values
 ('lesson1','Test','math',1,'{"question":"?","choices":["A","B"],"answer":0,"wordBuilder":{"syllables":["X","Y"],"correctOrder":["Y","X"],"targetWord":"YX"}}'),
 ('lesson2','Test','math',2,'{"options":[{"text":"A","correct":false},{"text":"B","correct":true}],"interactiveBuilder":{"syllables":["A","B","C"],"correctOrder":[2,1]}}'),
 ('lesson3','Test','math',3,'{"options":[{"text":"A","correct":true},{"text":"B","correct":false}]}'),
 ('truefalse','Test','math',5,'{"question":"?","quizType":"truefalse","answer":false}');
insert into public.curriculum_lessons (id,title,subject_key,sort_order,published,review_status,created_by,content)
 values ('teacher-draft','Draft','math',4,false,'draft','00000000-0000-0000-0000-000000000004','{"question":"?","answer":1}'),
 ('teacher-other','Draft','unassigned',6,false,'draft','00000000-0000-0000-0000-000000000004','{"question":"?","answer":0}');
