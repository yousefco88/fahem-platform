import test from 'node:test';
import assert from 'node:assert/strict';
import { isCurrentQuizAttempt } from './quizAttempt.js';

test('accepts a quiz response only for the current lesson and question request', () => {
  const attempt = { requestId: 7, scope: 'lesson-a:question-1:child-a' };

  assert.equal(isCurrentQuizAttempt(attempt, { requestId: 7, scope: attempt.scope }), true);
});

test('rejects a quiz response after the lesson, question, child, or request changes', () => {
  const attempt = { requestId: 7, scope: 'lesson-a:question-1:child-a' };

  assert.equal(isCurrentQuizAttempt(attempt, { requestId: 7, scope: 'lesson-b:question-1:child-a' }), false);
  assert.equal(isCurrentQuizAttempt(attempt, { requestId: 7, scope: 'lesson-a:question-2:child-a' }), false);
  assert.equal(isCurrentQuizAttempt(attempt, { requestId: 7, scope: 'lesson-a:question-1:child-b' }), false);
  assert.equal(isCurrentQuizAttempt(attempt, { requestId: 8, scope: attempt.scope }), false);
  assert.equal(isCurrentQuizAttempt(attempt, null), false);
});
