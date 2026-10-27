const EMPTY_LISTS = {
  queue: [],
  subjects: [],
  assignments: [],
  teachers: [],
};

export function resolveLessonReviewLoad(results) {
  if (!Array.isArray(results) || results.length !== 4) {
    return { status: 'error', ...EMPTY_LISTS, queue: null, error: new Error('الخدمة غير مهيأة') };
  }

  const failed = results.find(result => result?.error);
  if (failed) {
    return { status: 'error', queue: null, subjects: null, assignments: null, teachers: null, error: failed.error };
  }

  const [queue, subjects, assignments, teachers] = results.map(result => result?.data || []);
  const hasData = [queue, subjects, assignments, teachers].some(rows => rows.length > 0);

  return {
    status: hasData ? 'data' : 'empty',
    queue,
    subjects,
    assignments,
    teachers,
    error: null,
  };
}
