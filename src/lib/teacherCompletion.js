export function getTeacherCompletedCount(records, error) {
  if (error) return null;
  return (records || []).reduce((total, record) => total + (record.status === 'completed' ? 1 : 0), 0);
}
