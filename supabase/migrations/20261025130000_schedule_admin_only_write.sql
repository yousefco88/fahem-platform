-- إصلاح: السياسة السابقة منحت المعلم ومحرر المحتوى قراءة وكتابة كل الجداول (is_staff).
-- التصميم: الإدارة وحدها تكتب الجدول؛ المعلم يقرأ حصصه ويضع الرابط عبر set_slot_meeting_url فقط.
drop policy if exists "staff manages schedule" on public.schedule_slots;
create policy "admin manages schedule" on public.schedule_slots
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
