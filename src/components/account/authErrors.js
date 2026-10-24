// تعريب أخطاء Supabase Auth الشائعة لرسائل عربية واضحة
const MAP = [
  [/invalid login credentials/i, 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'],
  [/user already registered/i, 'هذا البريد مسجّل بالفعل — جرّب تسجيل الدخول بدلاً من إنشاء حساب.'],
  [/email not confirmed/i, 'البريد الإلكتروني لم يُؤكَّد بعد — افحص صندوق الوارد (أو الرسائل غير المرغوبة).'],
  [/password should be at least (\d+)/i, (m) => `كلمة المرور قصيرة — الحد الأدنى ${m[1]} حرفاً.`],
  [/rate limit|too many requests/i, 'محاولات كثيرة متتالية — انتظر دقيقة ثم أعد المحاولة.'],
  [/network|fetch failed|failed to fetch/i, 'تعذر الاتصال بالخادم — تأكد من اتصالك بالإنترنت.'],
  [/invalid email|unable to validate email/i, 'صيغة البريد الإلكتروني غير صحيحة.'],
  [/same password/i, 'كلمة المرور الجديدة مطابقة للقديمة.'],
  [/signup.*disabled/i, 'التسجيل معطّل حالياً — تواصل مع فريق فاهم.'],
];

export function arabicAuthError(err) {
  const raw = typeof err === 'string' ? err : err?.message || '';
  if (!raw) return 'تعذر تنفيذ الطلب — حاول مجدداً.';
  for (const [re, out] of MAP) {
    const m = raw.match(re);
    if (m) return typeof out === 'function' ? out(m) : out;
  }
  return raw;
}
