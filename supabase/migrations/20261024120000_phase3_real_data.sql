-- Phase 3: real data layer
-- 1) curriculum_subjects  2) lesson content/order columns  3) exam_attempts
-- 4) API role GRANTS (fix: tables existed with RLS policies but anon/authenticated
--    had zero table privileges => every REST call returned 42501)

-- 1) Subjects (order + presentation metadata drive the child space "today list")
create table if not exists public.curriculum_subjects (
  key text primary key,
  title text not null,
  icon text,
  color text,
  badge text,
  grade text,
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.curriculum_subjects enable row level security;

drop policy if exists "published subjects are readable" on public.curriculum_subjects;
create policy "published subjects are readable" on public.curriculum_subjects
  for select using (published = true or public.is_staff());

drop policy if exists "staff manages subjects" on public.curriculum_subjects;
create policy "staff manages subjects" on public.curriculum_subjects
  for all using (public.is_staff()) with check (public.is_staff());

-- 2) Lessons: ordering + full structured content (video chapters, parent guide, quiz...)
alter table public.curriculum_lessons
  add column if not exists sort_order integer not null default 0,
  add column if not exists content jsonb,
  add column if not exists updated_at timestamptz not null default now();

-- 3) Embassy exam simulator attempts (per authenticated parent account)
create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  child_key text,
  child_name text,
  total_questions integer not null,
  attempted_count integer not null default 0,
  correct_count integer not null default 0,
  percentage numeric not null,
  band text,
  answers jsonb,
  created_at timestamptz not null default now()
);

alter table public.exam_attempts enable row level security;

drop policy if exists "parents insert own exam attempts" on public.exam_attempts;
create policy "parents insert own exam attempts" on public.exam_attempts
  for insert to authenticated with check (parent_id = auth.uid());

drop policy if exists "parents read own exam attempts" on public.exam_attempts;
create policy "parents read own exam attempts" on public.exam_attempts
  for select using (parent_id = auth.uid() or public.is_admin());

-- 3b) Weekly schedule slots (child-space "today plan"; subjectId + lessonRef='next' resolved client-side by lesson order)
create table if not exists public.schedule_slots (
  id text primary key,
  day integer not null check (day between 0 and 6),
  time text not null,
  subject_id text not null,
  lesson_ref text not null default 'next',
  slot_type text not null default 'lesson' check (slot_type in ('lesson', 'review', 'live')),
  created_at timestamptz not null default now()
);

alter table public.schedule_slots enable row level security;

drop policy if exists "schedule is public" on public.schedule_slots;
create policy "schedule is public" on public.schedule_slots
  for select using (true);

drop policy if exists "staff manages schedule" on public.schedule_slots;
create policy "staff manages schedule" on public.schedule_slots
  for all using (public.is_staff()) with check (public.is_staff());

-- 4) GRANTS — least privilege per role (RLS still filters rows on top of these)
grant usage on schema public to anon, authenticated;

-- Public visitors: submit a booking (no read-back), read published curriculum
grant insert on public.bookings to anon;
grant select on public.curriculum_subjects to anon;
grant select on public.curriculum_lessons to anon;
grant select on public.lesson_assets to anon;
grant select on public.schedule_slots to anon;

-- Authenticated (parents; staff gated by RLS is_staff/is_admin)
grant insert, select, update, delete on public.bookings to authenticated;
grant select, insert, update, delete on public.curriculum_subjects to authenticated;
grant select, insert, update, delete on public.curriculum_lessons to authenticated;
grant select, insert, update, delete on public.lesson_assets to authenticated;
grant select, insert, update on public.parent_profiles to authenticated;
grant select, insert, update, delete on public.children to authenticated;
grant select, insert, update on public.learning_records to authenticated;
grant select, insert on public.exam_attempts to authenticated;
grant select, insert, update, delete on public.schedule_slots to authenticated;

-- public trial-booking form must work for visitors (RLS insert policy "public can submit booking" already exists)
grant insert on public.bookings to anon;
grant insert on public.bookings to authenticated;

-- learning_records upsert needs delete? no — upsert = insert on conflict update. covered.
