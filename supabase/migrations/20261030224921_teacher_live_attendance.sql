-- Teacher-confirmed actual attendance for manual live meetings.
-- This records attendance evidence only; it does not create subscriptions or debit hours.
-- Apply to a hosted database only after separate review and explicit authorization.

create table public.teacher_live_attendance (
  id uuid primary key default gen_random_uuid(),
  slot_id text not null references public.schedule_slots(id) on delete restrict,
  session_date date not null,
  child_id uuid not null references public.children(id) on delete restrict,
  teacher_id uuid not null references public.profiles(id) on delete restrict,
  attended boolean not null,
  actual_minutes integer not null,
  recorded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slot_id, session_date),
  constraint teacher_live_attendance_minutes_check check (
    (attended and actual_minutes between 1 and 1440)
    or (not attended and actual_minutes = 0)
  )
);

create index teacher_live_attendance_child_date_idx
  on public.teacher_live_attendance(child_id, session_date desc);

create table public.teacher_live_attendance_audit (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references public.teacher_live_attendance(id) on delete restrict,
  actor_id uuid not null references auth.users(id) on delete restrict,
  old_attended boolean,
  old_actual_minutes integer,
  new_attended boolean not null,
  new_actual_minutes integer not null,
  created_at timestamptz not null default now()
);

create index teacher_live_attendance_audit_entry_idx
  on public.teacher_live_attendance_audit(attendance_id, created_at desc);

alter table public.teacher_live_attendance enable row level security;
alter table public.teacher_live_attendance_audit enable row level security;

create policy "assigned teachers and admins read live attendance"
  on public.teacher_live_attendance for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.schedule_slots s
      where s.id = teacher_live_attendance.slot_id
        and s.child_id = teacher_live_attendance.child_id
        and s.teacher_id = auth.uid()
    )
  );

create policy "assigned teachers and admins read attendance audit"
  on public.teacher_live_attendance_audit for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.teacher_live_attendance a
      join public.schedule_slots s on s.id = a.slot_id and s.child_id = a.child_id
      where a.id = teacher_live_attendance_audit.attendance_id
        and s.teacher_id = auth.uid()
    )
  );

revoke all on table public.teacher_live_attendance, public.teacher_live_attendance_audit
  from public, anon, authenticated;
grant select on public.teacher_live_attendance, public.teacher_live_attendance_audit to authenticated;

create or replace function public.record_teacher_live_attendance(
  p_slot_id text,
  p_session_date date,
  p_attended boolean,
  p_actual_minutes integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_child_id uuid;
  v_teacher_id uuid;
  v_slot_type text;
  v_existing public.teacher_live_attendance%rowtype;
  v_saved public.teacher_live_attendance%rowtype;
  v_old_attended boolean;
  v_old_minutes integer;
begin
  if v_actor is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_session_date is null or p_session_date > (now() at time zone 'Africa/Cairo')::date then
    raise exception 'session date must not be in the future' using errcode = '22023';
  end if;
  if p_attended is null or p_actual_minutes is null
     or (p_attended and p_actual_minutes not between 1 and 1440)
     or (not p_attended and p_actual_minutes <> 0) then
    raise exception 'attendance and actual minutes are inconsistent' using errcode = '22023';
  end if;

  select s.child_id, s.teacher_id, s.slot_type
    into v_child_id, v_teacher_id, v_slot_type
    from public.schedule_slots s
    where s.id = p_slot_id
    for update;

  if not found or v_slot_type <> 'live' then
    raise exception 'live schedule slot not found' using errcode = '22023';
  end if;
  if v_teacher_id is distinct from v_actor
     or not exists (select 1 from public.profiles p where p.id = v_actor and p.role = 'teacher') then
    raise exception 'only the assigned teacher may confirm attendance' using errcode = '42501';
  end if;

  select * into v_existing
    from public.teacher_live_attendance a
    where a.slot_id = p_slot_id and a.session_date = p_session_date
    for update;

  if found then
    if v_existing.child_id <> v_child_id or v_existing.teacher_id <> v_teacher_id then
      raise exception 'schedule assignment changed after attendance was recorded' using errcode = '23514';
    end if;
    v_old_attended := v_existing.attended;
    v_old_minutes := v_existing.actual_minutes;
    update public.teacher_live_attendance
      set attended = p_attended,
          actual_minutes = p_actual_minutes,
          recorded_by = v_actor,
          updated_at = now()
      where id = v_existing.id
      returning * into v_saved;
  else
    v_old_attended := null;
    v_old_minutes := null;
    insert into public.teacher_live_attendance (
      slot_id, session_date, child_id, teacher_id, attended, actual_minutes, recorded_by
    ) values (
      p_slot_id, p_session_date, v_child_id, v_teacher_id, p_attended, p_actual_minutes, v_actor
    ) returning * into v_saved;
  end if;

  insert into public.teacher_live_attendance_audit (
    attendance_id, actor_id, old_attended, old_actual_minutes, new_attended, new_actual_minutes
  ) values (
    v_saved.id, v_actor, v_old_attended, v_old_minutes, v_saved.attended, v_saved.actual_minutes
  );

  return jsonb_build_object(
    'id', v_saved.id,
    'slot_id', v_saved.slot_id,
    'session_date', v_saved.session_date,
    'child_id', v_saved.child_id,
    'attended', v_saved.attended,
    'actual_minutes', v_saved.actual_minutes,
    'updated_at', v_saved.updated_at
  );
end;
$$;

revoke all on function public.record_teacher_live_attendance(text, date, boolean, integer)
  from public, anon;
grant execute on function public.record_teacher_live_attendance(text, date, boolean, integer)
  to authenticated;
