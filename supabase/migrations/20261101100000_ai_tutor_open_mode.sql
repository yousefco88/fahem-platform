-- وضع تجربة: يعطّل قيود المحتوى في برومبت المساعد (الضوابط الصلبة تبقى). الافتراضي مغلق.
alter table public.ai_tutor_settings add column if not exists open_mode boolean not null default false;
