-- Fixture for ledger tests: builds on fixture_subscription_catalog.sql (roles, auth, profiles,
-- curriculum_subjects, is_admin). Adds children, schedule_slots and the identities used below.
\set ON_ERROR_STOP on
create table public.children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references auth.users(id),
  name text not null
);
create table public.schedule_slots (
  id text primary key,
  child_id uuid not null references public.children(id),
  teacher_id uuid references public.profiles(id),
  subject_id text not null,
  slot_type text not null default 'live',
  duration_min integer not null default 60
);
grant select on public.children, public.schedule_slots to authenticated;
alter table public.children enable row level security;
create policy "parents read own children" on public.children for select to authenticated
  using (parent_id = auth.uid() or public.is_admin());

insert into auth.users (id) values
  ('00000000-0000-0000-0000-000000000003'),  -- teacher
  ('00000000-0000-0000-0000-000000000004');  -- second parent
insert into public.profiles (id, role) values
  ('00000000-0000-0000-0000-000000000003', 'teacher'),
  ('00000000-0000-0000-0000-000000000004', 'parent');

insert into public.children (id, parent_id, name) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Child A (parent 2)'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', 'Child B (parent 4)');

insert into public.schedule_slots (id, child_id, teacher_id, subject_id) values
  ('slot-a-eng', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'english'),
  ('slot-a-math', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'math'),
  ('slot-b-eng', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'english');
