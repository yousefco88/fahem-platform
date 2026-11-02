import test from 'node:test';
import assert from 'node:assert/strict';
import { userBadges, filterUsers, userActions, classifyDeleteImpact, roleLabel } from './adminUsers.js';

const NOW = Date.parse('2026-11-03T12:00:00Z');
const FUTURE = '2026-11-10T00:00:00Z';
const PAST = '2026-11-01T00:00:00Z';
const users = [
  { id: 'a', full_name: 'Youssef', email: 'admin@x.com', role: 'admin', last_sign_in_at: PAST },
  { id: 't', full_name: 'منار', email: 'manar@x.com', role: 'teacher', last_sign_in_at: PAST },
  { id: 'p', full_name: 'ولي', email: 'parent@x.com', role: 'parent', last_sign_in_at: null, teacher_request: { subjects: 'رياضيات' } },
  { id: 's', full_name: 'Sus', email: 'sus@x.com', role: 'parent', last_sign_in_at: PAST },
];
const banned = { s: FUTURE, t: PAST };

test('roleLabel maps ids and falls back', () => {
  assert.equal(roleLabel('content_editor'), 'محرر محتوى');
  assert.equal(roleLabel(null), 'بدون دور');
});

test('badges: self, suspended (future only), never signed in, teacher request', () => {
  assert.deepEqual(userBadges(users[0], { selfId: 'a', banned, now: NOW }).map(b => b.key), ['self']);
  assert.deepEqual(userBadges(users[1], { banned, now: NOW }).map(b => b.key), []);
  assert.deepEqual(userBadges(users[2], { banned, now: NOW }).map(b => b.key), ['never', 'teacher_request']);
  assert.deepEqual(userBadges(users[3], { banned, now: NOW }).map(b => b.key), ['suspended']);
});

test('filter by query (name or email), role, and status', () => {
  const ids = (o) => filterUsers(users, { banned, now: NOW, ...o }).map(u => u.id);
  assert.deepEqual(ids({ query: 'MANAR' }), ['t']);
  assert.deepEqual(ids({ query: 'ولي' }), ['p']);
  assert.deepEqual(ids({ role: 'parent' }), ['p', 's']);
  assert.deepEqual(ids({ status: 'suspended' }), ['s']);
  assert.deepEqual(ids({ status: 'active' }), ['a', 't']);
  assert.deepEqual(ids({ status: 'never' }), ['p']);
  assert.deepEqual(ids({ status: 'teacher_request' }), ['p']);
  assert.deepEqual(filterUsers(null), []);
});

test('admins and self get no actions; suspended users get unsuspend; delete is last and danger', () => {
  assert.deepEqual(userActions(users[0], { now: NOW }), []);
  assert.deepEqual(userActions(users[1], { selfId: 't', now: NOW }), []);
  const sus = userActions(users[3], { banned, now: NOW }).map(a => a.id);
  assert.ok(sus.includes('unsuspend') && !sus.includes('suspend'));
  const act = userActions(users[1], { banned, now: NOW });
  assert.ok(act.some(a => a.id === 'suspend'));
  assert.equal(act.at(-1).id, 'delete');
  assert.equal(act.at(-1).danger, true);
});

test('delete impact: only profile/assignment rows allow deletion; set-null rows are detached', () => {
  const ok = classifyDeleteImpact([
    { table_name: 'profiles', column_name: 'id', on_delete: 'cascade', row_count: 1 },
    { table_name: 'teacher_subjects', column_name: 'teacher_id', on_delete: 'cascade', row_count: 2 },
    { table_name: 'curriculum_lessons', column_name: 'created_by', on_delete: 'set_null', row_count: 5 },
    { table_name: 'children', column_name: 'parent_id', on_delete: 'cascade', row_count: 0 },
  ]);
  assert.equal(ok.canDelete, true);
  assert.deepEqual(ok.removed.map(r => r.table), ['profiles', 'teacher_subjects']);
  assert.deepEqual(ok.detached.map(r => r.label), ['دروس أنشأها']);

  const blocked = classifyDeleteImpact([
    { table_name: 'children', column_name: 'parent_id', on_delete: 'cascade', row_count: 2 },
    { table_name: 'teacher_live_attendance', column_name: 'teacher_id', on_delete: 'restrict', row_count: 3 },
    { table_name: 'ai_tutor_knowledge', column_name: 'created_by', on_delete: 'no_action', row_count: 1 },
  ]);
  assert.equal(blocked.canDelete, false);
  assert.deepEqual(blocked.blockers.map(b => b.label), ['الأبناء', 'سجل حضور الحصص', 'ai_tutor_knowledge']);
  assert.equal(classifyDeleteImpact(null).canDelete, true);
});

test('delete impact: nested cascade (children of a parent profile) always blocks', () => {
  const r = classifyDeleteImpact([
    { table_name: 'parent_profiles', column_name: 'id', on_delete: 'cascade', row_count: 1 },
    { table_name: 'children', column_name: 'parent_id ← parent_profiles', on_delete: 'cascade_nested', row_count: 4 },
    { table_name: 'teacher_subjects', column_name: 'teacher_id ← x', on_delete: 'cascade_nested', row_count: 1 },
  ]);
  assert.equal(r.canDelete, false);
  assert.deepEqual(r.blockers.map(b => b.label), ['الأبناء', 'إسناد المواد']);
  assert.deepEqual(r.removed.map(b => b.table), ['parent_profiles']);
});
