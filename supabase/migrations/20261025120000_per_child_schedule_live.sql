-- Per-child schedule + teacher-provided live meeting link + parent timezone.
-- schedule_slots was empty at apply time (0 rows), so child_id can be NOT NULL.
-- Privacy: the public-read policy is removed; meeting_url must never be world-readable.

alter table public.schedule_slots
  add column if not exists child_id uuid references public.children(id) on delete cascade,
  add column if not exists meeting_url text;
alter table public.schedule_slots alter column child_id set not null;
create index if not exists schedule_slots_child_idx on public.schedule_slots(child_id);

alter table public.schedule_slots drop constraint if exists schedule_slots_meeting_url_https;
alter table public.schedule_slots add constraint schedule_slots_meeting_url_https
  check (meeting_url is null or meeting_url ~* '^https://[^\s]+$');

drop policy if exists "schedule is public" on public.schedule_slots;

drop policy if exists "parent reads child schedule" on public.schedule_slots;
create policy "parent reads child schedule" on public.schedule_slots for select using (
  exists (select 1 from public.children c where c.id = schedule_slots.child_id and c.parent_id = auth.uid())
);

drop policy if exists "teacher reads assigned schedule" on public.schedule_slots;
create policy "teacher reads assigned schedule" on public.schedule_slots for select using (
  teacher_id = auth.uid()
  or exists (select 1 from public.teacher_students ts where ts.child_id = schedule_slots.child_id and ts.teacher_id = auth.uid())
);
-- "staff manages schedule" (ALL, is_staff()) is kept.

-- Teacher sets the link ONLY for slots assigned to them (admin: any). No other column is writable.
create or replace function public.set_slot_meeting_url(p_slot_id text, p_url text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_url is not null and btrim(p_url) <> '' and p_url !~* '^https://[^\s]+$' then
    raise exception 'invalid url' using errcode = '22023';
  end if;
  if not (public.is_admin() or exists (select 1 from public.schedule_slots s where s.id = p_slot_id and s.teacher_id = auth.uid())) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.schedule_slots set meeting_url = nullif(btrim(p_url), '') where id = p_slot_id;
end;
$$;
revoke execute on function public.set_slot_meeting_url(text, text) from public, anon;
grant execute on function public.set_slot_meeting_url(text, text) to authenticated;

-- Parent timezone (slot times are authored in the platform timezone: Africa/Cairo).
alter table public.parent_profiles add column if not exists timezone text;
alter table public.parent_profiles drop constraint if exists parent_profiles_timezone_len;
alter table public.parent_profiles add constraint parent_profiles_timezone_len
  check (timezone is null or char_length(timezone) between 3 and 64);
