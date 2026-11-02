import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAdminSummaryStats } from './adminSummaryStats.js';

function client(byTable) {
  return {
    from(table) {
      const result = byTable[table];
      const chain = {
        select() { return chain; },
        eq() { return chain; },
        in() { return chain; },
        then(resolve, reject) {
          return (result instanceof Error ? Promise.reject(result) : Promise.resolve(result)).then(resolve, reject);
        },
      };
      return chain;
    },
  };
}

test('returns null for every summary without a client', async () => {
  const r = await loadAdminSummaryStats(null);
  assert.deepEqual(r, { activePlans: null, activeContracts: null, pendingLessons: null, pendingRecordings: null });
});

test('isolates failures: one denied count does not hide or zero the others', async () => {
  const r = await loadAdminSummaryStats(client({
    subscription_plans: { count: 1 },
    child_subscription_contracts: { count: 0 },
    curriculum_lessons: { count: null, error: { message: 'denied' } },
    lesson_recordings: new Error('network'),
  }));
  assert.deepEqual(r, { activePlans: 1, activeContracts: 0, pendingLessons: null, pendingRecordings: null });
});
