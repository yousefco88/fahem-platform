import test from 'node:test';
import assert from 'node:assert/strict';
import { buildChildInsights, attemptsForChild } from './childInsights.js';

test('empty input yields honest empty state', () => {
  const r = buildChildInsights({});
  assert.equal(r.hasAnyData, false);
  assert.equal(r.quiz.pct, null);
  assert.equal(r.streak, null);
  assert.equal(r.last14.length, 14);
  assert.equal(r.activeDays14, 0);
});
test('counts, accuracy and weakest skills need >=3 attempts', () => {
  const at = [
    ...Array(4).fill({ is_correct: false, skill: 'جمع' }),
    { is_correct: true, skill: 'جمع' },
    ...Array(3).fill({ is_correct: true, skill: 'قراءة' }),
    { is_correct: false, skill: 'نادرة' },
  ];
  const r = buildChildInsights({ records: [{ status: 'completed' }, { status: 'started' }], attempts: at });
  assert.equal(r.lessonsDone, 1); assert.equal(r.lessonsStarted, 1);
  assert.equal(r.quiz.total, 9); assert.equal(r.quiz.correct, 4);
  assert.deepEqual(r.weakest.map(s => s.skill), ['جمع']);
  assert.deepEqual(r.strongest.map(s => s.skill), ['قراءة']);
});
test('daily activity maps into the last 14 days', () => {
  const now = new Date(2026, 9, 29);
  const r = buildChildInsights({ daily: [{ activity_date: '2026-10-28', lessons_completed: 2, xp_earned: 20 }], now });
  assert.equal(r.last14[12].lessons, 2); assert.equal(r.activeDays14, 1);
});
test('attempt matching prefers id, falls back to unique name only', () => {
  const c = { id: 'u1', name: 'سارة' };
  const all = [{ child_id: 'u1' }, { child_id: 'u2', child_name: 'سارة' }, { child_id: null, child_name: 'سارة' }];
  assert.equal(attemptsForChild(all, c, 1).length, 2);
  assert.equal(attemptsForChild(all, c, 2).length, 1);
});
