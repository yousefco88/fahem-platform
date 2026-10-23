-- Curriculum CMS: grades table, content_editor role, media columns, storage bucket
-- Phase 1 of curriculum management system

-- ============================================================================
-- 1) GRADES TABLE (المراحل/الصفوف)
-- ============================================================================
create table if not exists public.grades (
  id text primary key,                    -- e.g. 'g1', 'g2', 'kg1'
  title text not null,                    -- e.g. 'الصف الأول الابتدائي'
  stage text not null default 'primary',  -- 'kg', 'primary', 'preparatory', 'secondary'
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.grades enable row level security;

-- Everyone can read published grades
create policy "published grades are readable" on public.grades
  for select using (published = true or public.is_staff());

-- Staff can manage grades
create policy "staff manages grades" on public.grades
  for all using (public.is_staff()) with check (public.is_staff());

grant select on public.grades to anon;
grant select, insert, update, delete on public.grades to authenticated;

-- Seed primary grades (1-6)
insert into public.grades (id, title, stage, sort_order) values
  ('g1', 'الصف الأول الابتدائي', 'primary', 1),
  ('g2', 'الصف الثاني الابتدائي', 'primary', 2),
  ('g3', 'الصف الثالث الابتدائي', 'primary', 3),
  ('g4', 'الصف الرابع الابتدائي', 'primary', 4),
  ('g5', 'الصف الخامس الابتدائي', 'primary', 5),
  ('g6', 'الصف السادس الابتدائي', 'primary', 6)
on conflict (id) do nothing;

-- ============================================================================
-- 2) ADD grade_id TO SUBJECTS (link to grades table)
-- ============================================================================
alter table public.curriculum_subjects
  add column if not exists grade_id text references public.grades(id) on delete set null;

-- Migrate existing subjects to grade 1
update public.curriculum_subjects
  set grade_id = 'g1'
  where grade_id is null;

-- ============================================================================
-- 3) ADD MEDIA COLUMNS TO LESSONS
-- ============================================================================
alter table public.curriculum_lessons
  add column if not exists published boolean not null default true,
  add column if not exists video_url text,           -- external URL (YouTube/Vimeo) or storage path
  add column if not exists video_type text default 'link' check (video_type in ('link', 'upload')),
  add column if not exists pdf_url text,             -- storage path or external URL
  add column if not exists pdf_type text default 'link' check (pdf_type in ('link', 'upload'));

-- Update RLS policy for lessons to respect published flag
drop policy if exists "published lessons are readable" on public.curriculum_lessons;
create policy "published lessons are readable" on public.curriculum_lessons
  for select using (
    published = true 
    or public.is_staff()
    or exists (
      select 1 from public.curriculum_subjects s
      where s.key = curriculum_lessons.subject_key
        and (s.published = true or public.is_staff())
    )
  );

-- ============================================================================
-- 4) CONTENT_EDITOR ROLE
-- ============================================================================
-- Update is_staff() to include content_editor
create or replace function public.is_staff()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('admin', 'teacher', 'content_editor')
  )
$$;

-- Create is_content_editor() helper
create or replace function public.is_content_editor()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('admin', 'content_editor')
  )
$$;

-- ============================================================================
-- 5) STORAGE BUCKET FOR CURRICULUM MEDIA
-- ============================================================================
-- Note: Storage bucket creation via SQL is limited; this creates the metadata
-- The actual bucket should be created via Supabase dashboard or Management API

-- Create a table to track uploaded media (optional, for admin panel)
create table if not exists public.curriculum_media (
  id uuid primary key default gen_random_uuid(),
  lesson_id text references public.curriculum_lessons(id) on delete cascade,
  media_type text not null check (media_type in ('video', 'pdf', 'image')),
  storage_path text not null,
  original_name text,
  size_bytes bigint,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.curriculum_media enable row level security;

create policy "staff manages media" on public.curriculum_media
  for all using (public.is_staff()) with check (public.is_staff());

create policy "authenticated can view media" on public.curriculum_media
  for select using (auth.role() = 'authenticated');

grant select on public.curriculum_media to authenticated;
grant select, insert, update, delete on public.curriculum_media to authenticated;

-- ============================================================================
-- 6) INDEXES FOR PERFORMANCE
-- ============================================================================
create index if not exists idx_subjects_grade on public.curriculum_subjects(grade_id);
create index if not exists idx_lessons_published on public.curriculum_lessons(published);
create index if not exists idx_media_lesson on public.curriculum_media(lesson_id);

-- ============================================================================
-- 7) UPDATED_AT TRIGGERS
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists grades_updated_at on public.grades;
create trigger grades_updated_at
  before update on public.grades
  for each row execute function public.set_updated_at();

drop trigger if exists subjects_updated_at on public.curriculum_subjects;
create trigger subjects_updated_at
  before update on public.curriculum_subjects
  for each row execute function public.set_updated_at();

drop trigger if exists lessons_updated_at on public.curriculum_lessons;
create trigger lessons_updated_at
  before update on public.curriculum_lessons
  for each row execute function public.set_updated_at();
