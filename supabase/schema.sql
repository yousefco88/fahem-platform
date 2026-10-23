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

alter table public.parent_profiles enable row level security;
alter table public.children enable row level security;
alter table public.bookings enable row level security;
alter table public.learning_records enable row level security;

create policy "parents own profile" on public.parent_profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "parents own children" on public.children
  for all using (auth.uid() = parent_id) with check (auth.uid() = parent_id);

create policy "parents own learning records" on public.learning_records
  for all using (exists (select 1 from public.children c where c.id = child_id and c.parent_id = auth.uid()))
  with check (exists (select 1 from public.children c where c.id = child_id and c.parent_id = auth.uid()));

-- Public booking submissions are intentionally restricted to a server-side API.
-- Do not expose an anonymous INSERT policy until abuse protection/rate limiting is configured.
