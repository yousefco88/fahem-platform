import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveTeacherRosterLoad } from './teacherRosterLoadState.js';

const safeError = 'تعذر تحميل بيانات مساحة المعلم. أعد المحاولة.';

test('reports an unavailable Supabase client as an error', () => {
  assert.deepEqual(resolveTeacherRosterLoad({ serviceAvailable: false }), {
    status: 'error', message: safeError,
  });
});

test('reports a missing user as an error instead of leaving the roster loading', () => {
  assert.deepEqual(resolveTeacherRosterLoad({ serviceAvailable: true, userId: null }), {
    status: 'error', message: safeError,
  });
});

test('distinguishes successful empty data from query failure', () => {
  assert.deepEqual(resolveTeacherRosterLoad({
    serviceAvailable: true,
    userId: 'teacher-1',
    studentsResult: { data: [], error: null },
    slotsResult: { data: [], error: null },
  }), { status: 'data', students: [], slots: [] });

  assert.deepEqual(resolveTeacherRosterLoad({
    serviceAvailable: true,
    userId: 'teacher-1',
    studentsResult: { data: [], error: new Error('private details') },
    slotsResult: { data: [], error: null },
  }), { status: 'error', message: safeError });
});

test('treats missing result data as malformed rather than a successful empty roster', () => {
  assert.deepEqual(resolveTeacherRosterLoad({
    serviceAvailable: true,
    userId: 'teacher-1',
    studentsResult: { data: null, error: null },
    slotsResult: { data: [], error: null },
  }), { status: 'error', message: safeError });
});

test('does not expose raw errors when a query throws or only one query fails', () => {
  assert.deepEqual(resolveTeacherRosterLoad({
    serviceAvailable: true, userId: 'teacher-1', thrown: new Error('secret'),
  }), { status: 'error', message: safeError });

  assert.deepEqual(resolveTeacherRosterLoad({
    serviceAvailable: true,
    userId: 'teacher-1',
    studentsResult: { data: [], error: null },
    slotsResult: { data: null, error: new Error('private details') },
  }), { status: 'error', message: safeError });
});