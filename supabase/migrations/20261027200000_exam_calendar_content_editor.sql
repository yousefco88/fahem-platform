-- محرر المحتوى يدير أجندة الامتحانات فقط من إعدادات الموقع (قرار يوسف 2026-10-27)
-- السياسة مقيدة بالمفتاح examCalendar حصراً — لا وصول كتابة لبقية الإعدادات
-- (الأسعار/الخطط/SEO تبقى للأدمن وحده عبر سياسة 20261027180000).
create policy "content editor manages exam calendar" on public.site_settings
  for all to authenticated
  using (public.current_role_fahem() = 'content_editor' and key = 'examCalendar')
  with check (public.current_role_fahem() = 'content_editor' and key = 'examCalendar');
