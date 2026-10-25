-- الدور content_editor مستخدم في is_content_editor() / is_staff() والواجهة،
-- لكن قيد profiles_role_check كان يسمح بـ parent/teacher/admin فقط،
-- فكان إسناد الدور مستحيلاً. هذه الـ migration توسّع القيد دون المساس بالبيانات.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role = any (array['parent'::text, 'teacher'::text, 'admin'::text, 'content_editor'::text]));
