// سجل النشاط الحقيقي — يكتب في جدول activity_log (RLS: كل مستخدم يسجل حدثه فقط، والقراءة للإدارة)
// الفشل هنا لا يجب أن يكسر العملية الأصلية — لذلك كل الأخطاء تُبتلع مع console.warn
import { supabase } from './supabase';

export async function logActivity(action, entity, entityId, details = {}) {
  try {
    if (!supabase) return;
    const { data: { user } = {} } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('activity_log').insert({
      actor: user.id,
      actor_name: user.user_metadata?.full_name || user.email || null,
      action,
      entity,
      entity_id: entityId != null ? String(entityId) : null,
      details,
    });
    if (error) console.warn('activity_log insert failed:', error.message);
  } catch (e) {
    console.warn('logActivity error:', e?.message);
  }
}
