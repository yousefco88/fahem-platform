// =============================================
// منطق «جدول اليوم» — دوال نقية قابلة للاختبار
// الربط الخلفي: الجدول يشير إلى المادة (subjectId)
// والدرس يُحلّ حسب الترتيب (order) وسجل التعلم الفعلي
// =============================================

/**
 * يضمن أن كل درس يحمل order (تسلسل داخل المادة) و unit (وحدة تقريبية كل 4 دروس)
 * بدون تعديل بيانات موجودة صراحةً.
 */
export function normalizeCurriculum(data) {
  const out = {};
  Object.entries(data || {}).forEach(([key, subj]) => {
    // المفاتيح غير المادية (مثل expatExamCalendar وهي مصفوفة) تمر كما هي — تحويلها لكائن يكسر .map
    if (!subj || typeof subj !== 'object' || Array.isArray(subj)) {
      out[key] = subj;
      return;
    }
    out[key] = {
      ...subj,
      lessons: (subj?.lessons || []).map((l, i) => ({
        ...l,
        order: l.order ?? i + 1,
        unit: l.unit ?? Math.floor(i / 4) + 1
      }))
    };
  });
  return out;
}

/** هل الدرس مُنجز؟ (إتقان الطفل أو إكمال في سجل التعلم) */
export function isLessonDone(lessonId, learningRecords = {}, masteredLessons = []) {
  return masteredLessons.includes(lessonId) || !!learningRecords?.[lessonId]?.completed;
}

/** أول درس غير مُنجز في المادة حسب order — «درسك الحالي» */
export function getNextLesson(subject, learningRecords = {}, masteredLessons = []) {
  const lessons = [...(subject?.lessons || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return lessons.find(l => !isLessonDone(l.id, learningRecords, masteredLessons)) || null;
}

/**
 * خطة اليوم: خانات الجدول لليوم الحالي مرتبة زمنياً،
 * وكل خانة مُحلّلة إلى (المادة + الدرس الفعلي).
 */
export function getTodayPlan({ schedule = [], curriculum = {}, learningRecords = {}, masteredLessons = [], now = new Date() }) {
  const day = now.getDay();
  return schedule
    .filter(s => s.day === day)
    .sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')))
    .map(slot => {
      const subject = curriculum[slot.subjectId] || null;
      let lesson = null;
      if (subject) {
        lesson = slot.lessonRef && slot.lessonRef !== 'next'
          ? (subject.lessons || []).find(l => l.id === slot.lessonRef) || null
          : getNextLesson(subject, learningRecords, masteredLessons);
      }
      return {
        ...slot,
        subject,
        lesson,
        done: lesson ? isLessonDone(lesson.id, learningRecords, masteredLessons) : false
      };
    });
}

/** «أكمل من حيث توقفت»: آخر درس فُتح فعلياً ولم يُنجز بعد */
export function getContinueLesson(curriculum = {}, learningRecords = {}, masteredLessons = []) {
  let best = null;
  Object.entries(curriculum).forEach(([subjectId, subject]) => {
    (subject?.lessons || []).forEach(l => {
      const rec = learningRecords?.[l.id];
      if (!rec?.lastOpenedAt) return;
      if (isLessonDone(l.id, learningRecords, masteredLessons)) return;
      if (!best || new Date(rec.lastOpenedAt) > new Date(best.openedAt)) {
        best = { subjectId, subject, lesson: l, openedAt: rec.lastOpenedAt, progress: rec.videoProgress || 0 };
      }
    });
  });
  return best;
}
