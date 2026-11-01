-- Reduced reproduction of the lesson SELECT policy from 20261028090000.
-- Synthetic records only; no hosted database or customer data.
\set ON_ERROR_STOP on
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table public.profiles (id uuid primary key, role text not null);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create function public.is_content_editor() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'content_editor'))
$$;
create table public.curriculum_subjects (key text primary key, published boolean not null);
create table public.curriculum_lessons (
  id text primary key, subject_key text not null references public.curriculum_subjects(key),
  published boolean not null, review_status text not null, created_by uuid,
  content jsonb
);
insert into public.profiles values
  ('00000000-0000-0000-0000-000000000001', 'teacher'),
  ('00000000-0000-0000-0000-000000000002', 'admin'),
  ('00000000-0000-0000-0000-000000000003', 'parent');
insert into public.curriculum_subjects values ('visible', true), ('hidden', false);
insert into public.curriculum_lessons values
  ('public', 'visible', true, 'approved', null, '{"answer":1}'),
  ('draft', 'visible', false, 'approved', null, '{"answer":2}'),
  ('pending', 'visible', false, 'submitted', '00000000-0000-0000-0000-000000000001', '{"answer":3}'),
  ('hidden-subject', 'hidden', true, 'approved', null, '{"answer":4}');
alter table public.curriculum_lessons enable row level security;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid(), public.is_content_editor() to anon, authenticated;
grant select on public.curriculum_lessons, public.curriculum_subjects to anon, authenticated;
create policy "lessons readable" on public.curriculum_lessons for select using (
  (review_status = 'approved' and (
    published = true
    or exists (select 1 from public.curriculum_subjects s
      where s.key = curriculum_lessons.subject_key and s.published = true)))
  or public.is_content_editor()
  or created_by = auth.uid()
);
