// =============================================
// الجدول الأسبوعي الافتراضي — خطة مذاكرة ذاتية
// قابل للتعديل من لوحة الأدمن (تبويب الجدول الأسبوعي)
// lessonRef: 'next' = يُحلّ وقت التشغيل إلى أول درس غير مُتقن
//            في المادة حسب حقل order (الربط الخلفي بالمادة والترتيب)
// =============================================

export const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export const SLOT_TYPES = {
  lesson: { label: 'درس اليوم', icon: '📘' },
  review: { label: 'مراجعة', icon: '🔁' },
  live: { label: 'حصة مباشرة', icon: '🔴' }
};

export const DEFAULT_WEEKLY_SCHEDULE = [
  { id: 'sun_1', day: 0, time: '16:00', subjectId: 'arabic', lessonRef: 'next', type: 'lesson' },
  { id: 'sun_2', day: 0, time: '17:00', subjectId: 'math', lessonRef: 'next', type: 'lesson' },
  { id: 'mon_1', day: 1, time: '16:00', subjectId: 'english', lessonRef: 'next', type: 'lesson' },
  { id: 'mon_2', day: 1, time: '17:00', subjectId: 'arabic', lessonRef: 'next', type: 'lesson' },
  { id: 'tue_1', day: 2, time: '16:00', subjectId: 'math', lessonRef: 'next', type: 'lesson' },
  { id: 'tue_2', day: 2, time: '17:00', subjectId: 'discover', lessonRef: 'next', type: 'lesson' },
  { id: 'wed_1', day: 3, time: '16:00', subjectId: 'arabic', lessonRef: 'next', type: 'lesson' },
  { id: 'wed_2', day: 3, time: '17:00', subjectId: 'life_skills', lessonRef: 'next', type: 'lesson' },
  { id: 'thu_1', day: 4, time: '16:00', subjectId: 'math', lessonRef: 'next', type: 'lesson' },
  { id: 'thu_2', day: 4, time: '17:00', subjectId: 'english', lessonRef: 'next', type: 'lesson' },
  // الجمعة راحة — لا خانات
  { id: 'sat_1', day: 6, time: '16:00', subjectId: 'arabic', lessonRef: 'next', type: 'review' },
  { id: 'sat_2', day: 6, time: '17:00', subjectId: 'math', lessonRef: 'next', type: 'review' }
];
