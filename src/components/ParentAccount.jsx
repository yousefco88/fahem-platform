import React, { useEffect, useState } from 'react';

const GRADE_OPTIONS = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'].map((number, index) => ({
  label: `الصف ${number} الابتدائي`, value: `الصف ${number} الابتدائي`, key: index
}));

const fieldStyle = { width: '100%', padding: '12px 14px', border: '1px solid #cbd5e1', borderRadius: 10, font: 'inherit', marginTop: 6 };

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'تعذر تنفيذ الطلب.');
  return payload;
}

export default function ParentAccount() {
  const [mode, setMode] = useState('register');
  const [parent, setParent] = useState(null);
  const [children, setChildren] = useState([]);
  const [health, setHealth] = useState('جارٍ التحقق من API المحلي…');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ parentName: '', email: '', password: '', childName: '', grade: GRADE_OPTIONS[0].value });
  const [newChild, setNewChild] = useState({ name: '', grade: GRADE_OPTIONS[0].value });
  const [deletePassword, setDeletePassword] = useState('');

  const refreshSession = async () => {
    const data = await api('/api/auth/session');
    setParent(data.parent);
    setChildren(data.children || []);
  };

  useEffect(() => {
    api('/api/health').then(data => setHealth(`متصل — تخزين SQLite محلي (${data.scope})`)).catch(() => setHealth('API غير متصل — شغّل npm run api:dev في نافذة طرفية أخرى.'));
    refreshSession().catch(() => setHealth('API غير متصل — شغّل npm run api:dev في نافذة طرفية أخرى.'));
  }, []);

  const submit = async event => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await api(`/api/auth/${mode}`, { method: 'POST', body: JSON.stringify(form) });
      setParent(data.parent);
      setChildren(data.children || []);
      setForm(current => ({ ...current, password: '' }));
    } catch (requestError) {
      setError(requestError.message);
    } finally { setBusy(false); }
  };

  const logout = async () => {
    setError('');
    try { await api('/api/auth/logout', { method: 'POST', body: '{}' }); setParent(null); setChildren([]); }
    catch (requestError) { setError(requestError.message); }
  };

  const addChild = async event => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await api('/api/children', { method: 'POST', body: JSON.stringify(newChild) });
      setChildren(current => [...current, data.child]);
      setNewChild(current => ({ ...current, name: '' }));
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };

  const removeChild = async child => {
    if (!window.confirm(`هل تريد حذف ملف ${child.name} من الحساب؟`)) return;
    setError('');
    try {
      await api(`/api/children/${child.id}`, { method: 'DELETE' });
      setChildren(current => current.filter(item => item.id !== child.id));
    } catch (requestError) { setError(requestError.message); }
  };

  const deleteAccount = async event => {
    event.preventDefault();
    if (!window.confirm('سيُحذف حساب ولي الأمر وجميع ملفات الأبناء من قاعدة البيانات المحلية. هل تريد المتابعة؟')) return;
    setError('');
    setBusy(true);
    try {
      await api('/api/auth/account', { method: 'DELETE', body: JSON.stringify({ password: deletePassword }) });
      setParent(null);
      setChildren([]);
      setDeletePassword('');
      setMode('register');
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };

  return (
    <main dir="rtl" style={{ maxWidth: 760, width: 'calc(100% - 32px)', margin: '40px auto', color: '#0f172a' }}>
      <section style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 20, padding: 28, boxShadow: '0 12px 30px #0f172a0d' }}>
        <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '6px 12px', borderRadius: 99, fontSize: 13, fontWeight: 700 }}>تجربة حساب ولي الأمر</span>
        <h1 style={{ margin: '18px 0 8px', fontSize: 28 }}>حساب ولي الأمر والأبناء</h1>
        <p style={{ color: '#475569', lineHeight: 1.8, marginTop: 0 }}>هذه شريحة خلفية تجريبية تعمل على جهازك. لا تستخدم بيانات حقيقية للأطفال قبل إعداد الخادم وسياسات الخصوصية والتشغيل الآمن.</p>
        <div role="status" style={{ background: '#f8fafc', padding: 12, borderRadius: 10, fontSize: 13 }}>{health}</div>

        {error && <div role="alert" style={{ background: '#fff1f2', color: '#9f1239', padding: 12, borderRadius: 10, marginTop: 14 }}>{error}</div>}

        {parent ? (
          <div style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div><strong>{parent.name}</strong><div style={{ color: '#64748b', marginTop: 4 }}>{parent.email}</div></div>
              <button type="button" onClick={logout} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}>تسجيل الخروج</button>
            </div>
            <h2 style={{ fontSize: 19, marginTop: 28 }}>ملفات الأبناء المحفوظة على الخادم المحلي</h2>
            {children.length ? <ul style={{ paddingRight: 22 }}>{children.map(child => <li key={child.id} style={{ padding: '7px 0', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}><span>{child.name} — {child.grade}</span><button type="button" onClick={() => removeChild(child)} style={{ border: '1px solid #fecdd3', color: '#9f1239', background: '#fff1f2', padding: '6px 10px', borderRadius: 8, cursor: 'pointer' }}>حذف الملف</button></li>)}</ul> : <p style={{ color: '#64748b' }}>لا توجد ملفات أبناء بعد.</p>}
            <form onSubmit={addChild} style={{ borderTop: '1px solid #e2e8f0', paddingTop: 20, marginTop: 18 }}>
              <h3 style={{ fontSize: 16 }}>إضافة ابن/ابنة</h3>
              <label>اسم الطفل<input required maxLength={80} value={newChild.name} onChange={event => setNewChild({ ...newChild, name: event.target.value })} style={fieldStyle} /></label>
              <label style={{ display: 'block', marginTop: 14 }}>الصف<select value={newChild.grade} onChange={event => setNewChild({ ...newChild, grade: event.target.value })} style={fieldStyle}>{GRADE_OPTIONS.map(option => <option key={option.key} value={option.value}>{option.label}</option>)}</select></label>
              <button disabled={busy} className="btn-accent" style={{ marginTop: 14 }}>إضافة الملف</button>
            </form>
            <details style={{ marginTop: 28, borderTop: '1px solid #e2e8f0', paddingTop: 18 }}>
              <summary style={{ color: '#9f1239', cursor: 'pointer', fontWeight: 700 }}>حذف حساب ولي الأمر</summary>
              <p style={{ color: '#64748b', lineHeight: 1.7 }}>سيحذف الحساب وجميع ملفات الأبناء والجلسات المرتبطة به من قاعدة البيانات المحلية. يلزم تأكيد كلمة المرور.</p>
              <form onSubmit={deleteAccount}>
                <label>كلمة المرور للتأكيد<input required type="password" autoComplete="current-password" value={deletePassword} onChange={event => setDeletePassword(event.target.value)} style={fieldStyle} /></label>
                <button disabled={busy} type="submit" style={{ marginTop: 12, padding: '10px 14px', border: 0, borderRadius: 9, background: '#be123c', color: 'white', cursor: 'pointer' }}>حذف الحساب نهائيًا</button>
              </form>
            </details>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, marginTop: 22 }}>
              <button type="button" onClick={() => { setMode('register'); setError(''); }} aria-pressed={mode === 'register'} style={{ padding: '9px 14px', borderRadius: 9, border: 0, background: mode === 'register' ? '#2563eb' : '#f1f5f9', color: mode === 'register' ? 'white' : '#0f172a', cursor: 'pointer' }}>إنشاء حساب</button>
              <button type="button" onClick={() => { setMode('login'); setError(''); }} aria-pressed={mode === 'login'} style={{ padding: '9px 14px', borderRadius: 9, border: 0, background: mode === 'login' ? '#2563eb' : '#f1f5f9', color: mode === 'login' ? 'white' : '#0f172a', cursor: 'pointer' }}>تسجيل الدخول</button>
            </div>
            <form onSubmit={submit} style={{ marginTop: 18 }}>
              {mode === 'register' && <>
                <label>اسم ولي الأمر<input required maxLength={100} autoComplete="name" value={form.parentName} onChange={event => setForm({ ...form, parentName: event.target.value })} style={fieldStyle} /></label>
                <label style={{ display: 'block', marginTop: 14 }}>اسم الطفل<input required maxLength={80} autoComplete="off" value={form.childName} onChange={event => setForm({ ...form, childName: event.target.value })} style={fieldStyle} /></label>
                <label style={{ display: 'block', marginTop: 14 }}>الصف<select value={form.grade} onChange={event => setForm({ ...form, grade: event.target.value })} style={fieldStyle}>{GRADE_OPTIONS.map(option => <option key={option.key} value={option.value}>{option.label}</option>)}</select></label>
              </>}
              <label style={{ display: 'block', marginTop: 14 }}>البريد الإلكتروني<input required type="email" maxLength={254} autoComplete="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} style={fieldStyle} /></label>
              <label style={{ display: 'block', marginTop: 14 }}>كلمة المرور<input required type="password" minLength={12} maxLength={128} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} style={fieldStyle} /><small style={{ color: '#64748b' }}>12 حرفًا على الأقل</small></label>
              <button disabled={busy} className="btn-accent" style={{ width: '100%', justifyContent: 'center', marginTop: 20 }}>{busy ? 'جارٍ التنفيذ…' : mode === 'register' ? 'إنشاء الحساب التجريبي' : 'تسجيل الدخول'}</button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
