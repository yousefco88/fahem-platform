-- مساعد التدريب: إعدادات الإدارة + مراجعة المعلمين للمحادثات + تصحيحات تُغذّي التعليمات
-- جداول جديدة فقط؛ أما ai_tutor_reserve فتُحدَّث (أُنشئت في هذه الموجة) لتقرأ الإعدادات.

-- 1) إعدادات (صف واحد) — الإدارة فقط
create table if not exists public.ai_tutor_settings (
  id int primary key default 1 check (id = 1),
  enabled boolean not null default true,
  daily_limit int not null default 50 check (daily_limit between 5 and 200),
  extra_instructions text not null default '' check (char_length(extra_instructions) <= 1500),
  model text check (model is null or (char_length(model) <= 120 and model ~ '^[A-Za-z0-9._/-]+$')),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
insert into public.ai_tutor_settings (id) values (1) on conflict (id) do nothing;
alter table public.ai_tutor_settings enable row level security;

drop policy if exists "admin reads ai settings" on public.ai_tutor_settings;
create policy "admin reads ai settings" on public.ai_tutor_settings
  for select to authenticated using (public.is_admin());
drop policy if exists "admin updates ai settings" on public.ai_tutor_settings;
create policy "admin updates ai settings" on public.ai_tutor_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- 2) تصحيحات المعلمين (تُكتب عبر دالة فقط)
create table if not exists public.ai_tutor_corrections (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null unique references public.ai_tutor_messages(id) on delete cascade,
  question text not null,
  reply text not null,
  verdict text not null check (verdict in ('correct','wrong')),
  correction text check (correction is null or char_length(correction) <= 600),
  reviewer uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check (verdict = 'correct' or (correction is not null and char_length(btrim(correction)) > 0))
);
alter table public.ai_tutor_corrections enable row level security;
drop policy if exists "reviewer or admin reads corrections" on public.ai_tutor_corrections;
create policy "reviewer or admin reads corrections" on public.ai_tutor_corrections
  for select to authenticated using (reviewer = auth.uid() or public.is_admin());

-- 3) المعلم المُسنَد إليه الطفل والإدارة يقرؤون محادثاته (إضافة لسياسة ولي الأمر)
drop policy if exists "teacher or admin reads ai messages" on public.ai_tutor_messages;
create policy "teacher or admin reads ai messages" on public.ai_tutor_messages
  for select to authenticated using (
    public.is_admin()
    or exists (select 1 from public.teacher_students ts where ts.child_id = ai_tutor_messages.child_id and ts.teacher_id = auth.uid())
  );

-- 4) مراجعة رسالة: صحيحة/خاطئة + تصحيح
create or replace function public.ai_tutor_review_message(p_message uuid, p_verdict text, p_correction text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.ai_tutor_messages;
  v_question text;
begin
  if auth.uid() is null then raise exception 'unauthenticated'; end if;
  if p_verdict not in ('correct','wrong') then raise exception 'bad_verdict'; end if;
  select * into m from public.ai_tutor_messages where id = p_message and role = 'assistant';
  if not found then raise exception 'message_not_found'; end if;
  if not (public.is_admin() or exists (
    select 1 from public.teacher_students ts where ts.child_id = m.child_id and ts.teacher_id = auth.uid()
  )) then raise exception 'forbidden'; end if;
  if p_verdict = 'wrong' and (p_correction is null or char_length(btrim(p_correction)) = 0) then
    raise exception 'correction_required';
  end if;
  select content into v_question from public.ai_tutor_messages
    where child_id = m.child_id and role = 'user' and created_at = m.created_at limit 1;
  insert into public.ai_tutor_corrections (message_id, question, reply, verdict, correction, reviewer)
  values (m.id, left(coalesce(v_question, ''), 500), left(m.content, 1000), p_verdict,
          case when p_verdict = 'wrong' then left(btrim(p_correction), 600) else null end, auth.uid())
  on conflict (message_id) do update
    set verdict = excluded.verdict, correction = excluded.correction,
        reviewer = excluded.reviewer, created_at = now();
end $$;
revoke all on function public.ai_tutor_review_message(uuid, text, text) from public, anon;
grant execute on function public.ai_tutor_review_message(uuid, text, text) to authenticated;

-- 5) الحجز يقرأ الإعدادات (تفعيل عام + حد يومي)
create or replace function public.ai_tutor_reserve(p_child uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enabled boolean;
  v_count int;
  v_spend bigint;
  v_global boolean;
  v_limit int;
  c_monthly_cap_micro constant bigint := 20000000;
begin
  if auth.uid() is null then return 'unauthenticated'; end if;
  if not exists (select 1 from public.children where id = p_child and parent_id = auth.uid()) then
    return 'forbidden';
  end if;
  select enabled, daily_limit into v_global, v_limit from public.ai_tutor_settings where id = 1;
  if coalesce(v_global, true) = false then return 'tutor_disabled'; end if;
  v_limit := coalesce(v_limit, 50);
  select enabled into v_enabled from public.ai_tutor_consent where child_id = p_child;
  if coalesce(v_enabled, false) = false then return 'consent_required'; end if;

  select cost_micro_usd into v_spend from public.ai_tutor_spend where month = to_char(now(), 'YYYY-MM');
  if coalesce(v_spend, 0) >= c_monthly_cap_micro then return 'budget_exhausted'; end if;

  insert into public.ai_tutor_usage (child_id, day, messages)
  values (p_child, current_date, 1)
  on conflict (child_id, day) do update set messages = public.ai_tutor_usage.messages + 1
  returning messages into v_count;
  if v_count > v_limit then return 'daily_limit'; end if;
  return 'ok';
end $$;
revoke all on function public.ai_tutor_reserve(uuid) from public, anon;
grant execute on function public.ai_tutor_reserve(uuid) to authenticated;

-- 6) صلاحيات الجداول (الجداول الجديدة بلا صلاحيات افتراضية)
revoke all on public.ai_tutor_settings, public.ai_tutor_corrections from anon;
grant select, update on public.ai_tutor_settings to authenticated;
grant select on public.ai_tutor_corrections to authenticated;
grant select on public.ai_tutor_settings, public.ai_tutor_corrections to service_role;
