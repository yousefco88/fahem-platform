import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWeeklySummary, attemptsForWeeklySummaryChild } from './weeklySummary.js';

const NOW = new Date('2026-10-27T12:00:00Z');
const daysAgo = n => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

test('weekly summary matches attempts by cloud id and only uses unique legacy identity fallbacks', () => {
  const child = { id: 'local-child-1', name: 'سارة' };
  const attempts = [
    { child_id: 'cloud-child-1', child_name: 'سارة', is_correct: true },
    { child_id: 'cloud-child-2', child_name: 'سارة', is_correct: false },
    { child_id: null, child_key: 'local-child-1', child_name: 'سارة', is_correct: true },
    { child_id: null, child_name: 'سارة', is_correct: false },
    { child_id: null, child_name: null, is_correct: false },
  ];

  assert.deepEqual(
    attemptsForWeeklySummaryChild(attempts, child, 'cloud-child-1', 2),
    [attempts[0], attempts[2]],
  );
  assert.deepEqual(
    attemptsForWeeklySummaryChild([attempts[3]], child, 'cloud-child-1', 1),
    [attempts[3]],
  );
  assert.deepEqual(
    attemptsForWeeklySummaryChild([attempts[3]], child, 'cloud-child-1', 2),
    [],
  );
});

test('no activity => honest empty summary', () => {
  const s = buildWeeklySummary({ childName: 'جويرية', now: NOW });
  assert.equal(s.hasActivity, false);
  assert.match(s.text, /لا يوجد نشاط مسجل/);
});

test('counts only in-window records and attempts', () => {
  const s = buildWeeklySummary({
    childName: 'جويرية',
    learningRecords: {
      l1: { completedAt: daysAgo(2) },
      l2: { lastOpenedAt: daysAgo(3) },
      l3: { completedAt: daysAgo(20) }, // خارج النافذة
    },
    bankAttempts: [
      { is_correct: true, skill: 'الجمع ضمن 10', created_at: daysAgo(1) },
      { is_correct: false, skill: 'الجمع ضمن 10', created_at: daysAgo(1) },
      { is_correct: false, skill: 'الجمع ضمن 10', created_at: daysAgo(2) },
    ],
    now: NOW,
  });
  assert.equal(s.completed, 1);
  assert.equal(s.opened, 1);
  assert.equal(s.bankAnswered, 3);
  assert.equal(s.bankCorrect, 1);
  // 1/3 = 33% < 60% => مهارة ضعيفة
  assert.equal(s.weakSkills.length, 1);
  assert.equal(s.weakSkills[0].skill, 'الجمع ضمن 10');
  assert.match(s.text, /أكمل 1 درساً/);
});

test('null skill bank answers are counted but not attributed to a skill', () => {
  const s = buildWeeklySummary({
    bankAttempts: [{ is_correct: false, skill: null, created_at: daysAgo(1) }],
    now: NOW,
  });
  assert.equal(s.bankAnswered, 1);
  assert.equal(s.weakSkills.length, 0);
});
