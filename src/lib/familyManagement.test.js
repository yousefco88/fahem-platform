import test from 'node:test';
import assert from 'node:assert/strict';
import { sortFamilySchedule, summarizeFamilyActivity } from './familyManagement.js';

test('summarizeFamilyActivity counts only the selected family children', () => {
  const summary = summarizeFamilyActivity({
    children: [{ id: 'child-a' }, { id: 'child-b' }],
    slots: [
      { childId: 'child-a', type: 'live' },
      { child_id: 'child-b', slot_type: 'lesson' },
      { childId: 'other-family-child', type: 'live' },
    ],
    learningRecords: [
      { child_id: 'child-a', status: 'completed' },
      { child_id: 'child-a', status: 'started' },
      { child_id: 'other-family-child', status: 'completed' },
    ],
  });

  assert.deepEqual(summary, {
    childCount: 2,
    scheduledCount: 2,
    liveCount: 1,
    completedLessons: 1,
    startedLessons: 1,
  });
});

test('sortFamilySchedule sorts a copy by weekday and time without mutating input', () => {
  const slots = [
    { id: 'late', day: 2, time: '18:00' },
    { id: 'next-day', day: 3, time: '08:30' },
    { id: 'early', day: 2, time: '09:00' },
  ];

  const sorted = sortFamilySchedule(slots);

  assert.deepEqual(sorted.map(slot => slot.id), ['early', 'late', 'next-day']);
  assert.deepEqual(slots.map(slot => slot.id), ['late', 'next-day', 'early']);
});
