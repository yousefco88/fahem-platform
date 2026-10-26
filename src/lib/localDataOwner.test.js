import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveLocalOwner } from './localDataOwner.js';

test('بيانات زائر بلا مالك تُضم لأول حساب يدخل', () => {
  assert.equal(resolveLocalOwner(null, 'u1'), 'adopt');
});
test('نفس الحساب يحتفظ ببياناته', () => {
  assert.equal(resolveLocalOwner('u1', 'u1'), 'keep');
});
test('حساب مختلف لا يرث أطفال الحساب السابق', () => {
  assert.equal(resolveLocalOwner('u1', 'u2'), 'reset');
});
