import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ROLE_CEILING, capabilitiesForRole, scopeCovers, canGrantLocally, scopeLabel,
  staffErrorMessage, grantCapability, loadMyCapabilities,
} from './staffPermissions.js';

const catalog = {
  grades: [{ id: 'g3', stage: 'primary', title: 'الصف الثالث الابتدائي' }, { id: 'm1', stage: 'middle', title: 'الأول المتوسط' }],
  subjects: [{ key: 'math-g3', grade_id: 'g3', title: 'رياضيات' }, { key: 'sci-m1', grade_id: 'm1' }],
};
const all = { scope_kind: 'all', scope_value: null };
const primary = { scope_kind: 'stage', scope_value: 'primary' };
const g3 = { scope_kind: 'grade', scope_value: 'g3' };
const math = { scope_kind: 'subject', scope_value: 'math-g3' };
const sci = { scope_kind: 'subject', scope_value: 'sci-m1' };

test('supervisor ceiling excludes platform-wide capabilities', () => {
  assert.ok(!ROLE_CEILING.supervisor.includes('families.manage'));
  assert.ok(!ROLE_CEILING.supervisor.includes('subscriptions.view'));
  assert.equal(capabilitiesForRole('platform_manager').length, 12);
  assert.deepEqual(capabilitiesForRole('teacher'), []);
});

test('scopeCovers mirrors the server hierarchy', () => {
  assert.ok(scopeCovers(all, math, catalog));
  assert.ok(scopeCovers(primary, g3, catalog));
  assert.ok(scopeCovers(primary, math, catalog));
  assert.ok(scopeCovers(g3, math, catalog));
  assert.ok(!scopeCovers(primary, sci, catalog));
  assert.ok(!scopeCovers(g3, all, catalog));
  assert.ok(!scopeCovers(math, g3, catalog));
});

test('platform manager grants only within own permissions', () => {
  const granterCaps = [{ capability: 'content.edit', ...primary }];
  assert.ok(canGrantLocally({ granterRole: 'platform_manager', granterCaps, capability: 'content.edit', scope: math, catalog }));
  assert.ok(!canGrantLocally({ granterRole: 'platform_manager', granterCaps, capability: 'content.edit', scope: sci, catalog }));
  assert.ok(!canGrantLocally({ granterRole: 'platform_manager', granterCaps, capability: 'lessons.review', scope: math, catalog }));
  assert.ok(canGrantLocally({ granterRole: 'admin', capability: 'anything', scope: all }));
  assert.ok(!canGrantLocally({ granterRole: 'supervisor', granterCaps, capability: 'content.edit', scope: math, catalog }));
});

test('labels and arabic error messages', () => {
  assert.equal(scopeLabel('grade', 'g3', catalog), 'صف: الصف الثالث الابتدائي');
  assert.equal(scopeLabel('stage', 'primary'), 'مرحلة: الابتدائية');
  assert.equal(scopeLabel('all'), 'كل المنصة');
  assert.equal(staffErrorMessage({ message: 'cannot grant beyond your own permissions' }), 'لا يمكنك منح صلاحية أوسع من صلاحياتك.');
});

test('grant forces platform-wide scope for unscoped capabilities', async () => {
  const calls = [];
  const client = { rpc: async (name, args) => { calls.push([name, args]); return { error: null }; } };
  await grantCapability(client, { userId: 'u', capability: 'bookings.manage', scopeKind: 'grade', scopeValue: 'g3' });
  await grantCapability(client, { userId: 'u', capability: 'content.edit', scopeKind: 'grade', scopeValue: 'g3' });
  assert.deepEqual(calls[0], ['staff_grant_capability', { p_user: 'u', p_capability: 'bookings.manage', p_scope_kind: 'all', p_scope_value: null }]);
  assert.deepEqual(calls[1][1].p_scope_value, 'g3');
});

test('my capabilities fails closed', async () => {
  assert.deepEqual(await loadMyCapabilities(null), []);
  assert.deepEqual(await loadMyCapabilities({ rpc: async () => ({ error: { message: 'x' } }) }), []);
});

test('missing RPC (before migration) shows a pending message', async () => {
  const { loadStaffPermissions } = await import('./staffPermissions.js');
  const r = await loadStaffPermissions({ rpc: async () => ({ error: { code: 'PGRST202', message: 'Could not find the function' } }) });
  assert.equal(r.status, 'error');
  assert.match(r.message, /بانتظار تفعيل/);
});

test('staff roles readiness and invalid-role message', async () => {
  const { staffRolesReady, roleChangeErrorMessage } = await import('./staffPermissions.js');
  assert.equal(await staffRolesReady({ rpc: async () => ({ error: { code: 'PGRST202' } }) }), false);
  assert.equal(await staffRolesReady({ rpc: async () => ({ data: [], error: null }) }), true);
  assert.equal(await staffRolesReady(null), false);
  assert.match(roleChangeErrorMessage({ message: 'invalid role' }, 'platform_manager'), /بانتظار تفعيل/);
  assert.equal(roleChangeErrorMessage({ message: 'invalid role' }, 'teacher'), 'invalid role');
});
