-- ما قبل الإطلاق: ولي الأمر لا ينشئ طفلاً بمحاكي مفتوح مسبقاً.
-- الإضافة من الواجهة تمرّر parent_id و name و grade و avatar فقط؛ حقول exam_unlocked*
-- تأخذ قيمها الافتراضية (false/null) ولا تتغير إلا عبر set_exam_unlocked (security definer).
revoke insert on public.children from authenticated;
grant insert (parent_id, name, grade, track, avatar) on public.children to authenticated;
