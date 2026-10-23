-- Fahem production foundation: Supabase/PostgreSQL
create extension if not exists pgcrypto;

create table if not exists public.parent_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  whatsapp text,
  country_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.parent_profiles(id) on delete cascade,
  name text not null,
  grade text not null,
  track text,
  avatar text,
  created_at timestamptz not null default now(),
  unique (parent_id, name)
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.parent_profiles(id) on delete set null,
  parent_name text not null,
  whatsapp text not null,
  country_code text not null,
  child_name text not null,
  grade text not null,
  status text not null default 'new' check (status in ('new', 'contacted', 'scheduled', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.learning_records (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  lesson_id text not null,
  status text not null default 'started' check (status in ('started', 'completed')),
  score numeric,
  updated_at timestamptz not null default now(),
  unique (child_id, lesson_id)
);

create table if not exists public.curriculum_lessons (
  id text primary key,
  subject_key text not null,
  title text not null,
  grade text not null,
  description text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lesson_assets (
  id uuid primary key default gen_random_uuid(),
  lesson_id text not null references public.curriculum_lessons(id) on delete cascade,
  asset_type text not null check (asset_type in ('pdf', 'video', 'image', 'audio')),
  storage_path text not null,
  title text,
  created_at timestamptz not null default now()
);

alter table public.parent_profiles enable row level security;
alter table public.children enable row level security;
alter table public.bookings enable row level security;
alter table public.learning_records enable row level security;
alter table public.curriculum_lessons enable row level security;
alter table public.lesson_assets enable row level security;

create policy "parents own profile" on public.parent_profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "parents own children" on public.children
  for all using (auth.uid() = parent_id) with check (auth.uid() = parent_id);

create policy "parents own learning records" on public.learning_records
  for all using (exists (select 1 from public.children c where c.id = child_id and c.parent_id = auth.uid()))
  with check (exists (select 1 from public.children c where c.id = child_id and c.parent_id = auth.uid()));

create policy "published lessons are readable" on public.curriculum_lessons
  for select using (published = true or auth.role() = 'authenticated');

create policy "lesson assets follow lesson visibility" on public.lesson_assets
  for select using (exists (select 1 from public.curriculum_lessons l where l.id = lesson_id and (l.published = true or auth.role() = 'authenticated')));

insert into storage.buckets (id, name, public)
values ('lesson-files', 'lesson-files', false), ('lesson-videos', 'lesson-videos', false)
on conflict (id) do nothing;

create policy "authenticated users can read lesson files" on storage.objects
  for select to authenticated using (bucket_id in ('lesson-files', 'lesson-videos'));

create policy "authenticated users can upload lesson files" on storage.objects
  for insert to authenticated with check (bucket_id in ('lesson-files', 'lesson-videos'));

-- Public booking submissions are intentionally restricted to a server-side API.
-- This initial public form policy validates shape; add Edge Function rate limiting before paid acquisition.
create policy "public can submit booking" on public.bookings
  for insert to anon, authenticated
  with check (length(trim(parent_name)) between 2 and 100
    and length(trim(child_name)) between 2 and 80
    and length(trim(whatsapp)) between 6 and 40
    and length(trim(grade)) between 2 and 100
    and length(trim(country_code)) between 2 and 40);
