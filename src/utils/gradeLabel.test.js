import test from 'node:test';
import assert from 'node:assert/strict';
import { gradeLabel } from './gradeLabel.js';

test('gradeLabel: المفاتيح القديمة g1..g6', () => {
  assert.equal(gradeLabel('g1'), 'الأول');
  assert.equal(gradeLabel('g4'), 'الرابع');
  assert.equal(gradeLabel('G6'), 'السادس');
});

test('gradeLabel: الصيغة الكاملة القديمة', () => {
  assert.equal(gradeLabel('الصف الرابع الابتدائي'), 'الرابع');
  assert.equal(gradeLabel('الصف الأول الابتدائي'), 'الأول');
  assert.equal(gradeLabel('الصف السادس'), 'السادس');
});

test('gradeLabel: الصيغة القصيرة الحالية تمر كما هي', () => {
  assert.equal(gradeLabel('الرابع'), 'الرابع');
});

test('gradeLabel: فراغ ونص حر', () => {
  assert.equal(gradeLabel(''), '');
  assert.equal(gradeLabel(null), '');
  assert.equal(gradeLabel('  g4  '), 'الرابع');
  assert.equal(gradeLabel('KG2'), 'KG2'); // نص حر غير معروف — بلا تخمين
});
