-- الجدول الجديد لا يرث صلاحيات تلقائية: نمنح القراءة فقط (RLS يقيّدها)، والكتابة عبر الدوال.
revoke all on public.lesson_recordings from anon, authenticated;
grant select on public.lesson_recordings to authenticated;
