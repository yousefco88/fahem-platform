import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGradeSubjectCounts } from './gradeSubjectCounts.js';

function clientWith(result) {
  return {
    from(table) {
      assert.equal(table, 'curriculum_subjects');
      return {
        select(columns) {
          assert.equal(columns, 'grade_id');
          return Promise.resolve(result);
        },
      };
    },
  };
}

test('counts subjects by grade when the query succeeds', async () => {
  const result = await loadGradeSubjectCounts(clientWith({
    data: [{ grade_id: 'g1' }, { grade_id: 'g1' }, { grade_id: 'g3' }],
    error: null,
  }));

  assert.deepEqual(result, { status: 'data', counts: { g1: 2, g3: 1 } });
});

test('returns known zero counts for an empty successful query', async () => {
  const result = await loadGradeSubjectCounts(clientWith({ data: [], error: null }));

  assert.deepEqual(result, { status: 'data', counts: {} });
});

test('keeps a returned query error distinct from an empty result', async () => {
  const result = await loadGradeSubjectCounts(clientWith({ data: null, error: { message: 'denied' } }));

  assert.equal(result.status, 'error');
  assert.match(result.message, /denied/);
});

test('keeps a rejected query distinct from an empty result', async () => {
  const result = await loadGradeSubjectCounts({
    from: () => ({ select: () => Promise.reject(new Error('offline')) }),
  });

  assert.equal(result.status, 'error');
  assert.match(result.message, /offline/);
});
