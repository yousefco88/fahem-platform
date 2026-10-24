-- =====================================================
-- Child Streaks System
-- Tracks daily activity streaks for gamification
-- =====================================================

-- Table: child_streaks
-- Stores the current streak and best streak for each child
create table if not exists public.child_streaks (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  current_streak integer not null default 0,
  best_streak integer not null default 0,
  last_activity_date date,
  xp_total integer not null default 0,
  level integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (child_id)
);

-- Table: child_daily_activity
-- Logs daily activity to calculate streaks
create table if not exists public.child_daily_activity (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  activity_date date not null default current_date,
  lessons_completed integer not null default 0,
  xp_earned integer not null default 0,
  created_at timestamptz not null default now(),
  unique (child_id, activity_date)
);

-- Enable RLS
alter table public.child_streaks enable row level security;
alter table public.child_daily_activity enable row level security;

-- RLS Policies: Parents can read/write their children's streaks
create policy "parents own child streaks" on public.child_streaks
  for all using (exists (
    select 1 from public.children c 
    where c.id = child_id and c.parent_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.children c 
    where c.id = child_id and c.parent_id = auth.uid()
  ));

create policy "parents own child daily activity" on public.child_daily_activity
  for all using (exists (
    select 1 from public.children c 
    where c.id = child_id and c.parent_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.children c 
    where c.id = child_id and c.parent_id = auth.uid()
  ));

-- Admin policies
create policy "admin reads child streaks" on public.child_streaks
  for select using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('admin', 'super_admin'))
  );

create policy "admin reads child daily activity" on public.child_daily_activity
  for select using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('admin', 'super_admin'))
  );

-- Function: update_streak_on_activity
-- Called when a child completes a lesson to update their streak
create or replace function public.update_child_streak(p_child_id uuid, p_xp_earned integer default 10)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_streak record;
  v_today date := current_date;
  v_yesterday date := current_date - 1;
  v_new_streak integer;
  v_new_xp integer;
  v_new_level integer;
begin
  -- Get or create streak record
  insert into public.child_streaks (child_id, current_streak, best_streak, last_activity_date, xp_total, level)
  values (p_child_id, 0, 0, null, 0, 1)
  on conflict (child_id) do nothing;

  select * into v_streak from public.child_streaks where child_id = p_child_id for update;

  -- Calculate new streak
  if v_streak.last_activity_date = v_today then
    -- Already active today, just add XP
    v_new_streak := v_streak.current_streak;
  elsif v_streak.last_activity_date = v_yesterday then
    -- Continue the streak!
    v_new_streak := v_streak.current_streak + 1;
  else
    -- Streak broken, start fresh
    v_new_streak := 1;
  end if;

  -- Calculate XP and level
  v_new_xp := v_streak.xp_total + p_xp_earned;
  v_new_level := greatest(1, floor(v_new_xp / 100) + 1);

  -- Update streak record
  update public.child_streaks
  set 
    current_streak = v_new_streak,
    best_streak = greatest(best_streak, v_new_streak),
    last_activity_date = v_today,
    xp_total = v_new_xp,
    level = v_new_level,
    updated_at = now()
  where child_id = p_child_id;

  -- Log daily activity
  insert into public.child_daily_activity (child_id, activity_date, lessons_completed, xp_earned)
  values (p_child_id, v_today, 1, p_xp_earned)
  on conflict (child_id, activity_date) do update
  set 
    lessons_completed = child_daily_activity.lessons_completed + 1,
    xp_earned = child_daily_activity.xp_earned + p_xp_earned;

  return jsonb_build_object(
    'streak', v_new_streak,
    'best_streak', greatest(v_streak.best_streak, v_new_streak),
    'xp_total', v_new_xp,
    'level', v_new_level,
    'xp_earned', p_xp_earned
  );
end;
$$;

-- Grant execute to authenticated users
grant execute on function public.update_child_streak(uuid, integer) to authenticated;

-- Grant table access
grant select, insert, update on public.child_streaks to authenticated;
grant select, insert, update on public.child_daily_activity to authenticated;

-- Index for performance
create index if not exists idx_child_streaks_child_id on public.child_streaks(child_id);
create index if not exists idx_child_daily_activity_child_date on public.child_daily_activity(child_id, activity_date);

comment on table public.child_streaks is 'Gamification: tracks daily learning streaks and XP for each child';
comment on table public.child_daily_activity is 'Daily activity log for streak calculation';
comment on function public.update_child_streak is 'Call when child completes a lesson to update streak and award XP';
