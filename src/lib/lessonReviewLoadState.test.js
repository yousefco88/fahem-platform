import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveLessonReviewLoad } from './lessonReviewLoadState.js';

test('returns loaded lists when all review queries succeed', () => {
  const result = resolveLessonReviewLoad([
    { data: [{ id: 'lesson-1' }], error: null },
    { data: [{ key: 'math' }], error: null },
    { data: [{ teacher_id: 'teacher-1', subject_key: 'math' }], error: null },
    { data: [{ id: 'teacher-1' }], error: null },
  ]);

  assert.deepEqual(result, {
    status: 'data',
    queue: [{ id: 'lesson-1' }],
    subjects: [{ key: 'math' }],
    assignments: [{ teacher_id: 'teacher-1', subject_key: 'math' }],
    teachers: [{ id: 'teacher-1' }],
    error: null,
  });
});

test('preserves true empty results when all queries succeed empty', () => {
  const result = resolveLessonReviewLoad([
    { data: [], error: null }, { data: [], error: null },
    { data: [], error: null }, { data: [], error: null },
  ]);

  assert.equal(result.status, 'empty');
  assert.deepEqual(result.queue, []);
});

test('reports query errors instead of converting failed reads to empty lists', () => {
  const failure = { message: 'permission denied' };
  const result = resolveLessonReviewLoad([
    { data: null, error: failure }, { data: [], error: null },
    { data: [], error: null }, { data: [], error: null },
  ]);

  assert.equal(result.status, 'error');
  assert.equal(result.error, failure);
  assert.equal(result.queue, null);
});

test('reports unavailable Supabase as an error', () => {
  const result = resolveLessonReviewLoad(null);

  assert.equal(result.status, 'error');
  assert.equal(result.error.message, 'الخدمة غير مهيأة');
});

test('does not classify missing or non-array data as a successful empty result', () => {
  for (const malformed of [undefined, null, {}, 'not an array']) {
    const result = resolveLessonReviewLoad([
      { data: [] },
      { data: [] },
      { data: [] },
      { data: malformed },
    ]);
    assert.equal(result.status, 'error');
    assert.equal(result.queue, null);
    assert.equal(result.teachers, null);
    assert.ok(result.error instanceof Error);
  }
});
