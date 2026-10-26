-- مساعد التدريب بالذكاء الاصطناعي: موافقة ولي الأمر + حد يومي + سقف شهري + سجل المحادثات
-- مغلق افتراضياً؛ لا شيء يُستدعى بدون موافقة صريحة من ولي الأمر.
-- القيم المعتمدة: حد 50 رسالة/طفل/يوم، سقف شهري 20 دولار (2000 سنت).

create table if not exists public.ai_tutor_consent (
  child_id uuid primary key references public.children(id) on delete cascade,
  enabled boolean not null default false,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_tutor_usage (
  child_id uuid not null references public.children(id) on delete cascade,
  day date not null,
  messages int not null default 0,
  primary key (child_id, day)
);

create table if not exists public.ai_tutor_spend (
  month text primary key,               -- YYYY-MM
  cost_micro_usd bigint not null default 0
);

create table if not exists public.ai_tutor_messages (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null check (char_length(content) <= 4000),
  created_at timestamptz not null default now()
);
create index if not exists ai_tutor_messages_child_idx on public.ai_tutor_messages (child_id, created_at desc);

alter table public.ai_tutor_consent enable row level security;
alter table public.ai_tutor_usage enable row level security;
alter table public.ai_tutor_spend enable row level security;
alter table public.ai_tutor_messages enable row level security;

-- ولي الأمر فقط يقرأ/يغيّر موافقة أبنائه
drop policy if exists "parent manages ai consent" on public.ai_tutor_consent;
create policy "parent manages ai consent" on public.ai_tutor_consent
  for all to authenticated
  using (exists (select 1 from public.children c where c.id = child_id and c.parent_id = auth.uid()))
  with check (exists (select 1 from public.children c where c.id = child_id and c.parent_id = auth.uid()));

-- ولي الأمر يقرأ سجل محادثات أبنائه (قراءة فقط)؛ الكتابة من الخادم فقط
drop policy if exists "parent reads ai messages" on public.ai_tutor_messages;
create policy "parent reads ai messages" on public.ai_tutor_messages
  for select to authenticated
  using (exists (select 1 from public.children c where c.id = child_id and c.parent_id = auth.uid()));

drop policy if exists "parent reads ai usage" on public.ai_tutor_usage;
create policy "parent reads ai usage" on public.ai_tutor_usage
  for select to authenticated
  using (exists (select 1 from public.children c where c.id = child_id and c.parent_id = auth.uid()));
-- ai_tutor_spend: بلا سياسات = مغلق على الجميع عدا service_role

-- حجز رسالة: يتحقق من الملكية والموافقة والحد اليومي والسقف الشهري ذرياً
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
  c_daily_limit constant int := 50;
  c_monthly_cap_micro constant bigint := 20000000; -- 20 USD
begin
  if auth.uid() is null then return 'unauthenticated'; end if;
  if not exists (select 1 from public.children where id = p_child and parent_id = auth.uid()) then
    return 'forbidden';
  end if;
  select enabled into v_enabled from public.ai_tutor_consent where child_id = p_child;
  if coalesce(v_enabled, false) = false then return 'consent_required'; end if;

  select cost_micro_usd into v_spend from public.ai_tutor_spend where month = to_char(now(), 'YYYY-MM');
  if coalesce(v_spend, 0) >= c_monthly_cap_micro then return 'budget_exhausted'; end if;

  insert into public.ai_tutor_usage (child_id, day, messages)
  values (p_child, current_date, 1)
  on conflict (child_id, day) do update set messages = public.ai_tutor_usage.messages + 1
  returning messages into v_count;
  if v_count > c_daily_limit then return 'daily_limit'; end if;
  return 'ok';
end $$;

-- تسجيل الرسالة والتكلفة: service_role فقط (تُستدعى من Edge Function)
create or replace function public.ai_tutor_record(p_child uuid, p_user text, p_reply text, p_cost_micro bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ai_tutor_messages (child_id, role, content)
  values (p_child, 'user', left(p_user, 4000)), (p_child, 'assistant', left(p_reply, 4000));
  insert into public.ai_tutor_spend (month, cost_micro_usd)
  values (to_char(now(), 'YYYY-MM'), greatest(p_cost_micro, 0))
  on conflict (month) do update set cost_micro_usd = public.ai_tutor_spend.cost_micro_usd + greatest(p_cost_micro, 0);
end $$;

revoke all on function public.ai_tutor_reserve(uuid) from public, anon;
grant execute on function public.ai_tutor_reserve(uuid) to authenticated;
revoke all on function public.ai_tutor_record(uuid, text, text, bigint) from public, anon, authenticated;
grant execute on function public.ai_tutor_record(uuid, text, text, bigint) to service_role;
