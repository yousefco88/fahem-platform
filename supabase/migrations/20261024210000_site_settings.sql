-- site_settings: إعدادات الموقع القابلة للتعديل من لوحة الإدارة
-- (الهيدر، الهيرو، الفوتر، الباقات، SEO) — قراءة عامة، كتابة للطاقم فقط

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

-- الجميع يقرأ (محتوى عام للموقع)
create policy "site settings are publicly readable" on public.site_settings
  for select using (true);

-- الطاقم فقط يكتب
create policy "staff manages site settings" on public.site_settings
  for all using (public.is_staff()) with check (public.is_staff());

-- تحديث updated_at تلقائياً
create or replace function public.touch_site_settings()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists site_settings_touch on public.site_settings;
create trigger site_settings_touch
  before update on public.site_settings
  for each row execute function public.touch_site_settings();
