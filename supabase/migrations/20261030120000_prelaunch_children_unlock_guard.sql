-- ما قبل الإطلاق: ولي الأمر لا يفتح محاكي الامتحان لابنه بنفسه.
-- كانت صلاحية UPDATE على كامل جدول children لكل مسجّل؛ نقصرها على الأعمدة
-- التي يعدّلها ولي الأمر فعلاً. فتح المحاكي يبقى عبر set_exam_unlocked (security definer).
revoke update on public.children from authenticated;
grant update (name, grade, track, avatar) on public.children to authenticated;
-- upsert المزامنة يمرّر parent_id؛ سياسة RLS تفرض parent_id = auth.uid()
grant update (parent_id) on public.children to authenticated;

-- تثبيت search_path للدوال التي نبّه عليها Security Advisor
alter function public.touch_site_settings() set search_path = public;
alter function public.touch_lesson_questions() set search_path = public;
alter function public.is_staff() set search_path = public;
alter function public.is_content_editor() set search_path = public;
alter function public.set_updated_at() set search_path = public;
