-- أسماء المعلمين تظهر على بطاقة الحصة للطفل/ولي الأمر. profiles لا يحوي إلا (الاسم، الدور).
create policy "teacher names readable" on public.profiles for select to authenticated using (role = 'teacher');
