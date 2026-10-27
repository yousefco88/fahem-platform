import test from 'node:test';
import assert from 'node:assert/strict';
import { loadScheduleSlots } from './scheduleSlotsQuery.js';

function queryResult(result) {
  const query = {
    select() { return this; },
    order() { return this; },
    then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); }
  };
  return { from: () => query };
}

test('reports missing service as an empty result without querying', async () => {
  const result = await loadScheduleSlots({ supabase: null, userId: 'user-1' });
  assert.deepEqual(result, { status: 'empty', slots: [] });
});

test('preserves returned query errors as errors', async () => {
  const result = await loadScheduleSlots({
    supabase: queryResult({ data: null, error: { message: 'denied' } }), userId: 'user-1'
  });
  assert.deepEqual(result, { status: 'error', message: 'denied' });
});

test('converts thrown query failures into error state', async () => {
  const supabase = { from: () => { throw new Error('network down'); } };
  const result = await loadScheduleSlots({ supabase, userId: 'user-1' });
  assert.deepEqual(result, { status: 'error', message: 'network down' });
});

test('maps successfully loaded schedule rows', async () => {
  const result = await loadScheduleSlots({
    supabase: queryResult({ data: [{ id: 'slot-1', child_id: 'child-1', slot_type: 'live', duration_min: 45, profiles: { full_name: 'Teacher' } }], error: null }),
    userId: 'user-1'
  });
  assert.deepEqual(result, { status: 'data', slots: [{
    id: 'slot-1', childId: 'child-1', day: undefined, time: undefined,
    subjectId: undefined, lessonRef: 'next', type: 'live', teacherId: null,
    meetingUrl: null, durationMin: 45, teacherName: 'Teacher'
  }] });
});
