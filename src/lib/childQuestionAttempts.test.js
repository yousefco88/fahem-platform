import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { fetchChildQuestionAttempts } from './childQuestionAttempts.js';

function fakeClient(rows, failureAt = -1, beforePage = () => {}) {
  rows = rows.map(row => ({ parent_id: 'family-a', ...row }));
  const calls = [];
  return {
    calls,
    from(table) {
      assert.equal(table, 'lesson_question_attempts');
      const filters = [];
      let cursor = null;
      return {
        select(columns) {
          assert.equal(columns, 'id,child_id,child_name,is_correct,skill,created_at');
          return this;
        },
        eq(column, value) { filters.push([column, 'eq', value]); return this; },
        is(column, value) { filters.push([column, 'is', value]); return this; },
        or(expression) {
          const match = /^created_at\.lt\.([^,]+),and\(created_at\.eq\.([^,]+),id\.lt\.([0-9a-f-]+)\)$/.exec(expression);
          assert.ok(match, `invalid cursor: ${expression}`);
          assert.equal(match[1], match[2]);
          cursor = { created_at: match[1], id: match[3] };
          return this;
        },
        order() { return this; },
        async limit(count) {
          assert.equal(count, 1000);
          beforePage(calls.length, rows);
          calls.push({ filters, cursor });
          if (calls.length === failureAt) return { data: null, error: new Error('query failed') };
          const matches = rows
            .filter(row => filters.every(([key, , value]) => row[key] === value))
            .filter(row => !cursor || row.created_at < cursor.created_at || (row.created_at === cursor.created_at && row.id < cursor.id))
            .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
          return { data: matches.slice(0, count), error: null };
        },
      };
    },
  };
}

test('fetches every selected child attempt beyond the first 1000 family attempts', async () => {
  const created_at = '2026-10-30T12:00:00.000Z';
  const siblings = Array.from({ length: 1200 }, (_, i) => ({ id: `00000000-0000-0000-0000-${String(i + 2000).padStart(12, '0')}`, child_id: 'sibling', child_name: 'أحمد', created_at }));
  const selected = Array.from({ length: 1101 }, (_, i) => ({ id: `00000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`, child_id: 'chosen', child_name: 'ليلى', created_at }));
  const client = fakeClient([...siblings, ...selected]);
  const attempts = await fetchChildQuestionAttempts(client, { id: 'chosen', name: 'ليلى', parent_id: 'family-a' }, 2);
  assert.equal(attempts.length, 1101);
  assert.ok(attempts.every(row => row.child_id === 'chosen'));
  assert.equal(client.calls.length, 2);
  assert.equal(client.calls[1].cursor.id, selected[101].id);
});

test('a new attempt during page two cannot shift the cursor or duplicate an existing attempt', async () => {
  const created_at = '2026-10-30T12:00:00.000Z';
  const rows = Array.from({ length: 1100 }, (_, i) => ({
    id: `00000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`,
    child_id: 'chosen', created_at,
  }));
  const client = fakeClient(rows, -1, (page, source) => {
    if (page === 1) source.push({ id: 'ffffffff-ffff-ffff-ffff-ffffffffffff', parent_id: 'family-a', child_id: 'chosen', created_at });
  });
  const attempts = await fetchChildQuestionAttempts(client, { id: 'chosen', name: 'ليلى', parent_id: 'family-a' }, 2);
  assert.equal(attempts.length, 1100);
  assert.equal(new Set(attempts.map(row => row.id)).size, 1100);
  assert.ok(!attempts.some(row => row.id.startsWith('ffffffff')));
});

test('Supabase query builder serializes the compound cursor without network access', async () => {
  const urls = [];
  const created_at = '2026-10-30T12:00:00.000+00:00';
  const rows = Array.from({ length: 1000 }, (_, i) => ({
    id: `00000000-0000-0000-0000-${String(1000 - i).padStart(12, '0')}`,
    child_id: 'chosen', created_at,
  }));
  const client = createClient('http://127.0.0.1:54321', 'test-only-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (url) => {
      urls.push(new URL(url));
      return new Response(JSON.stringify(urls.length === 1 ? rows : []), {
        status: 200, headers: { 'content-type': 'application/json' },
      });
    } },
  });
  assert.equal((await fetchChildQuestionAttempts(client, { id: 'chosen', name: 'ليلى', parent_id: 'family-a' }, 2)).length, 1000);
  assert.equal(urls.length, 2);
  assert.equal(urls[0].searchParams.get('parent_id'), 'eq.family-a');
  assert.equal(urls[1].searchParams.get('parent_id'), 'eq.family-a');
  assert.equal(urls[1].searchParams.get('order'), 'created_at.desc,id.desc');
  assert.equal(urls[1].searchParams.get('limit'), '1000');
  assert.equal(urls[1].searchParams.get('or'),
    `(created_at.lt.${created_at},and(created_at.eq.${created_at},id.lt.${rows[999].id}))`);
});

test('does not attribute id-less attempts to a new child reusing a deleted child name', async () => {
  const rows = [
    { id: '00000000-0000-0000-0000-000000000003', child_id: 'chosen', child_name: 'ليلى', created_at: '2026-10-30T12:00:00Z' },
    // ON DELETE SET NULL leaves the old child's name in the same family.
    { id: '00000000-0000-0000-0000-000000000002', child_id: null, child_name: 'ليلى', created_at: '2026-10-30T12:00:00Z' },
    { id: '00000000-0000-0000-0000-000000000001', child_id: 'sibling', child_name: 'ليلى', created_at: '2026-10-30T12:00:00Z' },
  ];
  assert.equal((await fetchChildQuestionAttempts(fakeClient(rows), { id: 'chosen', name: 'ليلى', parent_id: 'family-a' }, 1)).length, 1);
  assert.equal((await fetchChildQuestionAttempts(fakeClient(rows), { id: 'chosen', name: 'ليلى', parent_id: 'family-a' }, 2)).length, 1);
});

test('scopes identified attempts to the selected family even for a staff reader', async () => {
  const rows = [
    { id: '00000000-0000-0000-0000-000000000001', parent_id: 'family-a', child_id: 'chosen', child_name: 'ليلى', created_at: '2026-10-30T12:00:00Z' },
    { id: '00000000-0000-0000-0000-000000000002', parent_id: 'family-a', child_id: null, child_name: 'ليلى', created_at: '2026-10-30T12:00:00Z' },
    { id: '00000000-0000-0000-0000-000000000003', parent_id: 'family-b', child_id: null, child_name: 'ليلى', created_at: '2026-10-30T12:00:00Z' },
  ];
  const client = fakeClient(rows);
  const result = await fetchChildQuestionAttempts(client, { id: 'chosen', name: 'ليلى' }, 1, 'family-a');
  assert.equal(result.length, 1);
  assert.equal(client.calls.length, 1, 'must not query id-less attempts by name');
  assert.ok(client.calls.every(call => call.filters.some(([column, , value]) => column === 'parent_id' && value === 'family-a')));
});

test('rejects failed pages and missing family scope instead of reporting incomplete totals', async () => {
  const client = fakeClient(Array.from({ length: 1100 }, (_, i) => ({ id: `00000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`, child_id: 'chosen', created_at: '2026-10-30T12:00:00Z' })), 2);
  await assert.rejects(fetchChildQuestionAttempts(client, { id: 'chosen', name: 'ليلى', parent_id: 'family-a' }, 2), /query failed/);
  await assert.rejects(fetchChildQuestionAttempts(client, { id: 'chosen', name: 'ليلى' }, 2), /Missing family scope/);
});
