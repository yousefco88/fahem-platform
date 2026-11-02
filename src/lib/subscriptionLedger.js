// Pure helpers for the subscription hour ledger UI. No I/O.

export const minutesToLabel = minutes => {
  const total = Number(minutes) || 0;
  const sign = total < 0 ? '−' : '';
  const abs = Math.abs(total);
  const h = Math.floor(abs / 60), m = abs % 60;
  if (h && m) return `${sign}${h} س ${m} د`;
  if (h) return `${sign}${h} س`;
  return `${sign}${m} د`;
};

export const CONTRACT_STATUS_LABEL = {
  draft: 'مسودة', active: 'نشط', cancel_scheduled: 'إلغاء نهاية المدة', expired: 'منتهٍ', cancelled: 'ملغى', frozen: 'مجمّد',
};

export const POSTING_RESULT_LABEL = {
  posted: 'رُحّل', reposted: 'أُعيد ترحيله', no_debit_absent: 'غياب (بلا خصم)', already_posted: 'مرحّل سابقاً', error: 'خطأ',
};

// "relation does not exist" / "function does not exist" → migration not applied in this environment.
export const isMissingSchemaError = error =>
  !!error && (error.code === '42P01' || error.code === '42883' || error.code === 'PGRST202' || /does not exist|Could not find/.test(error.message || ''));

export const translateLedgerError = message => {
  const m = String(message || '');
  if (/admin note/.test(m)) return 'ملاحظة الإدارة مطلوبة (مرجع التحويل أو سبب المنحة).';
  if (/plan not found or not active/.test(m)) return 'الخطة غير موجودة أو غير نشطة.';
  if (/duration_days and included_hours/.test(m)) return 'الخطة بلا مدة أو ساعات؛ أكملها في الكتالوج أولاً.';
  if (/do not accept subject keys/.test(m)) return 'خطة «كل المواد» لا تقبل اختيار مواد.';
  if (/at least one subject/.test(m)) return 'اختر مادة واحدة على الأقل.';
  if (/not offered by this plan/.test(m)) return 'إحدى المواد غير معروضة في هذه الخطة.';
  if (/overlapping/.test(m)) return 'لدى الطفل عقد نشط يتداخل مع هذه الفترة والتغطية.';
  if (/start date must be/.test(m)) return 'تاريخ البداية يجب أن يكون ضمن 30 يوماً ماضية أو 90 يوماً قادمة.';
  if (/insufficient balance/.test(m)) return 'الرصيد غير كافٍ لهذا الخصم.';
  if (/no active contract covers/.test(m)) return 'لا يوجد عقد نشط يغطي هذا الطفل والمادة في هذا التاريخ.';
  if (/more than one active contract/.test(m)) return 'أكثر من عقد نشط يغطي الحصة؛ تحتاج معالجة يدوية.';
  if (/reason is required/.test(m)) return 'السبب مطلوب.';
  if (/locked/.test(m)) return 'الحضور مقفل (مرّت 48 ساعة)؛ التصحيح عبر الإدارة فقط.';
  if (/admin role required|permission denied/.test(m)) return 'الصلاحية غير كافية.';
  return m;
};

export const todayIsoDate = (now = new Date()) => {
  const z = n => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${z(now.getMonth() + 1)}-${z(now.getDate())}`;
};

// Parent-facing label for a ledger row (grant / debit / reversal).
export const describeLedgerEntry = entry => {
  if (!entry) return '';
  if (entry.entry_type === 'grant') return 'تفعيل الاشتراك';
  if (entry.entry_type === 'debit') return entry.subject_key ? `حضور حصة مباشرة · ${entry.subject_key}` : 'حضور حصة مباشرة';
  if (entry.entry_type === 'reversal') return entry.reason ? `تصحيح: ${entry.reason}` : 'تصحيح من الإدارة';
  return entry.entry_type || '';
};
