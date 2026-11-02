import test from 'node:test';
import assert from 'node:assert/strict';
import { subjectTeacherOptions, teacherCanEditLesson, teacherOwnsLesson } from './lessonTeacherAssignment.js';

const teachers = [
  { id: 't1', full_name: 'منى علي' },
  { id: 't2', full_name: 'أحمد حسن' },
  { id: 't3', full_name: '' },
];
const assignments = [
  { teacher_id: 't1', subject_key: 'arabic' },
  { teacher_id: 't2', subject_key: 'arabic' },
  { teacher_id: 't3', subject_key: 'math' },
];

test('only teachers assigned to the lesson subject are offered', () => {
  assert.deepEqual(subjectTeacherOptions({ teachers, assignments, subjectKey: 'arabic' }).map(t => t.id), ['t2', 't1']);
  assert.deepEqual(subjectTeacherOptions({ teachers, assignments, subjectKey: 'math' }), [{ id: 't3', name: 'معلم t3' }]);
  assert.deepEqual(subjectTeacherOptions({ teachers, assignments, subjectKey: 'science' }), []);
});

test('assigned teacher edits unlocked lessons only; creator alone owns', () => {
  const lesson = { created_by: 'admin', assigned_teacher_id: 't1', review_status: 'draft' };
  assert.equal(teacherCanEditLesson(lesson, 't1'), true);
  assert.equal(teacherCanEditLesson(lesson, 't2'), false);
  assert.equal(teacherCanEditLesson({ ...lesson, review_status: 'submitted' }, 't1'), false);
  assert.equal(teacherCanEditLesson({ ...lesson, review_status: 'approved' }, 't1'), false);
  assert.equal(teacherCanEditLesson({ created_by: 't2', review_status: 'rejected' }, 't2'), true);
  assert.equal(teacherOwnsLesson(lesson, 't1'), false);
  assert.equal(teacherOwnsLesson({ created_by: 't1' }, 't1'), true);
  assert.equal(teacherCanEditLesson(null, 't1'), false);
});
