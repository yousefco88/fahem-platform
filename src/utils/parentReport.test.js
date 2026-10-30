import test from 'node:test';
import assert from 'node:assert/strict';
import { buildParentReportSubjects } from './parentReport.js';

const curriculum = {
  arabic: {
    title: 'اللغة العربية',
    icon: '📘',
    grade: 'الصف الأول الابتدائي',
    lessons: [{ id: 'a1' }, { id: 'a2' }],
  },
  math: {
    title: 'الرياضيات',
    grade: 'الصف الأول الابتدائي',
    lessons: [{ id: 'm1' }],
  },
  science: {
    title: 'العلوم',
    grade: 'الصف الثاني الابتدائي',
    lessons: [{ id: 's1' }],
  },
  expatExamCalendar: [{ title: 'موعد' }],
};

test('builds report subjects from keyed curriculum and actual child progress', () => {
  assert.deepEqual(
    buildParentReportSubjects({
      curriculum,
      learningRecords: { a1: { completed: true }, a2: { videoProgress: 50 } },
      masteredLessons: ['m1'],
      grade: 'الصف الأول الابتدائي',
    }),
    [
      { name: 'اللغة العربية', emoji: '📘', completed: 1, total: 2, percent: 50 },
      { name: 'الرياضيات', emoji: '📘', completed: 1, total: 1, percent: 100 },
    ],
  );
});

test('keeps report empty when no matching published lessons exist', () => {
  assert.deepEqual(
    buildParentReportSubjects({ curriculum, grade: 'الصف السادس الابتدائي' }),
    [],
  );
});
