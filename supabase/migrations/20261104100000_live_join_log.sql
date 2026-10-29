-- تسجيل انضمام الطفل للحصص (حضور فعلي = ضغط زر الانضمام). مرة واحدة لكل طفل/حصة/يوم.
create table if not exists public.live_join_log (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  parent_id uuid not null references auth.users(id) on delete cascade,
  slot_id text not null,
  slot_start timestamptz,
  joined_at timestamptz not null default now(),
  joined_date date not null default (now() at time zone 'utc')::date,
  unique (child_id, slot_id, joined_date)
);
create index if not exists live_join_log_child_idx on public.live_join_log(child_id, joined_at desc);
alter table public.live_join_log enable row level security;

drop policy if exists "parent inserts own child join" on public.live_join_log;
create policy "parent inserts own child join" on public.live_join_log
  for insert to authenticated
  with check (parent_id = auth.uid() and exists (select 1 from public.children c where c.id = child_id and c.parent_id = auth.uid()));

drop policy if exists "parent reads own child joins" on public.live_join_log;
create policy "parent reads own child joins" on public.live_join_log
  for select to authenticated using (parent_id = auth.uid() or public.is_staff());

grant select, insert on public.live_join_log to authenticated;
