import { isLessonDone } from './todayPlan.js';

/** Build honest weekly-report subject rows for the active parent child. */
export function buildParentReportSubjects({
  curriculum = {},
  learningRecords = {},
  masteredLessons = [],
  grade = '',
} = {}) {
  return Object.entries(curriculum || {})
    .filter(([, subject]) =>
      subject &&
      !Array.isArray(subject) &&
      Array.isArray(subject.lessons) &&
      subject.lessons.length > 0 &&
      (!subject.grade || !grade || subject.grade === grade),
    )
    .map(([subjectKey, subject]) => {
      const completed = subject.lessons.filter(lesson =>
        isLessonDone(lesson.id, learningRecords, masteredLessons),
      ).length;
      return {
        name: subject.title || subjectKey,
        emoji: subject.icon || '📘',
        completed,
        total: subject.lessons.length,
        percent: Math.round((completed / subject.lessons.length) * 100),
      };
    });
}
