-- منح صلاحيات الجداول (RLS تبقى هي الحاجز الفعلي)؛ ai_tutor_spend للخادم فقط
grant select, insert, update on public.ai_tutor_consent to authenticated;
grant select on public.ai_tutor_usage to authenticated;
grant select on public.ai_tutor_messages to authenticated;
grant all on public.ai_tutor_consent, public.ai_tutor_usage, public.ai_tutor_spend, public.ai_tutor_messages to service_role;
revoke all on public.ai_tutor_spend from anon, authenticated;
revoke all on public.ai_tutor_consent, public.ai_tutor_usage, public.ai_tutor_messages from anon;
