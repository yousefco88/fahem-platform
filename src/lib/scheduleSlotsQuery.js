function mapSlotRow(row) {
  return {
    id: row.id,
    childId: row.child_id,
    day: row.day,
    time: row.time,
    subjectId: row.subject_id,
    lessonRef: row.lesson_ref || 'next',
    type: row.slot_type || 'lesson',
    teacherId: row.teacher_id || null,
    meetingUrl: row.meeting_url || null,
    durationMin: row.duration_min || 60,
    teacherName: row.profiles?.full_name || null,
  };
}

export async function loadScheduleSlots({ supabase, userId }) {
  if (!supabase || !userId) return { status: 'empty', slots: [] };

  try {
    const { data, error } = await supabase
      .from('schedule_slots')
      .select('id, child_id, day, time, subject_id, lesson_ref, slot_type, teacher_id, meeting_url, duration_min, profiles(full_name)')
      .order('day', { ascending: true })
      .order('time', { ascending: true });
    if (error) return { status: 'error', message: error.message || 'تعذر تحميل الجدول.' };
    return { status: 'data', slots: (data || []).map(mapSlotRow) };
  } catch (error) {
    return { status: 'error', message: error?.message || 'تعذر تحميل الجدول.' };
  }
}
