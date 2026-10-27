import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAdminKpiStats } from './adminKpiStats.js';

function createSupabase(results) {
  let queryIndex = 0;
  return {
    from(table) {
      return {
        select() {
          const result = results[queryIndex++];
          return {
            eq() { return this; },
            then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); },
          };
        },
      };
    },
  };
}

test('reports unavailable service as an error', async () => {
  assert.equal((await loadAdminKpiStats(null)).status, 'error');
});

test('does not convert a returned query error into zero KPIs', async () => {
  const results = [
    { count: 0 },
    { count: 4 },
    { count: 0 },
    { count: 0, error: { message: 'denied' } },
  ];
  const result = await loadAdminKpiStats(createSupabase(results));
  assert.deepEqual(result, { status: 'error', message: 'denied' });
});

test('keeps successful zero counts distinct from errors', async () => {
  const result = await loadAdminKpiStats(createSupabase([
    { count: 0 }, { count: 0 }, { count: 0 }, { count: 0 },
  ]));
  assert.deepEqual(result, {
    status: 'data',
    counts: { families: 0, children: 0, bookings: 0, newBookings: 0 },
  });
});

test('reports a thrown query failure', async () => {
  const supabase = {
    from() {
      return {
        select() {
          return {
            eq() { return Promise.reject(new Error('offline')); },
            then(resolve, reject) { return Promise.reject(new Error('offline')).then(resolve, reject); },
          };
        },
      };
    },
  };
  assert.deepEqual(await loadAdminKpiStats(supabase), { status: 'error', message: 'offline' });
});
