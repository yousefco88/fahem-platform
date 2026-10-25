-- إعدادات الموقع العامة (الأسعار والباقات والنصوص) تُعدَّل بواسطة المدير فقط.
-- السياسة السابقة كانت is_staff() فتسمح للمعلم ومحرر المحتوى بالكتابة رغم إخفاء الواجهة.
drop policy if exists "staff manages site settings" on public.site_settings;
create policy "admin manages site settings" on public.site_settings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
