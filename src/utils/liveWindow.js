// =============================================
// نافذة الحصة المباشرة — دوال نقية
// أوقات الجدول (day/time) مكتوبة بتوقيت المنصة (القاهرة).
// الانضمام يُحسب كلحظة مطلقة، ويُعرض الوقت بمنطقة ولي الأمر.
// day: 0 = الأحد … 6 = السبت (نفس DAY_NAMES)
// =============================================

export const PLATFORM_TZ = 'Africa/Cairo';
export const JOIN_BEFORE_MIN = 15;
export const SLOT_MINUTES = 60; // المدة الافتراضية؛ تُتجاوز بحقل duration_min لكل خانة

export function deviceTimezone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || PLATFORM_TZ; } catch { return PLATFORM_TZ; }
}

export function isValidTimezone(tz) {
  if (!tz || typeof tz !== 'string') return false;
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
}

const fmtCache = new Map();
function partsOf(date, tz) {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric'
    });
    fmtCache.set(tz, f);
  }
  const o = {};
  f.formatToParts(date).forEach(p => { if (p.type !== 'literal') o[p.type] = Number(p.value); });
  return o;
}

function offsetMs(tz, date) {
  const p = partsOf(date, tz);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - date.getTime();
}

/** لحظة مطلقة لوقت حائطي (y-m-d h:mi) في منطقة زمنية معيّنة */
export function wallToInstant(tz, y, mo, d, h, mi) {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let t = guess - offsetMs(tz, new Date(guess));
  t = guess - offsetMs(tz, new Date(t));
  return new Date(t);
}

function parseTime(time) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(time || '').trim());
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]);
  return h < 24 && mi < 60 ? { h, mi } : null;
}

/** بداية الخانة في أسبوع (now بتوقيت المنصة) مع إزاحة أسابيع */
export function slotStart(slot, now = new Date(), weekShift = 0) {
  const t = parseTime(slot?.time);
  if (!t || !Number.isInteger(slot?.day)) return null;
  const p = partsOf(now, PLATFORM_TZ);
  const dow = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
  const delta = slot.day - dow + 7 * weekShift;
  return wallToInstant(PLATFORM_TZ, p.year, p.month, p.day + delta, t.h, t.mi);
}

/**
 * حالة الحصة المباشرة الآن:
 *  open     = من 15 دقيقة قبل الموعد حتى نهاية الحصة
 *  upcoming = أقرب موعد قادم (هذا الأسبوع أو التالي)
 *  none     = خانة غير صالحة
 */
export function slotMinutes(slot) {
  const m = Number(slot?.durationMin);
  return Number.isFinite(m) && m >= 15 && m <= 240 ? m : SLOT_MINUTES;
}

export function getLiveState(slot, now = new Date()) {
  let start = slotStart(slot, now, 0);
  if (!start) return { state: 'none' };
  const dur = slotMinutes(slot) * 60000;
  let end = new Date(start.getTime() + dur);
  const opensAt = new Date(start.getTime() - JOIN_BEFORE_MIN * 60000);
  if (now >= opensAt && now <= end) return { state: 'open', start, end, opensAt };
  if (now > end) {
    start = slotStart(slot, now, 1);
    end = new Date(start.getTime() + dur);
  }
  return { state: 'upcoming', start, end, opensAt: new Date(start.getTime() - JOIN_BEFORE_MIN * 60000) };
}

/** تنسيق لحظة بمنطقة ولي الأمر: «الاثنين 01:00» */
export function formatInTz(date, tz) {
  if (!date) return '';
  const zone = isValidTimezone(tz) ? tz : deviceTimezone();
  const day = new Intl.DateTimeFormat('ar-u-nu-latn', { timeZone: zone, weekday: 'long' }).format(date);
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
  return `${day} ${time}`;
}

export function timeInTz(date, tz) {
  const zone = isValidTimezone(tz) ? tz : deviceTimezone();
  return new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
}

/** يوم التقويم (y-m-d) للحظة في منطقة */
export function dayKeyInTz(date, tz) {
  const p = partsOf(date, isValidTimezone(tz) ? tz : deviceTimezone());
  return `${p.year}-${p.month}-${p.day}`;
}

/**
 * خانات «اليوم» بمنطقة المستخدم: الخانة تُحتسب كلحظة مطلقة ثم يُقارن يومها بيوم المستخدم،
 * فعائلة في سيدني ترى حصة القاهرة الأحد 16:00 يوم الاثنين الساعة 01:00.
 */
export function slotsForToday(schedule = [], tz, now = new Date()) {
  const today = dayKeyInTz(now, tz);
  const out = [];
  schedule.forEach(slot => {
    for (const w of [-1, 0, 1]) {
      const start = slotStart(slot, now, w);
      if (start && dayKeyInTz(start, tz) === today) { out.push({ ...slot, startsAt: start }); break; }
    }
  });
  return out.sort((a, b) => a.startsAt - b.startsAt);
}
