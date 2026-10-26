import test from 'node:test';
import assert from 'node:assert/strict';
import { getTeacherSlotState } from './teacherSlotState.js';

test('teacher slot query keeps loading, error, empty and data states distinct', () => {
  assert.deepEqual(getTeacherSlotState(null, ''), { status: 'loading' });
  assert.deepEqual(getTeacherSlotState(null, 'تعذر الاتصال'), { status: 'error', message: 'تعذر الاتصال' });
  assert.deepEqual(getTeacherSlotState([], 'تعذر الاتصال'), { status: 'error', message: 'تعذر الاتصال' });
  assert.deepEqual(getTeacherSlotState([], ''), { status: 'empty' });
  assert.deepEqual(getTeacherSlotState([{ id: 'slot-1' }], ''), { status: 'data' });
});
