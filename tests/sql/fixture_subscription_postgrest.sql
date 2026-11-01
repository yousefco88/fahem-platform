-- Synthetic two-family fixture for local PostgREST/RLS tests only.
\set ON_ERROR_STOP on
-- PostgREST 16 exposes the JSON claims GUC; the SQL-only fixture uses the legacy sub GUC.
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
    current_setting('request.jwt.claims', true)::jsonb ->> 'sub'), '')::uuid
$$;
insert into auth.users (id) values
  ('00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000004');
insert into public.profiles (id, role) values
  ('00000000-0000-0000-0000-000000000003', 'parent'),
  ('00000000-0000-0000-0000-000000000004', 'content_editor');
create function public.is_content_editor() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role_fahem() in ('admin', 'content_editor'), false)
$$;
create function public.is_staff() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role_fahem() in ('admin', 'content_editor'), false)
$$;
create table public.children (id uuid primary key, parent_id uuid not null references auth.users(id));
create table public.lesson_questions (id uuid primary key);
create table public.curriculum_lessons (id text primary key, created_by uuid references auth.users(id));
create table public.grades (id uuid primary key, published boolean not null default false);
insert into public.children values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003');
insert into public.lesson_questions values ('20000000-0000-0000-0000-000000000001');
insert into public.curriculum_lessons values ('lesson', '00000000-0000-0000-0000-000000000004');
