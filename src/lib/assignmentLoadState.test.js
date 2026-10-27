import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAssignmentLoad } from './assignmentLoadState.js';

test('keeps loaded teachers, students and assignments distinct', () => {
  const result = resolveAssignmentLoad([
    { data: [{ id: 't1' }] },
    { data: [{ id: 'c1' }] },
    { data: [{ teacher_id: 't1', child_id: 'c1' }] },
  ]);
  assert.equal(result.status, 'data');
  assert.equal(result.teachers.length, 1);
  assert.equal(result.kids.length, 1);
  assert.equal(result.links.length, 1);
  assert.equal(result.error, null);
});

test('represents successful empty results as empty rather than failure', () => {
  const result = resolveAssignmentLoad([{ data: [] }, { data: [] }, { data: [] }]);
  assert.equal(result.status, 'empty');
  assert.deepEqual(result.teachers, []);
  assert.deepEqual(result.kids, []);
  assert.deepEqual(result.links, []);
});

test('does not turn a partial query failure into empty data', () => {
  const result = resolveAssignmentLoad([
    { data: [{ id: 't1' }] },
    { data: null, error: new Error('permission denied') },
    { data: [] },
  ]);
  assert.equal(result.status, 'error');
  assert.equal(result.teachers, null);
  assert.equal(result.kids, null);
  assert.equal(result.links, null);
});

test('reports an unavailable or malformed query set as an error', () => {
  assert.equal(resolveAssignmentLoad(null).status, 'error');
  assert.equal(resolveAssignmentLoad([{}]).status, 'error');
});

test('does not classify missing or non-array data as a successful empty result', () => {
  for (const malformed of [undefined, null, {}, 'not an array']) {
    const result = resolveAssignmentLoad([
      { data: [] },
      { data: [] },
      { data: malformed },
    ]);
    assert.equal(result.status, 'error');
    assert.equal(result.teachers, null);
    assert.equal(result.kids, null);
    assert.equal(result.links, null);
  }
});
