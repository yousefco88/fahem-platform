import { getNextLesson } from './todayPlan.js';

/**
 * Return only live sessions that resolve to the open lesson.
 * scheduleData must already be scoped to the active child by AppContext.
 */
export function findLessonLiveSlots({
  scheduleData = [],
  lessonId,
  curriculumData = {},
  learningRecords = {},
  masteredLessons = [],
} = {}) {
  if (lessonId == null || !Array.isArray(scheduleData)) return [];

  return scheduleData.filter(slot => {
    if (slot?.type !== 'live' || !slot.subjectId) return false;
    const subject = curriculumData[slot.subjectId];
    if (!subject) return false;

    const lesson = slot.lessonRef && slot.lessonRef !== 'next'
      ? (subject.lessons || []).find(item => String(item.id) === String(slot.lessonRef))
      : getNextLesson(subject, learningRecords, masteredLessons);

    return lesson != null && String(lesson.id) === String(lessonId);
  });
}
