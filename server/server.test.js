import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppServer } from './server.js';

async function withServer(run) {
  const server = createAppServer({ databasePath: ':memory:' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  try { await run(`http://127.0.0.1:${address.port}`); }
  finally { await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}

const postJson = (url, body, headers = {}) => fetch(url, {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body)
});

test('registers a parent, opens a session, and keeps child data scoped to that parent', async () => {
  await withServer(async base => {
    const registration = await postJson(`${base}/api/auth/register`, {
      parentName: 'ولي الأمر', email: 'Parent@example.com', password: 'A-strong-test-pass-123',
      childName: 'طفل تجريبي', grade: 'الصف الأول الابتدائي'
    });
    assert.equal(registration.status, 201);
    const cookie = registration.headers.get('set-cookie').split(';')[0];
    const session = await fetch(`${base}/api/auth/session`, { headers: { Cookie: cookie } });
    assert.equal(session.status, 200);
    const sessionData = await session.json();
    assert.equal(sessionData.parent.email, 'parent@example.com');
    assert.equal(sessionData.children.length, 1);

    const added = await postJson(`${base}/api/children`, { name: 'طفل ثان', grade: 'الصف السادس الابتدائي' }, { Cookie: cookie });
    assert.equal(added.status, 201);
    const children = await fetch(`${base}/api/children`, { headers: { Cookie: cookie } });
    assert.equal((await children.json()).children.length, 2);

    const unauthenticated = await fetch(`${base}/api/children`);
    assert.equal(unauthenticated.status, 401);

    const other = await postJson(`${base}/api/auth/register`, {
      parentName: 'ولي أمر آخر', email: 'other@example.com', password: 'Another-strong-pass-456',
      childName: 'ابن آخر', grade: 'الصف الثاني الابتدائي'
    });
    const otherCookie = other.headers.get('set-cookie').split(';')[0];
    const forbiddenDelete = await fetch(`${base}/api/children/${sessionData.children[0].id}`, { method: 'DELETE', headers: { Cookie: otherCookie } });
    assert.equal(forbiddenDelete.status, 404);
    const ownDelete = await fetch(`${base}/api/children/${sessionData.children[0].id}`, { method: 'DELETE', headers: { Cookie: cookie } });
    assert.equal(ownDelete.status, 200);
    const remaining = await fetch(`${base}/api/children`, { headers: { Cookie: cookie } });
    assert.equal((await remaining.json()).children.length, 1);
  });
});

test('requires password confirmation before account deletion and revokes its session', async () => {
  await withServer(async base => {
    const password = 'Deletion-test-password-123';
    const registration = await postJson(`${base}/api/auth/register`, {
      parentName: 'ولي الأمر', email: 'delete@example.com', password,
      childName: 'طفل تجريبي', grade: 'الصف الأول الابتدائي'
    });
    const cookie = registration.headers.get('set-cookie').split(';')[0];
    const rejected = await fetch(`${base}/api/auth/account`, { method: 'DELETE', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'incorrect-password' }) });
    assert.equal(rejected.status, 401);
    const deleted = await fetch(`${base}/api/auth/account`, { method: 'DELETE', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    assert.equal(deleted.status, 200);
    const session = await fetch(`${base}/api/auth/session`, { headers: { Cookie: cookie } });
    assert.equal((await session.json()).parent, null);
  });
});

test('rejects weak passwords, unsupported grades, bad credentials, and duplicate accounts', async () => {
  await withServer(async base => {
    const weak = await postJson(`${base}/api/auth/register`, {
      parentName: 'ولي الأمر', email: 'parent@example.com', password: 'weak', childName: 'طفل', grade: 'الصف الأول الابتدائي'
    });
    assert.equal(weak.status, 400);

    const invalidGrade = await postJson(`${base}/api/auth/register`, {
      parentName: 'ولي الأمر', email: 'parent@example.com', password: 'A-strong-test-pass-123', childName: 'طفل', grade: 'رياض الأطفال'
    });
    assert.equal(invalidGrade.status, 400);

    const account = { parentName: 'ولي الأمر', email: 'parent@example.com', password: 'A-strong-test-pass-123', childName: 'طفل', grade: 'الصف الأول الابتدائي' };
    assert.equal((await postJson(`${base}/api/auth/register`, account)).status, 201);
    assert.equal((await postJson(`${base}/api/auth/register`, account)).status, 409);
    assert.equal((await postJson(`${base}/api/auth/login`, { email: account.email, password: 'wrong-password-value' })).status, 401);
    assert.equal((await postJson(`${base}/api/auth/login`, { email: account.email, password: account.password })).status, 200);
  });
});

test('refuses cross-site authentication requests', async () => {
  await withServer(async base => {
    const response = await postJson(`${base}/api/auth/login`, {}, { Origin: 'https://untrusted.example' });
    assert.equal(response.status, 403);
  });
});
