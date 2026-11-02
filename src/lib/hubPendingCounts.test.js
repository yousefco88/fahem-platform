import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchPendingCount, fetchHubPendingCounts } from './hubPendingCounts.js';
import { hubViewsForRole } from '../navigation/navConfig.js';

// عميل وهمي يسجّل الاستعلام ويرجع العدد المحدد لكل جدول.
function fakeClient(counts, fail = []) {
  const calls = [];
  return {
    calls,
    from(table) {
      const call = { table, filters: [] };
      calls.push(call);
      const q = {
        select(col, opts) { call.select = [col, opts]; return q; },
        eq(c, v) { call.filters.push(['eq', c, v]); return q; },
        or(expr) { call.filters.push(['or', expr]); return q; },
        then(res) { res(fail.includes(table) ? { count: null, error: { message: 'denied' } } : { count: counts[table] ?? 0, error: null }); }
      };
      return q;
    }
  };
}

test('counts use head-only exact queries with the right filter', async () => {
  const c = fakeClient({ curriculum_lessons: 4 });
  const n = await fetchPendingCount(c, { table: 'curriculum_lessons', column: 'review_status', equals: 'submitted' });
  assert.equal(n, 4);
  assert.deepEqual(c.calls[0].select, ['id', { count: 'exact', head: true }]);
  assert.deepEqual(c.calls[0].filters, [['eq', 'review_status', 'submitted']]);
});

test('bookings treat empty status as new', async () => {
  const c = fakeClient({ bookings: 2 });
  await fetchPendingCount(c, { table: 'bookings', column: 'status', equals: 'new', nullCounts: true });
  assert.deepEqual(c.calls[0].filters, [['or', 'status.is.null,status.eq.new']]);
});

test('content hub counts only steps that define pending, per role', async () => {
  const c = fakeClient({ curriculum_lessons: 3, lesson_recordings: 1 });
  assert.deepEqual(await fetchHubPendingCounts(c, hubViewsForRole('content', 'admin')), { lessonReview: 3, recordings: 1 });
  const c2 = fakeClient({ curriculum_lessons: 3, lesson_recordings: 1 });
  assert.deepEqual(await fetchHubPendingCounts(c2, hubViewsForRole('content', 'content_editor')), { lessonReview: 3 });
  assert.ok(!c2.calls.some(x => x.table === 'lesson_recordings'));
});

test('people hub counts new bookings only', async () => {
  const c = fakeClient({ bookings: 5 });
  assert.deepEqual(await fetchHubPendingCounts(c, hubViewsForRole('people', 'admin')), { bookings: 5 });
});

test('a failed or missing client shows no number instead of a misleading zero', async () => {
  const c = fakeClient({ curriculum_lessons: 3 }, ['lesson_recordings']);
  assert.deepEqual(await fetchHubPendingCounts(c, hubViewsForRole('content', 'admin')), { lessonReview: 3 });
  assert.deepEqual(await fetchHubPendingCounts(null, hubViewsForRole('content', 'admin')), {});
});
