import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { fetchChildQuestionAttempts } from '../../src/lib/childQuestionAttempts.js';

const base = process.env.TEST_PGRST_URL;
assert.match(base ?? '', /^http:\/\/127\.0\.0\.1:\d+$/);
const secret = 'local-test-only-signature-secret-32bytes-minimum';
const ids = {
  admin: '00000000-0000-0000-0000-000000000001',
  a: '00000000-0000-0000-0000-000000000002',
  b: '00000000-0000-0000-0000-000000000003',
  editor: '00000000-0000-0000-0000-000000000004',
};
const encoded = value => Buffer.from(JSON.stringify(value)).toString('base64url');
function token(sub) {
  const body = `${encoded({ alg: 'HS256', typ: 'JWT' })}.${encoded({ role: 'authenticated', sub })}`;
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
}
async function request(path, sub, options = {}) {
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: { ...(sub ? { authorization: `Bearer ${token(sub)}` } : {}),
      'content-type': 'application/json', ...options.headers },
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}
function client(sub) {
  return createClient(base, 'local-only-test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${token(sub)}` },
      fetch: (url, options) => fetch(String(url).replace('/rest/v1/', '/'), options),
    },
  });
}
for (let i = 0; i < 30; i++) {
  try {
    const health = await request('/subscription_plans?select=id&limit=1');
    if (health.status < 500) break;
  } catch { /* waiting for local container */ }
  if (i === 29) throw new Error('Local PostgREST did not start');
  await new Promise(resolve => setTimeout(resolve, 500));
}
const a = await request('/lesson_question_attempts?select=id,parent_id&order=id', ids.a);
assert.equal(a.status, 200, JSON.stringify(a));
assert.equal(a.body.length, 1004);
assert.ok(a.body.every(row => row.parent_id === ids.a));
const orphan = await request('/lesson_question_attempts?id=eq.30000000-0000-0000-0000-000000000010&select=id,child_id,child_name', ids.a);
assert.equal(orphan.status, 200, JSON.stringify(orphan));
assert.deepEqual(orphan.body, [{ id: '30000000-0000-0000-0000-000000000010', child_id: null, child_name: 'نور' }]);
const reborn = await fetchChildQuestionAttempts(client(ids.a),
  { id: '10000000-0000-0000-0000-000000000011', name: 'نور' }, 1, ids.a);
assert.equal(reborn.length, 0, 'deleted namesake attempt must never count for the new child');
const b = await request('/lesson_question_attempts?select=id,parent_id&order=id', ids.b);
assert.equal(b.status, 200, JSON.stringify(b));
assert.equal(b.body.length, 2);
assert.ok(b.body.every(row => row.parent_id === ids.b));
const anon = await request('/lesson_question_attempts?select=id');
assert.ok([401, 403].includes(anon.status), JSON.stringify(anon));
const staff = await request('/lesson_question_attempts?select=id,parent_id', ids.editor);
assert.equal(staff.status, 200, JSON.stringify(staff));
assert.equal(staff.body.length, 1006);
const childA = { id: '10000000-0000-0000-0000-000000000001', name: 'ليلى' };
const childB = { id: '10000000-0000-0000-0000-000000000002', name: 'ليلى' };
for (const [viewer, family, child, expected] of [
  [ids.a, ids.a, childA, 1002], [ids.b, ids.b, childB, 1],
  [ids.editor, ids.a, childA, 1002], [ids.editor, ids.b, childB, 1],
  [ids.a, ids.b, childB, 0],
]) {
  const rows = await fetchChildQuestionAttempts(client(viewer), child, 1, family);
  assert.equal(rows.length, expected, `${viewer} viewing ${family}`);
  assert.ok(rows.every(row => row.child_id === child.id || row.child_id === null));
  assert.equal(new Set(rows.map(row => row.id)).size, rows.length, 'pages must not duplicate attempts');
}
const saveArgs = { p_id: null, p_name: 'Local active plan', p_duration_days: 30,
  p_included_hours: 2, p_coverage_mode: 'selected', p_price_per_child_minor: null,
  p_status: 'active', p_subjects: [{ subject_key: 'english', price_per_child_minor: 200 }] };
const parentSave = await request('/rpc/save_subscription_plan', ids.a, {
  method: 'POST', body: JSON.stringify(saveArgs),
});
assert.equal(parentSave.status, 403, JSON.stringify(parentSave));
const adminSave = await request('/rpc/save_subscription_plan', ids.admin, {
  method: 'POST', body: JSON.stringify(saveArgs),
});
assert.equal(adminSave.status, 200, JSON.stringify(adminSave));
const planId = adminSave.body;
const publicPlan = await request(`/subscription_plans?id=eq.${planId}&select=status`);
assert.equal(publicPlan.status, 200, JSON.stringify(publicPlan));
assert.equal(publicPlan.body[0]?.status, 'active');
const anonArchive = await request('/rpc/archive_subscription_plan', null, {
  method: 'POST', body: JSON.stringify({ p_id: planId }),
});
assert.ok([401, 403, 404].includes(anonArchive.status), JSON.stringify(anonArchive));
const direct = await request(`/subscription_plans?id=eq.${planId}`, ids.admin, {
  method: 'PATCH', body: JSON.stringify({ status: 'archived' }),
});
assert.equal(direct.status, 403, JSON.stringify(direct));
const directSubject = await request(`/subscription_plan_subjects?plan_id=eq.${planId}`, ids.admin, {
  method: 'DELETE',
});
assert.equal(directSubject.status, 403, JSON.stringify(directSubject));
const unpublish = await request('/curriculum_subjects?key=eq.english', ids.admin, {
  method: 'PATCH', body: JSON.stringify({ published: false }),
});
assert.equal(unpublish.body?.code, '23514', JSON.stringify(unpublish));
const read = await request(`/subscription_plans?id=eq.${planId}&select=status`, ids.a);
assert.equal(read.status, 200, JSON.stringify(read));
assert.equal(read.body[0]?.status, 'active');
const parentArchive = await request('/rpc/archive_subscription_plan', ids.a, {
  method: 'POST', body: JSON.stringify({ p_id: planId }),
});
assert.equal(parentArchive.status, 403, JSON.stringify(parentArchive));
const adminArchive = await request('/rpc/archive_subscription_plan', ids.admin, {
  method: 'POST', body: JSON.stringify({ p_id: planId }),
});
assert.equal(adminArchive.status, 200, JSON.stringify(adminArchive));
console.log('PostgREST: anon/parent/admin/editor, two families and catalog RPC passed locally.');
