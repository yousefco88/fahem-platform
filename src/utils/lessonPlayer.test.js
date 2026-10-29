import test from 'node:test';
import assert from 'node:assert/strict';
import { findLessonLiveSlots } from './lessonPlayer.js';

const curriculumData = {
  arabic: { lessons: [{ id: 'lesson-a' }, { id: 'lesson-b' }] },
  math: { lessons: [{ id: 'lesson-c' }] },
};

const scheduleData = [
  { id: 'live-a', type: 'live', subjectId: 'arabic', lessonRef: 'lesson-a' },
  { id: 'live-next', type: 'live', subjectId: 'arabic', lessonRef: 'next' },
  { id: 'regular-a', type: 'lesson', subjectId: 'arabic', lessonRef: 'lesson-a' },
  { id: 'live-c', type: 'live', subjectId: 'math', lessonRef: 'lesson-c' },
  { id: 'live-unknown', type: 'live', subjectId: 'missing', lessonRef: 'lesson-a' },
];

test('matches direct slots to the exact lesson and subject', () => {
  assert.deepEqual(
    findLessonLiveSlots({
      scheduleData,
      lessonId: 'lesson-a',
      curriculumData,
      learningRecords: { 'lesson-a': { completed: true } },
    }),
    [scheduleData[0]],
  );
});

test('resolves next-lesson slots using the active child progress', () => {
  assert.deepEqual(
    findLessonLiveSlots({
      scheduleData,
      lessonId: 'lesson-b',
      curriculumData,
      learningRecords: { 'lesson-a': { completed: true } },
    }),
    [scheduleData[1]],
  );
});

test('does not guess a lesson when its subject or lesson reference is missing', () => {
  assert.deepEqual(
    findLessonLiveSlots({
      scheduleData: [
        { id: 'unknown-subject', type: 'live', subjectId: 'missing', lessonRef: 'next' },
        { id: 'unknown-lesson', type: 'live', subjectId: 'arabic', lessonRef: 'missing' },
      ],
      lessonId: 'lesson-a',
      curriculumData,
    }),
    [],
  );
});
