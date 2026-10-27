export function getMySpaceQueryState({ loading, data, error }) {
  if (loading) return { status: 'loading' };
  if (error) return { status: 'error', message: error };
  if (data == null) return { status: 'error', message: 'تعذر تحميل البيانات.' };
  if (typeof data === 'object' && !Array.isArray(data) && 'count' in data && data.count == null) {
    return { status: 'error', message: 'تعذر تأكيد عدد السجلات.' };
  }
  if (Array.isArray(data) && data.length === 0) return { status: 'empty' };
  return { status: 'data' };
}
