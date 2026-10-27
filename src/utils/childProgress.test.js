import test from 'node:test';
import assert from 'node:assert/strict';
import { getSubjectProgress, getStreakDays, getChildStats, findLessonSubject } from './childProgress.js';

const curriculum = {
  arabic: { lessons: [{ id: 'alef' }, { id: 'baa' }, { id: 'taa' }, { id: 'thaa' }] },
  math: { lessons: [{ id: 'm1' }, { id: 'm2' }] }
};

test('child with no records sees honest 0%', () => {
  assert.deepEqual(getSubjectProgress(curriculum.arabic, {}, []), { done: 0, total: 4, percent: 0 });
  const s = getChildStats(curriculum, {}, []);
  assert.deepEqual(s, { done: 0, total: 6, points: 0, badges: 0, streak: 0 });
});

test('progress counts completed records and mastered lessons', () => {
  const recs = { alef: { completed: true }, baa: { lastOpenedAt: '2026-10-20T10:00:00' } };
  assert.deepEqual(getSubjectProgress(curriculum.arabic, recs, ['taa']), { done: 2, total: 4, percent: 50 });
  const s = getChildStats(curriculum, recs, ['taa']);
  assert.equal(s.points, 60);
  assert.equal(s.badges, 2);
});

test('empty subject does not divide by zero', () => {
  assert.equal(getSubjectProgress({ lessons: [] }).percent, 0);
  assert.equal(getSubjectProgress(undefined).total, 0);
});

test('streak counts consecutive active days up to today', () => {
  const now = new Date('2026-10-24T18:00:00');
  const recs = {
    a: { lastOpenedAt: '2026-10-24T09:00:00' },
    b: { completedAt: '2026-10-23T09:00:00' },
    c: { lastOpenedAt: '2026-10-22T20:00:00' },
    d: { lastOpenedAt: '2026-10-19T09:00:00' } // فجوة — لا تُحسب
  };
  assert.equal(getStreakDays(recs, now), 3);
});

test('streak survives if child has not studied yet today', () => {
  const now = new Date('2026-10-24T08:00:00');
  assert.equal(getStreakDays({ a: { lastOpenedAt: '2026-10-23T09:00:00' } }, now), 1);
});

test('streak breaks after a missed day', () => {
  const now = new Date('2026-10-24T08:00:00');
  assert.equal(getStreakDays({ a: { lastOpenedAt: '2026-10-21T09:00:00' } }, now), 0);
  assert.equal(getStreakDays({ a: { lastOpenedAt: 'not-a-date' } }, now), 0);
});

test('findLessonSubject resolves deep links', () => {
  assert.equal(findLessonSubject(curriculum, 'm2').subjectId, 'math');
  assert.equal(findLessonSubject(curriculum, 'nope'), null);
});

test('normalizeCurriculum keeps non-subject arrays intact (expatExamCalendar)', async () => {
  const { normalizeCurriculum } = await import('./todayPlan.js');
  const out = normalizeCurriculum({ arabic: { lessons: [{ id: 'a' }] }, expatExamCalendar: [{ title: 'x' }] });
  assert.ok(Array.isArray(out.expatExamCalendar));
  assert.equal(out.expatExamCalendar.length, 1);
  assert.equal(out.arabic.lessons[0].order, 1);
  const stats = getChildStats(out, {}, []);
  assert.equal(stats.total, 1);
});
