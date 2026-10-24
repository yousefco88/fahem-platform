-- Teacher ↔ student assignments + teacher-owned schedule slots.
-- Privacy: children are minors. A teacher sees ONLY children an admin explicitly assigned.
-- Teachers get read-only access; only admins create/remove assignments.

create table if not exists public.teacher_students (
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  assigned_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (teacher_id, child_id)
);
create index if not exists teacher_students_child_idx on public.teacher_students(child_id);

alter table public.teacher_students enable row level security;

drop policy if exists "teacher reads own assignments" on public.teacher_students;
create policy "teacher reads own assignments" on public.teacher_students
  for select using (teacher_id = auth.uid() or public.is_admin());

drop policy if exists "admin manages assignments" on public.teacher_students;
create policy "admin manages assignments" on public.teacher_students
  for all using (public.is_admin()) with check (public.is_admin());

grant select on public.teacher_students to authenticated;
grant insert, delete on public.teacher_students to authenticated; -- RLS: admin only

-- Assigned teachers (and admins) can READ the child + learning records. No write.
drop policy if exists "assigned teacher reads child" on public.children;
create policy "assigned teacher reads child" on public.children
  for select using (
    public.is_admin()
    or exists (select 1 from public.teacher_students ts where ts.child_id = children.id and ts.teacher_id = auth.uid())
  );

drop policy if exists "assigned teacher reads records" on public.learning_records;
create policy "assigned teacher reads records" on public.learning_records
  for select using (
    public.is_admin()
    or exists (select 1 from public.teacher_students ts where ts.child_id = learning_records.child_id and ts.teacher_id = auth.uid())
  );

-- Teacher owns slots (nullable: existing slots stay unowned/shared).
alter table public.schedule_slots
  add column if not exists teacher_id uuid references public.profiles(id) on delete set null;
create index if not exists schedule_slots_teacher_idx on public.schedule_slots(teacher_id);

-- Teachers can list the teacher roster names only for admins (profiles policy already admin-read).
