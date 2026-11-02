/**
 * إسناد معلم لدرس محدد (curriculum_lessons.assigned_teacher_id).
 * القاعدة تتحقق من الصلاحية؛ هنا فقط ما تعرضه الواجهة.
 */

// المعلمون المؤهلون لدرس = المسندة لهم مادته في teacher_subjects.
export function subjectTeacherOptions({ teachers = [], assignments = [], subjectKey = '' }) {
  const eligible = new Set(assignments.filter(a => a.subject_key === subjectKey).map(a => a.teacher_id));
  return teachers
    .filter(t => eligible.has(t.id))
    .map(t => ({ id: t.id, name: t.full_name?.trim() || `معلم ${t.id.slice(0, 8)}` }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
}

// هل يحرر المعلم هذا الدرس في الواجهة؟ (مطابق لـ teacher_can_edit_lesson)
export function teacherCanEditLesson(lesson, userId) {
  if (!lesson || !userId) return false;
  const isMine = lesson.created_by === userId || lesson.assigned_teacher_id === userId;
  return isMine && ['draft', 'rejected'].includes(lesson.review_status);
}

// المنشئ وحده يؤرشف وينقل المادة؛ المُسند يحرر المحتوى ويرسل للمراجعة.
export function teacherOwnsLesson(lesson, userId) {
  return !!lesson && !!userId && lesson.created_by === userId;
}
