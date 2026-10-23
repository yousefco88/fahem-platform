-- Phase 1: profiles with roles + role-aware RLS
-- Apply via Supabase SQL Editor or `supabase db push` (new migration — never edit old ones).

-- 1) Profiles table (one row per auth user) with role
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'parent' check (role in ('parent', 'teacher', 'admin')),
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 2) Auto-create a profile on signup (default role: parent)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3) Role helper functions (security definer so RLS policies can use them safely)
create or replace function public.current_role_fahem()
returns text
language sql
stable
security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce(public.current_role_fahem() = 'admin', false);
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce(public.current_role_fahem() in ('teacher', 'admin'), false);
$$;

-- 4) Profiles policies: self read/update; admin reads all.
--    Role escalation blocked via column-level grants (users can only update full_name).
drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "admin updates roles" on public.profiles;
create policy "admin updates roles" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

revoke update on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;

-- 5) Staff/admin access to operational tables
-- Bookings: admins see and manage everything (public insert policy already exists).
drop policy if exists "admin reads bookings" on public.bookings;
create policy "admin reads bookings" on public.bookings
  for select using (public.is_admin());

drop policy if exists "admin updates bookings" on public.bookings;
create policy "admin updates bookings" on public.bookings
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin deletes bookings" on public.bookings;
create policy "admin deletes bookings" on public.bookings
  for delete using (public.is_admin());

-- Curriculum: staff (teacher/admin) manage lessons & assets; public read stays as-is.
drop policy if exists "staff manages lessons" on public.curriculum_lessons;
create policy "staff manages lessons" on public.curriculum_lessons
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "staff manages lesson assets" on public.lesson_assets;
create policy "staff manages lesson assets" on public.lesson_assets
  for all using (public.is_staff()) with check (public.is_staff());

-- Admin visibility over families (support/ops) — parents keep their own-row policies.
drop policy if exists "admin reads parent profiles" on public.parent_profiles;
create policy "admin reads parent profiles" on public.parent_profiles
  for select using (public.is_admin());

drop policy if exists "admin reads children" on public.children;
create policy "admin reads children" on public.children
  for select using (public.is_admin());

drop policy if exists "admin reads learning records" on public.learning_records;
create policy "admin reads learning records" on public.learning_records
  for select using (public.is_admin());

-- 6) Tighten published-lessons read: anonymous sees published only
drop policy if exists "published lessons are readable" on public.curriculum_lessons;
create policy "published lessons are readable" on public.curriculum_lessons
  for select using (published = true or public.is_staff());

drop policy if exists "lesson assets follow lesson visibility" on public.lesson_assets;
create policy "lesson assets follow lesson visibility" on public.lesson_assets
  for select using (exists (
    select 1 from public.curriculum_lessons l
    where l.id = lesson_id and (l.published = true or public.is_staff())
  ));

-- 7) Storage upload restricted to staff (was: any authenticated)
drop policy if exists "authenticated users can upload lesson files" on storage.objects;
create policy "staff can upload lesson files" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('lesson-files', 'lesson-videos') and public.is_staff());

-- NOTE (manual, one-time): after يوسف signs up with his email, promote him:
--   update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'YOUR_EMAIL');
