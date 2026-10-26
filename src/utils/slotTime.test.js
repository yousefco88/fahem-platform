import test from 'node:test';
import assert from 'node:assert/strict';
import { nextSlotDate, minutesUntil, humanCountdown, tzOffsetMinutes, sameAsCairo } from './slotTime.js';

const CAIRO = 'Africa/Cairo';
const cairoHM = (d) => new Intl.DateTimeFormat('en-GB', { timeZone: CAIRO, hour12: false, hour: '2-digit', minute: '2-digit' }).format(d);
const cairoWD = (d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(
  new Intl.DateTimeFormat('en-GB', { timeZone: CAIRO, weekday: 'short' }).format(d));

test('nextSlotDate: النتيجة مستقبلية وتطابق يوم ووقت القاهرة المطلوبين', () => {
  const now = new Date('2026-10-26T12:00:00Z'); // إثنين
  for (const [day, time] of [[2, '19:30'], [0, '08:00'], [1, '09:00'], [5, '23:45']]) {
    const d = nextSlotDate(day, time, now);
    assert.ok(d instanceof Date && d.getTime() > now.getTime(), `future ${day} ${time}`);
    assert.equal(cairoWD(d), day, `weekday ${day}`);
    assert.equal(cairoHM(d), time, `wall time ${time}`);
    assert.ok(d.getTime() - now.getTime() <= 8 * 86400000, 'within a week');
  }
});

test('nextSlotDate: نفس اليوم — وقت فات يقفز أسبوعاً، وقت قادم يبقى اليوم', () => {
  const now = new Date('2026-10-26T12:00:00Z'); // إثنين، القاهرة بعد الظهر
  const wd = cairoWD(now);
  const later = nextSlotDate(wd, '23:50', now);
  const gap = later.getTime() - now.getTime();
  assert.ok(gap > 0 && gap < 86400000, 'later today stays today');
  const past = nextSlotDate(wd, '00:05', now);
  assert.ok(past.getTime() - now.getTime() > 6 * 86400000, 'past time jumps a week');
});

test('nextSlotDate: ثبات عبر حافة التوقيت الصيفي المصري (أواخر أكتوبر)', () => {
  // قبل نهاية الصيف وبعدها: الوقت الحائطي القاهري يظل مطابقاً
  for (const nowIso of ['2026-10-28T10:00:00Z', '2026-11-02T10:00:00Z']) {
    const d = nextSlotDate(4, '18:00', new Date(nowIso));
    assert.equal(cairoHM(d), '18:00', nowIso);
    assert.equal(cairoWD(d), 4, nowIso);
  }
});

test('nextSlotDate: مدخلات غير صالحة ترجع null', () => {
  assert.equal(nextSlotDate(7, '10:00'), null);
  assert.equal(nextSlotDate(2, 'abc'), null);
  assert.equal(nextSlotDate(2, null), null);
});

test('minutesUntil + humanCountdown', () => {
  const now = new Date('2026-10-26T12:00:00Z');
  assert.equal(minutesUntil(new Date('2026-10-26T12:45:00Z'), now), 45);
  assert.equal(humanCountdown(0), 'الآن');
  assert.equal(humanCountdown(45), 'خلال 45 دقيقة');
  assert.equal(humanCountdown(90), 'خلال ساعة و30 دقيقة'.replace('ساعة', '1 ساعة'));
  assert.equal(humanCountdown(120), 'خلال 2 ساعة');
  assert.equal(humanCountdown(26 * 60), 'خلال 1 يوم و2 ساعة');
  assert.equal(humanCountdown(48 * 60), 'خلال 2 يوم');
});

test('tzOffsetMinutes: القاهرة +120 أو +180 دائماً، وsameAsCairo حتمية بإزاحة صريحة', () => {
  const now = new Date('2026-10-26T12:00:00Z');
  const off = tzOffsetMinutes(now, CAIRO);
  assert.ok(off === 120 || off === 180, String(off));
  assert.equal(sameAsCairo(now, off), true);
  assert.equal(sameAsCairo(now, off + 60), false);
});
