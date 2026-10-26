export function getTeacherSlots(slots, teacherId, day) {
  const assigned = teacherId ? (slots || []).filter(slot => slot.teacherId === teacherId) : [];
  const today = assigned
    .filter(slot => slot.day === day)
    .slice()
    .sort((a, b) => String(a.time).localeCompare(String(b.time)));
  return { assigned, today };
}
