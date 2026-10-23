import { createServer } from 'node:http';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const scrypt = promisify(scryptCallback);
const SESSION_DAYS = 7;
const COOKIE_NAME = 'fahem_session';
const GRADES = new Set(Array.from({ length: 6 }, (_, index) => `الصف ${['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'][index]} الابتدائي`));
const rateLimits = new Map();

function createDatabase(databasePath) {
  if (databasePath !== ':memory:') mkdirSync(dirname(resolve(databasePath)), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS parents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS children (
      id TEXT PRIMARY KEY,
      parent_id TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      grade TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS children_parent_id_idx ON children(parent_id);
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      parent_id TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);
  `);
  return db;
}

function json(response, status, payload, headers = {}) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
  response.end(JSON.stringify(payload));
}

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map(part => part.trim().split('=').map(decodeURIComponent)).filter(parts => parts.length === 2));
}

function cookie(value, secure) {
  return `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}${secure ? '; Secure' : ''}`;
}

function requestIsSecure(request) {
  return request.socket.encrypted === true;
}

function clientKey(request) {
  return request.socket.remoteAddress || 'unknown';
}

function hasAllowedOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return true;
  try { return ['localhost', '127.0.0.1', '::1'].includes(new URL(origin).hostname); }
  catch { return false; }
}

function isRateLimited(request) {
  const now = Date.now();
  const key = clientKey(request);
  const entry = rateLimits.get(key);
  if (!entry || now - entry.startedAt > 15 * 60_000) {
    rateLimits.set(key, { startedAt: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > 20;
}

async function readJson(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 16_384) throw Object.assign(new Error('حجم الطلب كبير.'), { status: 413 });
  }
  try { return JSON.parse(body || '{}'); }
  catch { throw Object.assign(new Error('صيغة الطلب غير صحيحة.'), { status: 400 }); }
}

function parentFromSession(db, request) {
  const rawToken = parseCookies(request.headers.cookie)[COOKIE_NAME];
  if (!rawToken || !/^[a-f0-9]{64}$/.test(rawToken)) return null;
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
  return db.prepare(`SELECT parents.id, parents.name, parents.email
    FROM sessions JOIN parents ON parents.id = sessions.parent_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?`).get(tokenHash, Date.now()) || null;
}

function validText(value, min, max) {
  return typeof value === 'string' && value.trim().length >= min && value.trim().length <= max;
}

export function createAppServer({ databasePath = process.env.FAHEM_DB_PATH || './data/fahem.sqlite' } = {}) {
  const db = createDatabase(databasePath);

  const server = createServer(async (request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    try {
      if (request.method === 'GET' && url.pathname === '/api/health') {
        json(response, 200, { status: 'ok', service: 'fahem-local-api', storage: 'sqlite', scope: 'local-development-only' });
        return;
      }

      if (request.method === 'POST' && ['/api/auth/register', '/api/auth/login', '/api/auth/logout'].includes(url.pathname)) {
        if (!hasAllowedOrigin(request)) {
          json(response, 403, { error: 'مصدر الطلب غير مسموح.' });
          return;
        }
        if (isRateLimited(request)) {
          json(response, 429, { error: 'محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة.' }, { 'Retry-After': '900' });
          return;
        }
      }

      if (request.method === 'POST' && url.pathname === '/api/auth/register') {
        const body = await readJson(request);
        const name = body.parentName?.trim();
        const email = body.email?.trim().toLowerCase();
        const password = body.password;
        const childName = body.childName?.trim();
        const grade = body.grade;
        if (!validText(name, 2, 100) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '') || typeof password !== 'string' || password.length < 12 || password.length > 128 || !validText(childName, 1, 80) || !GRADES.has(grade)) {
          json(response, 400, { error: 'تحقق من الاسم والبريد وكلمة المرور (12 حرفًا على الأقل) وبيانات الطفل والصف.' });
          return;
        }
        if (db.prepare('SELECT 1 FROM parents WHERE email = ?').get(email)) {
          json(response, 409, { error: 'يوجد حساب بهذا البريد بالفعل.' });
          return;
        }
        const parentId = randomBytes(16).toString('hex');
        const childId = randomBytes(16).toString('hex');
        const rawToken = randomBytes(32).toString('hex');
        const salt = randomBytes(16);
        const passwordHash = await scrypt(password, salt, 64);
        const now = new Date().toISOString();
        const transaction = db.prepare('BEGIN IMMEDIATE');
        transaction.run();
        try {
          db.prepare('INSERT INTO parents(id, name, email, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(parentId, name, email, salt.toString('hex'), passwordHash.toString('hex'), now);
          db.prepare('INSERT INTO children(id, parent_id, name, grade, created_at) VALUES (?, ?, ?, ?, ?)').run(childId, parentId, childName, grade, now);
          db.prepare('INSERT INTO sessions(token_hash, parent_id, expires_at) VALUES (?, ?, ?)').run(createHash('sha256').update(rawToken).digest('hex'), parentId, Date.now() + SESSION_DAYS * 86400_000);
          db.exec('COMMIT');
        } catch (error) {
          db.exec('ROLLBACK');
          if (error.code === 'ERR_SQLITE_CONSTRAINT_UNIQUE') {
            json(response, 409, { error: 'يوجد حساب بهذا البريد بالفعل.' });
            return;
          }
          throw error;
        }
        json(response, 201, { parent: { id: parentId, name, email }, children: [{ id: childId, name: childName, grade }] }, { 'Set-Cookie': cookie(rawToken, requestIsSecure(request)) });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/auth/login') {
        const body = await readJson(request);
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        const parent = db.prepare('SELECT id, name, email, password_salt, password_hash FROM parents WHERE email = ?').get(email);
        const salt = parent ? Buffer.from(parent.password_salt, 'hex') : Buffer.alloc(16);
        const expected = parent ? Buffer.from(parent.password_hash, 'hex') : Buffer.alloc(64);
        const actual = await scrypt(typeof body.password === 'string' ? body.password : '', salt, 64);
        if (!parent || !timingSafeEqual(expected, actual)) {
          json(response, 401, { error: 'البريد أو كلمة المرور غير صحيحة.' });
          return;
        }
        const rawToken = randomBytes(32).toString('hex');
        db.prepare('INSERT INTO sessions(token_hash, parent_id, expires_at) VALUES (?, ?, ?)').run(createHash('sha256').update(rawToken).digest('hex'), parent.id, Date.now() + SESSION_DAYS * 86400_000);
        json(response, 200, { parent: { id: parent.id, name: parent.name, email: parent.email } }, { 'Set-Cookie': cookie(rawToken, requestIsSecure(request)) });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/auth/logout') {
        const rawToken = parseCookies(request.headers.cookie)[COOKIE_NAME];
        if (rawToken && /^[a-f0-9]{64}$/.test(rawToken)) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(createHash('sha256').update(rawToken).digest('hex'));
        json(response, 200, { ok: true }, { 'Set-Cookie': cookie('', requestIsSecure(request)).replace('Max-Age=604800', 'Max-Age=0') });
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/auth/session') {
        const parent = parentFromSession(db, request);
        if (!parent) {
          json(response, 200, { parent: null });
          return;
        }
        json(response, 200, { parent, children: db.prepare('SELECT id, name, grade FROM children WHERE parent_id = ? ORDER BY created_at').all(parent.id) });
        return;
      }

      const parent = parentFromSession(db, request);
      if (request.method === 'GET' && url.pathname === '/api/children') {
        if (!parent) { json(response, 401, { error: 'يلزم تسجيل الدخول.' }); return; }
        json(response, 200, { children: db.prepare('SELECT id, name, grade FROM children WHERE parent_id = ? ORDER BY created_at').all(parent.id) });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/children') {
        if (!parent) { json(response, 401, { error: 'يلزم تسجيل الدخول.' }); return; }
        if (!hasAllowedOrigin(request)) { json(response, 403, { error: 'مصدر الطلب غير مسموح.' }); return; }
        const body = await readJson(request);
        const name = body.name?.trim();
        if (!validText(name, 1, 80) || !GRADES.has(body.grade)) { json(response, 400, { error: 'اسم الطفل أو الصف غير صحيح.' }); return; }
        const child = { id: randomBytes(16).toString('hex'), name, grade: body.grade };
        db.prepare('INSERT INTO children(id, parent_id, name, grade, created_at) VALUES (?, ?, ?, ?, ?)').run(child.id, parent.id, child.name, child.grade, new Date().toISOString());
        json(response, 201, { child });
        return;
      }

      if (request.method === 'DELETE' && /^\/api\/children\/[a-f0-9]{32}$/.test(url.pathname)) {
        if (!parent) { json(response, 401, { error: 'يلزم تسجيل الدخول.' }); return; }
        if (!hasAllowedOrigin(request)) { json(response, 403, { error: 'مصدر الطلب غير مسموح.' }); return; }
        const childId = url.pathname.split('/').at(-1);
        const result = db.prepare('DELETE FROM children WHERE id = ? AND parent_id = ?').run(childId, parent.id);
        if (result.changes === 0) { json(response, 404, { error: 'ملف الطفل غير موجود في حسابك.' }); return; }
        json(response, 200, { ok: true });
        return;
      }

      if (request.method === 'DELETE' && url.pathname === '/api/auth/account') {
        if (!parent) { json(response, 401, { error: 'يلزم تسجيل الدخول.' }); return; }
        if (!hasAllowedOrigin(request)) { json(response, 403, { error: 'مصدر الطلب غير مسموح.' }); return; }
        const body = await readJson(request);
        const stored = db.prepare('SELECT password_salt, password_hash FROM parents WHERE id = ?').get(parent.id);
        const actual = await scrypt(typeof body.password === 'string' ? body.password : '', Buffer.from(stored.password_salt, 'hex'), 64);
        const expected = Buffer.from(stored.password_hash, 'hex');
        if (!timingSafeEqual(expected, actual)) { json(response, 401, { error: 'كلمة المرور غير صحيحة؛ لم يُحذف الحساب.' }); return; }
        db.prepare('DELETE FROM parents WHERE id = ?').run(parent.id);
        json(response, 200, { ok: true }, { 'Set-Cookie': cookie('', requestIsSecure(request)).replace('Max-Age=604800', 'Max-Age=0') });
        return;
      }

      json(response, 404, { error: 'المسار غير موجود.' });
    } catch (error) {
      json(response, error.status || 500, { error: error.status ? error.message : 'حدث خطأ داخلي.' });
    }
  });

  server.on('close', () => db.close());
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const host = process.env.FAHEM_HOST || '127.0.0.1';
  const port = Number(process.env.FAHEM_PORT || 3011);
  if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
    console.error('رفض تشغيل الخادم على واجهة شبكة عامة: هذا API تجريبي محلي وغير جاهز للنشر.');
    process.exit(1);
  }
  const server = createAppServer();
  server.listen(port, host, () => console.log(`Fahem local API listening at http://${host}:${port}`));
}
