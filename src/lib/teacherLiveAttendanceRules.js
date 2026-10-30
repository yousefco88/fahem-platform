export const MAX_TEACHER_REPORTED_MINUTES = 1440;

export function cairoDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function isDateKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function validateTeacherAttendance({ slotId, sessionDate, attended, actualMinutes, today = cairoDateKey() }) {
  if (typeof slotId !== 'string' || !slotId.trim()) return { ok: false, reason: 'slot_required' };
  if (!isDateKey(sessionDate) || !isDateKey(today)) return { ok: false, reason: 'invalid_date' };
  if (sessionDate > today) return { ok: false, reason: 'future_date' };
  if (typeof attended !== 'boolean' || !Number.isInteger(actualMinutes)) return { ok: false, reason: 'invalid_attendance' };
  if (attended && (actualMinutes < 1 || actualMinutes > MAX_TEACHER_REPORTED_MINUTES)) {
    return { ok: false, reason: 'invalid_minutes' };
  }
  if (!attended && actualMinutes !== 0) return { ok: false, reason: 'absence_minutes_must_be_zero' };

  return {
    ok: true,
    payload: { slotId, sessionDate, attended, actualMinutes },
  };
}
