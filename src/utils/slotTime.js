/**
 * slotTime — حسابات موعد الحصة القادمة.
 * خانات الجدول مخزنة: day (0=الأحد.. يطابق Date.getDay) + time "HH:MM" بتوقيت القاهرة (وقت حائطي).
 * كل الدوال نقية وقابلة للاختبار؛ لا بيانات وهمية — تُشتق اللحظة الفعلية من Intl مع مراعاة التوقيت الصيفي.
 */
const CAIRO = 'Africa/Cairo';
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** إزاحة منطقة زمنية عن UTC بالدقائق عند لحظة معينة (موجبة شرق غرينتش). */
export function tzOffsetMinutes(utcDate, timeZone) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(utcDate).map(x => [x.type, x.value]));
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, p.hour === '24' ? 0 : +p.hour, +p.minute, +p.second);
  return Math.round((asUTC - utcDate.getTime()) / 60000);
}

function cairoParts(d) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: CAIRO, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  }).formatToParts(d).map(x => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, wd: WD.indexOf(p.weekday) };
}

/** أقرب تكرار قادم للخانة كلحظة فعلية (Date بتوقيت UTC)، أو null لمدخلات غير صالحة. */
export function nextSlotDate(day, time, now = new Date()) {
  const [h, mi] = String(time || '').split(':').map(Number);
  if (!(day >= 0 && day <= 6) || !Number.isFinite(h) || !Number.isFinite(mi)) return null;
  for (let i = 0; i < 8; i++) {
    const probe = new Date(now.getTime() + i * 86400000);
    const c = cairoParts(probe);
    if (c.wd !== day) continue;
    // تحويل الوقت الحائطي القاهري إلى UTC مع تثبيت الإزاحة على لحظة الحصة نفسها (حافة التوقيت الصيفي)
    let utc = Date.UTC(c.y, c.m - 1, c.d, h, mi) - tzOffsetMinutes(probe, CAIRO) * 60000;
    utc = Date.UTC(c.y, c.m - 1, c.d, h, mi) - tzOffsetMinutes(new Date(utc), CAIRO) * 60000;
    if (utc > now.getTime()) return new Date(utc);
  }
  return null;
}

export function minutesUntil(date, now = new Date()) {
  return Math.round((date.getTime() - now.getTime()) / 60000);
}

/** عدّاد إنساني بالعربية. */
export function humanCountdown(mins) {
  if (mins <= 0) return 'الآن';
  if (mins < 60) return `خلال ${mins} دقيقة`;
  const h = Math.floor(mins / 60);
  if (h < 24) { const r = mins % 60; return r ? `خلال ${h} ساعة و${r} دقيقة` : `خلال ${h} ساعة`; }
  const d = Math.floor(h / 24); const rh = h % 24;
  return rh ? `خلال ${d} يوم و${rh} ساعة` : `خلال ${d} يوم`;
}

/** هل منطقة المتصفح الزمنية تطابق القاهرة لحظياً؟ (لا نعرض «بتوقيتك» لمن هو في مصر) */
export function sameAsCairo(now = new Date(), localOffsetMin = -now.getTimezoneOffset()) {
  return tzOffsetMinutes(now, CAIRO) === localOffsetMin;
}

/** صياغة الموعد بتوقيت المتصفح المحلي للمعلم. */
export function formatLocal(date) {
  return new Intl.DateTimeFormat('ar', { weekday: 'long', hour: 'numeric', minute: '2-digit' }).format(date);
}
