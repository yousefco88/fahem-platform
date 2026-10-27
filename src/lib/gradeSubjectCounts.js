export async function loadGradeSubjectCounts(supabase) {
  if (!supabase) return { status: 'error', message: 'الخدمة غير متاحة حالياً.' };

  try {
    const { data, error } = await supabase
      .from('curriculum_subjects')
      .select('grade_id');

    if (error) return { status: 'error', message: error.message || 'تعذر تحميل أعداد المواد.' };

    const counts = {};
    for (const subject of data || []) {
      if (subject.grade_id) counts[subject.grade_id] = (counts[subject.grade_id] || 0) + 1;
    }
    return { status: 'data', counts };
  } catch (error) {
    return { status: 'error', message: error?.message || 'تعذر تحميل أعداد المواد.' };
  }
}
