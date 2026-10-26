import test from 'node:test';
import assert from 'node:assert/strict';
import { getLiveState, slotStart, slotsForToday, formatInTz } from './liveWindow.js';

// الأحد 2026-10-25 16:00 بتوقيت القاهرة (توقيت صيفي = 13:00Z)
const slot = { id: 's', day: 0, time: '16:00' };
const start = slotStart(slot, new Date('2026-10-25T10:00:00Z'));

test('الانضمام يفتح قبل 15 دقيقة بالضبط', () => {
  const t = (m) => new Date(start.getTime() + m * 60000);
  assert.equal(getLiveState(slot, t(-16)).state, 'upcoming');
  assert.equal(getLiveState(slot, t(-15)).state, 'open');
  assert.equal(getLiveState(slot, t(30)).state, 'open');
  assert.equal(getLiveState(slot, t(61)).state, 'upcoming');
});
test('بعد النهاية يشير للأسبوع التالي', () => {
  const s = getLiveState(slot, new Date(start.getTime() + 120 * 60000));
  // الوقت الحائطي ثابت 16:00 بالقاهرة؛ الفرق 169 ساعة لأن مصر تنهي التوقيت الصيفي 29 أكتوبر
  assert.equal((s.start.getTime() - start.getTime()) / 3600000, 169);
  assert.ok(formatInTz(s.start, 'Africa/Cairo').endsWith('16:00'));
});
test('الوقت يُعرض بمنطقة ولي الأمر', () => {
  const cairo = formatInTz(start, 'Africa/Cairo');
  assert.ok(cairo.endsWith('16:00'), cairo);
  const syd = formatInTz(start, 'Australia/Sydney');
  assert.ok(!syd.endsWith('16:00'), syd);
});
test('اليوم يُحتسب بمنطقة المستخدم', () => {
  // الحصة: الأحد 16:00 القاهرة = الاثنين 00:00 سيدني
  const before = new Date(start.getTime() - 2 * 3600000); // الأحد 22:00 سيدني
  assert.equal(slotsForToday([slot], 'Africa/Cairo', before).length, 1);
  assert.equal(slotsForToday([slot], 'Australia/Sydney', before).length, 0);
  const after = new Date(start.getTime() + 3600000); // الاثنين 01:00 سيدني
  assert.equal(slotsForToday([slot], 'Australia/Sydney', after).length, 1);
});
test('خانة غير صالحة', () => {
  assert.equal(getLiveState({ day: 0, time: 'x' }).state, 'none');
});

test('مدة الحصة قابلة للتخصيص وتسقط للافتراضي عند قيمة غير صالحة', () => {
  const t = (m) => new Date(start.getTime() + m * 60000);
  const long = { ...slot, durationMin: 90 };
  assert.equal(getLiveState(long, t(80)).state, 'open');
  assert.equal(getLiveState(long, t(91)).state, 'upcoming');
  assert.equal(getLiveState({ ...slot, durationMin: 5 }, t(61)).state, 'upcoming');
  assert.equal(getLiveState({ ...slot, durationMin: 'x' }, t(59)).state, 'open');
});
