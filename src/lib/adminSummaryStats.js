// ملخصات إضافية لهيدر الإدارة من أقسام: المحتوى والاشتراكات.
// كل عدّاد مستقل: فشل أحدها (أو رفض RLS) يرجع null فيُعرض «—» ولا يُخفي الباقي ولا يتحول صفراً مضللاً.

const SUMMARY_QUERIES = {
  activePlans: q => q.from('subscription_plans').select('id', { count: 'exact', head: true }).eq('status', 'active'),
  activeContracts: q => q.from('child_subscription_contracts').select('id', { count: 'exact', head: true }).in('status', ['active', 'cancel_scheduled']),
  pendingLessons: q => q.from('curriculum_lessons').select('id', { count: 'exact', head: true }).eq('review_status', 'submitted'),
  pendingRecordings: q => q.from('lesson_recordings').select('id', { count: 'exact', head: true }).eq('status', 'review'),
};

export async function loadAdminSummaryStats(client) {
  const keys = Object.keys(SUMMARY_QUERIES);
  if (!client) return Object.fromEntries(keys.map(k => [k, null]));
  const values = await Promise.all(keys.map(async k => {
    try {
      const { count, error } = await SUMMARY_QUERIES[k](client);
      return error || !Number.isInteger(count) || count < 0 ? null : count;
    } catch {
      return null;
    }
  }));
  return Object.fromEntries(keys.map((k, i) => [k, values[i]]));
}
