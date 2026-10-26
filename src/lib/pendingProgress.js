/**
 * pendingCompletedRows — التقدم المكتمل محلياً قبل ربط الطفل بالسحابة يضيع لأن
 * persistLearningRecord لا يكتب بلا uuid. بعد الربط نعيد رفع كل درس مكتمل.
 * records: { localChildId: { lessonId: { completed } } }
 * cloudIds: { localChildId: uuid }
 * children: [{ id, masteredLessons }]
 */
export function pendingCompletedRows(records = {}, cloudIds = {}, children = []) {
  const rows = [];
  const now = new Date().toISOString();
  Object.entries(cloudIds).forEach(([localId, uuid]) => {
    if (!uuid) return;
    const done = new Set(Object.entries(records[localId] || {}).filter(([, r]) => r?.completed).map(([l]) => l));
    (children.find(c => c.id === localId)?.masteredLessons || []).forEach(l => done.add(l));
    done.forEach(lessonId => rows.push({ child_id: uuid, lesson_id: lessonId, status: 'completed', score: null, updated_at: now }));
  });
  return rows;
}
