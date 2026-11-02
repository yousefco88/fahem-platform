// وسوم حالة الدرس في شجرة المناهج: تربط الدرس بمرحلته التالية في مركز المحتوى.
// review_status: draft | submitted | approved | rejected (من TeacherCurriculum / LessonEditor).
// التسجيلات المعلّقة مقروءة للمدير فقط (RLS)، فيُمرَّر hasPendingRecording=false لغيره.

export const REVIEW_STEP_PATH = '/admin?tab=lessonReview';
export const RECORDINGS_STEP_PATH = '/admin?tab=recordings';

export function lessonStatusTags(lesson, { hasPendingRecording = false } = {}) {
  const tags = [];
  const status = lesson?.review_status;
  if (status === 'submitted') {
    tags.push({ key: 'review', icon: '🟡', label: 'بانتظار المراجعة', tone: 'warn', to: REVIEW_STEP_PATH });
  } else if (status === 'rejected') {
    tags.push({ key: 'rejected', icon: '↩️', label: 'مرفوض — عند المعلم', tone: 'danger', to: null });
  } else if (status === 'approved') {
    tags.push({ key: 'approved', icon: '✅', label: 'معتمد', tone: 'ok', to: null });
  }
  if (hasPendingRecording) {
    tags.push({ key: 'recording', icon: '🎥', label: 'تسجيل بانتظار المراجعة', tone: 'warn', to: RECORDINGS_STEP_PATH });
  }
  return tags;
}

// مسار الدرس داخل شجرة المناهج (قائمة دروس مادته).
export const lessonCurriculumPath = (lesson) =>
  lesson?.subject_key ? `/admin/lessons?subject=${encodeURIComponent(lesson.subject_key)}` : '/admin/lessons';

// يجمع معرّفات الدروس التي لها تسجيل بانتظار المراجعة.
export const pendingRecordingLessonIds = (rows) => new Set((rows || []).map(r => r.lesson_id).filter(Boolean));
