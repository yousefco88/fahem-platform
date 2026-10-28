import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGradeManagementRows, filterGradeManagementRows, summarizeGradeManagement } from './gradeManagement.js';

const grades = [
  { id: 'g1', title: 'الصف الأول الابتدائي', stage: 'primary', sort_order: 1, published: true },
  { id: 'g7', title: 'الصف السابع', stage: 'preparatory', sort_order: 7, published: false },
];

test('grade rows distinguish a real zero from counts that have not loaded', () => {
  assert.deepEqual(
    buildGradeManagementRows(grades, { g1: 0 }),
    [
      { ...grades[0], subjectCount: 0 },
      { ...grades[1], subjectCount: 0 },
    ],
  );
  assert.equal(buildGradeManagementRows(grades, null)[0].subjectCount, null);
});

test('filters grades by Arabic title or id, stage, and publication status', () => {
  const rows = buildGradeManagementRows(grades, { g1: 2, g7: 1 });
  assert.deepEqual(filterGradeManagementRows(rows, { query: 'السابع' }).map(row => row.id), ['g7']);
  assert.deepEqual(filterGradeManagementRows(rows, { query: 'g1' }).map(row => row.id), ['g1']);
  assert.deepEqual(filterGradeManagementRows(rows, { stage: 'preparatory' }).map(row => row.id), ['g7']);
  assert.deepEqual(filterGradeManagementRows(rows, { publication: 'draft' }).map(row => row.id), ['g7']);
});

test('summarizes only real grade and subject data', () => {
  const known = buildGradeManagementRows(grades, { g1: 2, g7: 1 });
  assert.deepEqual(summarizeGradeManagement(known), {
    gradeCount: 2,
    stageCount: 2,
    publishedCount: 1,
    subjectCount: 3,
  });

  const pending = buildGradeManagementRows(grades, null);
  assert.equal(summarizeGradeManagement(pending).subjectCount, null);
});
