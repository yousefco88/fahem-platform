export function getTeacherSlotState(slots, error) {
  if (error) return { status: 'error', message: error };
  if (slots === null) return { status: 'loading' };
  if (slots.length === 0) return { status: 'empty' };
  return { status: 'data' };
}
