-- Per-slot duration (minutes). Default 60 keeps every existing slot's behaviour unchanged.
-- Writable by staff only through the existing "staff manages schedule" policy.
alter table public.schedule_slots
  add column if not exists duration_min integer not null default 60;
alter table public.schedule_slots drop constraint if exists schedule_slots_duration_range;
alter table public.schedule_slots add constraint schedule_slots_duration_range
  check (duration_min between 15 and 240);
