import test from 'node:test';
import assert from 'node:assert/strict';
import { getTeacherCompletedCount } from './teacherCompletion.js';

test('teacher completion is unknown on query failure, not fabricated as zero', () => {
  assert.equal(getTeacherCompletedCount(null, { message: 'offline' }), null);
});

test('teacher completion counts only completed records and preserves a real zero', () => {
  assert.equal(getTeacherCompletedCount([
    { status: 'completed' },
    { status: 'in_progress' },
    { status: 'completed' },
  ], null), 2);
  assert.equal(getTeacherCompletedCount([], null), 0);
});
