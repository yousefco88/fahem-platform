import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTeacherAssignmentRows, filterTeacherAssignmentRows } from './teacherSubjectAssignments.js';

const teachers = [
  { id: 't1', full_name: 'منى علي' },
  { id: 't2', full_name: 'أحمد حسن' },
];
const subjects = [
  { key: 'arabic', title: 'اللغة العربية', icon: '📘' },
  { key: 'math', title: 'الرياضيات', icon: '🔢' },
];
const assigned = new Set(['t1|arabic', 't2|math']);

test('builds a per-teacher matrix with accurate assigned totals', () => {
  const rows = buildTeacherAssignmentRows({ teachers, subjects, assigned });
  assert.deepEqual(rows.map(row => [row.name, row.assignedCount, row.subjects.map(s => s.assigned)]), [
    ['منى علي', 1, [true, false]],
    ['أحمد حسن', 1, [false, true]],
  ]);
});

test('filters teachers by name, subject assignment and assignment status', () => {
  const rows = buildTeacherAssignmentRows({ teachers, subjects, assigned });
  assert.deepEqual(filterTeacherAssignmentRows(rows, { query: 'منى' }).map(row => row.id), ['t1']);
  assert.deepEqual(filterTeacherAssignmentRows(rows, { subjectKey: 'arabic' }).map(row => row.id), ['t1']);
  assert.deepEqual(filterTeacherAssignmentRows(rows, { status: 'unassigned' }), []);
  assert.deepEqual(filterTeacherAssignmentRows(rows, { status: 'assigned' }).map(row => row.id), ['t1', 't2']);
});
