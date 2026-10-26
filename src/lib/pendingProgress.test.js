import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pendingCompletedRows } from './pendingProgress.js';

test('يرفع الدروس المكتملة محلياً للأطفال المربوطين فقط', () => {
  const rows = pendingCompletedRows(
    { c1: { l1: { completed: true }, l2: { completed: false } }, c2: { l9: { completed: true } } },
    { c1: 'u-1' },
    [{ id: 'c1', masteredLessons: ['l3'] }]
  );
  assert.deepEqual(rows.map(r => [r.child_id, r.lesson_id, r.status]).sort(), [['u-1','l1','completed'], ['u-1','l3','completed']]);
});

test('بدون ربط لا شيء يُرفع', () => {
  assert.deepEqual(pendingCompletedRows({ c1: { l1: { completed: true } } }, {}, []), []);
});

test('لا تكرار لنفس الدرس', () => {
  const rows = pendingCompletedRows({ c1: { l1: { completed: true } } }, { c1: 'u' }, [{ id: 'c1', masteredLessons: ['l1'] }]);
  assert.equal(rows.length, 1);
});
