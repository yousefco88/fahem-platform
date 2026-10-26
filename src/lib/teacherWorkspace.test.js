import test from 'node:test';
import assert from 'node:assert/strict';
import { getTeacherSlots } from './teacherWorkspace.js';

test('workspace includes only this teacher’s slots and orders today by time', () => {
  const slots = [
    { id: 'late', teacherId: 't1', day: 2, time: '17:00' },
    { id: 'other', teacherId: 't2', day: 2, time: '15:00' },
    { id: 'early', teacherId: 't1', day: 2, time: '09:00' },
    { id: 'tomorrow', teacherId: 't1', day: 3, time: '10:00' },
  ];

  const result = getTeacherSlots(slots, 't1', 2);

  assert.deepEqual(result.assigned.map(slot => slot.id), ['late', 'early', 'tomorrow']);
  assert.deepEqual(result.today.map(slot => slot.id), ['early', 'late']);
});

test('workspace handles missing slots and teacher id honestly as empty', () => {
  assert.deepEqual(getTeacherSlots(null, 't1', 2), { assigned: [], today: [] });
  assert.deepEqual(getTeacherSlots([{ id: 'a', teacherId: 't1', day: 2 }], null, 2), { assigned: [], today: [] });
});
