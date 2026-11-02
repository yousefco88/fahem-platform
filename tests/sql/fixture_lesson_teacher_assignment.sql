-- Reduced reproduction of the curriculum/teacher model before 20261108100000.
-- Synthetic records only; no hosted database or customer data.
\set ON_ERROR_STOP on
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create table public.profiles (id uuid primary key references auth.users(id), role text not null);
create function public.is_content_editor() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'content_editor'))
$$;
create function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;
create function public.is_teacher() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
$$;
create table public.curriculum_subjects (key text primary key, published boolean not null);
create table public.curriculum_lessons (
  id text primary key, subject_key text not null references public.curriculum_subjects(key),
  title text, published boolean not null default false, review_status text not null default 'approved',
  created_by uuid, review_note text, reviewed_by uuid, reviewed_at timestamptz,
  archived boolean not null default false, content jsonb not null default '{}'
);
create table public.teacher_subjects (
  teacher_id uuid not null references auth.users(id) on delete cascade,
  subject_key text not null references public.curriculum_subjects(key) on delete cascade,
  primary key (teacher_id, subject_key)
);
create function public.teacher_has_subject(p_key text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.teacher_subjects where teacher_id = auth.uid() and subject_key = p_key)
$$;
create table public.lesson_assets (id serial primary key, lesson_id text references public.curriculum_lessons(id), url text);
create table public.lesson_questions (id uuid primary key default gen_random_uuid(), lesson_id text, sort_order int default 0);
create table public.lesson_question_attempts (question_id uuid);
create table public.legacy_lesson_answers (lesson_id text primary key, quiz_answer jsonb, builder_order jsonb, builder_target_word text);
create function public.strip_legacy_answer_keys(p jsonb) returns jsonb language sql immutable as $$ select p $$;

alter table public.curriculum_lessons enable row level security;
alter table public.teacher_subjects enable row level security;
alter table public.lesson_assets enable row level security;
create policy "admin manages teacher subjects" on public.teacher_subjects
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "teacher reads own subjects" on public.teacher_subjects
  for select to authenticated using (teacher_id = auth.uid());
create policy "lessons readable" on public.curriculum_lessons for select using (
  (published = true and review_status = 'approved' and exists (
    select 1 from public.curriculum_subjects s where s.key = curriculum_lessons.subject_key and s.published = true))
  or public.is_content_editor() or (auth.uid() is not null and created_by = auth.uid()));
create policy "managers manage lessons" on public.curriculum_lessons
  for all to authenticated using (public.is_content_editor()) with check (public.is_content_editor());
create policy "teacher edits own unlocked lessons" on public.curriculum_lessons for update to authenticated
  using (public.is_teacher() and created_by = auth.uid() and review_status in ('draft','rejected'))
  with check (public.is_teacher() and created_by = auth.uid() and published = false
    and review_status in ('draft','submitted','rejected') and public.teacher_has_subject(subject_key));
create policy "managers manage lesson assets" on public.lesson_assets
  for all to authenticated using (public.is_content_editor()) with check (public.is_content_editor());

-- Stub replaced by the migration under test (the real one ships in 20261028100000).
create function public.guard_teacher_lesson_write() returns trigger language plpgsql as $$ begin return new; end $$;
create trigger guard_teacher_lesson_write before insert or update on public.curriculum_lessons
  for each row execute function public.guard_teacher_lesson_write();

grant usage on schema public, auth to anon, authenticated;
grant select on auth.users to authenticated;
grant select, insert, update, delete on public.curriculum_lessons, public.teacher_subjects, public.lesson_assets to authenticated;
grant select on public.curriculum_lessons, public.curriculum_subjects to anon;
grant select on public.curriculum_subjects, public.profiles to authenticated;
grant usage on sequence public.lesson_assets_id_seq to authenticated;

-- t1 = assigned teacher, t2 = other teacher, a = admin, p = parent
insert into auth.users values
  ('00000000-0000-0000-0000-0000000000a1'), ('00000000-0000-0000-0000-0000000000a2'),
  ('00000000-0000-0000-0000-0000000000ad'), ('00000000-0000-0000-0000-0000000000ae');
insert into public.profiles values
  ('00000000-0000-0000-0000-0000000000a1', 'teacher'), ('00000000-0000-0000-0000-0000000000a2', 'teacher'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin'), ('00000000-0000-0000-0000-0000000000ae', 'parent');
insert into public.curriculum_subjects values ('arabic', true), ('math', true);
insert into public.teacher_subjects values
  ('00000000-0000-0000-0000-0000000000a1', 'arabic'), ('00000000-0000-0000-0000-0000000000a2', 'arabic');
insert into public.curriculum_lessons (id, subject_key, title, published, review_status) values
  ('L-draft', 'arabic', 'غير منشور', false, 'approved'),
  ('L-pub', 'arabic', 'منشور', true, 'approved'),
  ('L-math', 'math', 'رياضيات', false, 'approved');
