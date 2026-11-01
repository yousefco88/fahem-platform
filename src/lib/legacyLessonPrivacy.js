// Defense in depth for old browser snapshots. The database trigger is the privacy boundary.
const secretKeys = new Set(['answer', 'correct', 'correctOrder', 'targetWord']);

export function sanitizeLegacyLesson(value) {
  if (Array.isArray(value)) return value.map(sanitizeLegacyLesson);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .filter(([key]) => !secretKeys.has(key))
      .map(([key, item]) => [key, sanitizeLegacyLesson(item)]));
  }
  return value;
}

export function sanitizeCurriculum(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  return Object.fromEntries(Object.entries(value).map(([key, subject]) => [
    key, subject?.lessons && Array.isArray(subject.lessons)
      ? { ...subject, lessons: subject.lessons.map(sanitizeLegacyLesson) }
      : subject,
  ]));
}
