const SAFE_ERROR = 'تعذر تحميل بيانات مساحة المعلم. أعد المحاولة.';

export function resolveTeacherRosterLoad({ serviceAvailable, userId, studentsResult, slotsResult, thrown }) {
  if (
    !serviceAvailable || !userId || thrown || !studentsResult || !slotsResult ||
    studentsResult.error || slotsResult.error ||
    !Array.isArray(studentsResult.data) || !Array.isArray(slotsResult.data)
  ) {
    return { status: 'error', message: SAFE_ERROR };
  }

  return {
    status: 'data',
    students: studentsResult.data,
    slots: slotsResult.data,
  };
}
