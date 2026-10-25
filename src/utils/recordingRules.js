// قواعد تسجيلات الحصص (تُطبَّق في الواجهة وتُكرَّر ضمن قيود القاعدة: الحاوية + الدالة).
export const MAX_RECORDING_BYTES = 1024 * 1024 * 1024; // 1 غيغابايت = حد الحاوية
export const RECORDING_TYPES = { 'video/mp4': 'mp4', 'video/webm': 'webm' };

export function validateRecordingFile(file) {
  if (!file) return 'اختر ملف التسجيل';
  const ext = RECORDING_TYPES[file.type];
  if (!ext) return 'الصيغة غير مدعومة: المسموح MP4 أو WebM';
  if (file.size <= 0) return 'الملف فارغ';
  if (file.size > MAX_RECORDING_BYTES) return 'حجم الملف أكبر من 1 غيغابايت';
  return null;
}

// المسار يبدأ بمعرّف المعلم (تشترطه سياسة التخزين) ثم اسم عشوائي بلا بيانات شخصية.
export function recordingPath(userId, uuid, file) {
  return `${userId}/${uuid}.${RECORDING_TYPES[file.type]}`;
}

export const RECORDING_STATUS_LABEL = { review: 'بانتظار مراجعة الإدارة', accepted: 'منشور', rejected: 'مرفوض' };

export function recordingError(error) {
  if (!error) return '';
  if (error.code === '42501') return 'هذه الحصة غير مسندة إليك';
  if (error.code === '22023') return 'بيانات غير صالحة أو لم يتم التأكيد';
  return error.message || 'تعذر تنفيذ العملية';
}
