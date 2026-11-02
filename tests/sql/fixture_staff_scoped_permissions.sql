-- Reduced reproduction of the production model before 20261110100000 (columns verified against
-- production catalog 2026-11-03). Synthetic records only; no hosted database or customer data.
\set ON_ERROR_STOP on
create role anon nologin;
create role authenticated nologin;
create schema auth;
create schema storage;
create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)]
$$;
alter table storage.objects enable row level security;
grant usage on schema storage, auth to authenticated;
grant select, insert, delete on storage.objects to authenticated;
grant execute on function storage.foldername(text) to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'parent', full_name text, updated_at timestamptz default now(),
  constraint profiles_role_check check (role in ('parent', 'teacher', 'admin', 'content_editor'))
);
create table public.staff_invites (
  id uuid primary key default gen_random_uuid(), email text not null, role text not null,
  invited_by uuid, status text not null default 'pending', accepted_by uuid,
  expires_at timestamptz not null default now() + interval '7 days',
  constraint staff_invites_role_check check (role in ('teacher', 'content_editor', 'admin')),
  constraint staff_invites_status_check check (status in ('pending', 'accepted', 'cancelled'))
);
create function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') $$;
create function public.is_content_editor() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'content_editor')) $$;
create function public.is_teacher() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher') $$;
create function public.is_staff() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'teacher', 'content_editor')) $$;

create table public.grades (id text primary key, stage text not null, title text not null, sort_order int not null);
create table public.curriculum_subjects (
  key text primary key, grade text, grade_id text references public.grades(id), published boolean not null default true);
create table public.curriculum_lessons (
  id text primary key, subject_key text not null references public.curriculum_subjects(key),
  title text, sort_order int default 0, published boolean not null default false,
  review_status text not null default 'approved', created_by uuid, assigned_teacher_id uuid,
  review_note text, reviewed_by uuid, reviewed_at timestamptz, archived boolean not null default false,
  content jsonb not null default '{}', video_url text, video_type text, pdf_url text, pdf_type text,
  updated_at timestamptz default now());
create table public.teacher_subjects (
  teacher_id uuid not null references auth.users(id) on delete cascade,
  subject_key text not null references public.curriculum_subjects(key) on delete cascade,
  primary key (teacher_id, subject_key));
create function public.teacher_has_subject(p_key text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.teacher_subjects where teacher_id = auth.uid() and subject_key = p_key) $$;
create function public.teacher_can_edit_lesson(p_lesson_id text) returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select public.is_teacher() and exists (select 1 from public.curriculum_lessons l where l.id = p_lesson_id
    and (l.created_by = auth.uid() or l.assigned_teacher_id = auth.uid())
    and l.review_status in ('draft','rejected') and public.teacher_has_subject(l.subject_key)) $$;
create table public.lesson_questions (
  id uuid primary key default gen_random_uuid(), lesson_id text, quiz_type text, question text,
  choices jsonb, answer jsonb, skill text, difficulty text, celebration text, sort_order int default 0,
  is_published boolean default true, created_by uuid);
create table public.lesson_assets (id serial primary key, lesson_id text, url text);
create table public.curriculum_media (id serial primary key, lesson_id text, url text);
create table public.lesson_question_attempts (id serial primary key, question_id uuid, lesson_id text, child_id uuid);
create table public.legacy_lesson_answers (lesson_id text primary key, quiz_answer jsonb, builder_order jsonb, builder_target_word text);
create function public.strip_legacy_answer_keys(p jsonb) returns jsonb language sql immutable as $$ select p $$;
create table public.lesson_recordings (
  id uuid primary key default gen_random_uuid(), lesson_id text, storage_path text,
  status text not null default 'review', reviewed_by uuid, reviewed_at timestamptz);

create table public.children (
  id uuid primary key default gen_random_uuid(), parent_id uuid, name text, grade text,
  exam_unlocked boolean default false, exam_unlocked_by uuid, exam_unlocked_at timestamptz);
create table public.teacher_students (teacher_id uuid, child_id uuid, primary key (teacher_id, child_id));
create table public.learning_records (id serial primary key, child_id uuid);
create table public.child_streaks (child_id uuid primary key);
create table public.child_daily_activity (id serial primary key, child_id uuid);
create table public.exam_attempts (id serial primary key, child_id uuid);
create table public.live_join_log (id serial primary key, child_id uuid);
create table public.schedule_slots (id text primary key, child_id uuid, teacher_id uuid, meeting_url text);
create table public.bookings (id serial primary key);
create table public.parent_profiles (id uuid primary key, full_name text, whatsapp text, country_code text, updated_at timestamptz);
create table public.site_settings (key text primary key, value jsonb);
create table public.activity_log (id serial primary key);
create table public.subscription_plans (id serial primary key, price numeric);
create table public.subscription_plan_subjects (plan_id int);
create table public.subscription_plan_audit (id serial primary key);
create table public.child_subscription_contracts (id serial primary key);
create table public.child_subscription_subjects (contract_id int);
create table public.subscription_hour_ledger (id serial primary key);

-- Baseline production-like policies (admin/editor/parent paths) for the tables under test.
do $$ declare t text; begin
  foreach t in array array['profiles','staff_invites','grades','curriculum_subjects','curriculum_lessons','teacher_subjects',
    'lesson_questions','lesson_assets','curriculum_media','lesson_question_attempts','legacy_lesson_answers','lesson_recordings',
    'children','teacher_students','learning_records','child_streaks','child_daily_activity','exam_attempts','live_join_log',
    'schedule_slots','bookings','parent_profiles','site_settings','activity_log','subscription_plans','subscription_plan_subjects',
    'subscription_plan_audit','child_subscription_contracts','child_subscription_subjects','subscription_hour_ledger'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy "admin all %s" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t, t);
  end loop;
end $$;
grant usage, select on all sequences in schema public to authenticated;
create policy "own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "grades readable" on public.grades for select using (true);
create policy "subjects published" on public.curriculum_subjects for select using (published);
create policy "lessons readable" on public.curriculum_lessons for select using (
  (published and review_status = 'approved') or public.is_content_editor() or created_by = auth.uid());
create policy "managers manage lessons" on public.curriculum_lessons for all to authenticated
  using (public.is_content_editor()) with check (public.is_content_editor());
create policy "parent children" on public.children for select to authenticated using (parent_id = auth.uid());
create policy "teacher own students" on public.children for select to authenticated using (
  exists (select 1 from public.teacher_students ts where ts.child_id = children.id and ts.teacher_id = auth.uid()));

create function public.guard_teacher_lesson_write() returns trigger language plpgsql as $$ begin return new; end $$;
create trigger guard_teacher_lesson_write before insert or update on public.curriculum_lessons
  for each row execute function public.guard_teacher_lesson_write();

-- Functions replaced by the migration (stub signatures as in production).
create function public.review_lesson(p_id text, p_approve boolean, p_note text default null) returns void language plpgsql as $$ begin end $$;
create function public.review_lesson_recording(p_id uuid, p_status text) returns void language plpgsql as $$ begin end $$;
create function public.admin_update_child_profile(p_child_id uuid, p_name text, p_grade text) returns void language plpgsql as $$ begin end $$;
create function public.set_exam_unlocked(p_child_id uuid, p_unlocked boolean) returns void language plpgsql as $$ begin end $$;
create function public.set_slot_meeting_url(p_slot_id text, p_url text) returns void language plpgsql as $$ begin end $$;
create function public.admin_update_family_profile(p_parent_id uuid, p_full_name text, p_whatsapp text, p_country_code text) returns void language plpgsql as $$ begin end $$;
create function public.admin_set_user_role(p_user uuid, p_role text) returns void language plpgsql as $$ begin end $$;
create function public.admin_invite_staff(p_email text, p_role text default 'teacher') returns uuid language plpgsql as $$ begin return null; end $$;

-- Synthetic data -------------------------------------------------------------
insert into public.grades values
  ('g1','primary','الصف الأول الابتدائي',1), ('g3','primary','الصف الثالث الابتدائي',3),
  ('g4','primary','الصف الرابع الابتدائي',4), ('m1','middle','الصف الأول المتوسط',7);
insert into public.curriculum_subjects values
  ('math-g3','الصف الثالث','g3',true), ('arabic-g3','الصف الثالث','g3',true),
  ('math-g4','الصف الرابع','g4',true), ('sci-m1','أول متوسط','m1',true);
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), -- admin
  ('00000000-0000-0000-0000-0000000000a2'), -- second admin
  ('00000000-0000-0000-0000-00000000000b'), -- platform manager
  ('00000000-0000-0000-0000-0000000000b2'), -- second platform manager
  ('00000000-0000-0000-0000-00000000000c'), -- supervisor (scoped)
  ('00000000-0000-0000-0000-0000000000c2'), -- supervisor (fresh, no grants)
  ('00000000-0000-0000-0000-00000000000d'), -- teacher
  ('00000000-0000-0000-0000-00000000000e'), -- content editor
  ('00000000-0000-0000-0000-00000000000f'); -- parent
insert into public.profiles (id, role, full_name) values
  ('00000000-0000-0000-0000-00000000000a','admin','مدير'),
  ('00000000-0000-0000-0000-0000000000a2','admin','مدير 2'),
  ('00000000-0000-0000-0000-00000000000b','teacher','مدير منصة'),
  ('00000000-0000-0000-0000-0000000000b2','teacher','مدير منصة 2'),
  ('00000000-0000-0000-0000-00000000000c','teacher','مشرف'),
  ('00000000-0000-0000-0000-0000000000c2','teacher','مشرف جديد'),
  ('00000000-0000-0000-0000-00000000000d','teacher','معلم'),
  ('00000000-0000-0000-0000-00000000000e','content_editor','محرر'),
  ('00000000-0000-0000-0000-00000000000f','parent','ولي أمر');
insert into public.curriculum_lessons (id, subject_key, title, review_status, published) values
  ('L-g3','math-g3','درس ثالث','submitted',false), ('L-g4','math-g4','درس رابع','submitted',false),
  ('L-m1','sci-m1','درس متوسط','submitted',false);
insert into public.children (id, parent_id, name, grade) values
  ('10000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-00000000000f','طفل ثالث','الصف الثالث الابتدائي'),
  ('10000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-00000000000f','طفل رابع','g4'),
  ('10000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-00000000000f','طفل متوسط','m1');
insert into public.learning_records (child_id) values
  ('10000000-0000-0000-0000-000000000003'), ('10000000-0000-0000-0000-000000000007');
insert into public.lesson_recordings (lesson_id, storage_path) values ('L-g3','d/a.webm'), ('L-m1','d/b.webm');
insert into public.schedule_slots values ('S3','10000000-0000-0000-0000-000000000003',null,null),
  ('S7','10000000-0000-0000-0000-000000000007',null,null);
insert into public.parent_profiles values ('00000000-0000-0000-0000-00000000000f','ولي أمر','0500000000','SA',now());
insert into public.subscription_plans (price) values (100);
