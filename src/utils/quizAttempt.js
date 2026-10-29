export function isCurrentQuizAttempt(attempt, current) {
  return Boolean(
    attempt
    && current
    && attempt.requestId === current.requestId
    && attempt.scope === current.scope
  );
}
