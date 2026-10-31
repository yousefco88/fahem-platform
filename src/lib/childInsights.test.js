import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReportProgressStats } from '../utils/childInsights.js';

test('report progress uses curriculum-filtered subject totals', () => {
  assert.deepEqual(buildReportProgressStats([
    { completed: 2, total: 4 },
    { completed: 1, total: 2 },
  ]), { lessonsCompleted: 3, totalLessons: 6, progressPercent: 50 });
});

test('report progress is zero when there are no curriculum lessons', () => {
  assert.deepEqual(buildReportProgressStats([]), {
    lessonsCompleted: 0,
    totalLessons: 0,
    progressPercent: 0,
  });
});
