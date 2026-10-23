// =============================================
// تقدم الطفل الحقيقي — دوال نقية مشتقة من سجل التعلم فقط (بلا أرقام مزروعة)
// =============================================
import { isLessonDone } from './todayPlan.js';

// نفس قاعدة المكافأة في completeLessonMastery: 30 نقطة + شارة لكل درس يُتقن أول مرة
export const POINTS_PER_LESSON = 30;

/** تقدم مادة: مكتمل/إجمالي/نسبة */
export function getSubjectProgress(subject, learningRecords = {}, masteredLessons = []) {
  const lessons = subject?.lessons || [];
  const total = lessons.length;
  const done = lessons.filter(l => isLessonDone(l.id, learningRecords, masteredLessons)).length;
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
}

/** مفتاح يوم محلي YYYY-MM-DD */
function dayKey(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * أيام النشاط المتتالية حتى اليوم (أو حتى أمس إن لم يتعلم اليوم بعد).
 * النشاط = فتح درس أو إكماله، من السجل الفعلي.
 */
export function getStreakDays(learningRecords = {}, now = new Date()) {
  const days = new Set();
  Object.values(learningRecords || {}).forEach(rec => {
    [rec?.lastOpenedAt, rec?.completedAt].forEach(ts => {
      const k = ts && dayKey(ts);
      if (k) days.add(k);
    });
  });
  if (days.size === 0) return 0;
  const cursor = new Date(now);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** إحصاءات الطفل الكاملة مشتقة من المنهج + السجل */
export function getChildStats(curriculum = {}, learningRecords = {}, masteredLessons = [], now = new Date()) {
  let done = 0;
  let total = 0;
  Object.values(curriculum || {}).forEach(subject => {
    const p = getSubjectProgress(subject, learningRecords, masteredLessons);
    done += p.done;
    total += p.total;
  });
  return {
    done,
    total,
    points: done * POINTS_PER_LESSON,
    badges: done,
    streak: getStreakDays(learningRecords, now)
  };
}

/** يجد المادة التي يتبع لها الدرس (للروابط المباشرة /child/lesson/:id) */
export function findLessonSubject(curriculum = {}, lessonId) {
  for (const [subjectId, subject] of Object.entries(curriculum || {})) {
    const lesson = (subject?.lessons || []).find(l => l.id === lessonId);
    if (lesson) return { subjectId, subject, lesson };
  }
  return null;
}
