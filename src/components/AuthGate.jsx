import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Field from './account/Field';
import { arabicAuthError } from './account/authErrors';
import './account/account.css';

const ROLE_LABELS = { parent: 'ولي أمر', teacher: 'معلم', admin: 'إدارة' };

function GateShell({ icon, title, children }) {
  return (
    <div className="acct-wrap">
      <div className="acct-card" style={{ maxWidth: '420px' }}>
        <header className="acct-head">
          <div className="acct-logo" aria-hidden="true">{icon}</div>
          <h2 style={{ fontSize: '20px' }}>{title}</h2>
        </header>
        {children}
      </div>
    </div>
  );
}

function LoginForm() {
  const { signIn, signUp, authError } = useAuth();
  const [mode, setMode] = useState('login'); // login | signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setNotice('');
    if (mode === 'login') {
      await signIn(email.trim(), password);
    } else {
      const { error } = await signUp(email.trim(), password, fullName.trim());
      if (!error) setNotice('تم إنشاء الحساب. إذا كان تأكيد البريد مفعلاً، افحص بريدك ثم سجّل الدخول.');
    }
    setBusy(false);
  };

  return (
    <form onSubmit={submit} style={{ textAlign: 'right' }}>
      {mode === 'signup' && (
        <Field
          label="الاسم الكامل" type="text" value={fullName}
          onChange={(e) => setFullName(e.target.value)} autoComplete="name"
          placeholder="مثال: أحمد محمد"
        />
      )}
      <Field
        label="البريد الإلكتروني" type="email" required value={email}
        onChange={(e) => setEmail(e.target.value)} autoComplete="email"
        placeholder="name@example.com"
      />
      <Field
        label="كلمة المرور" type="password" required minLength={8}
        value={password} onChange={(e) => setPassword(e.target.value)}
        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        placeholder={mode === 'login' ? '••••••••' : '8 أحرف على الأقل'}
      />

      <div aria-live="polite">
        {authError && <div className="acct-alert error" role="alert">⚠️ <span>{arabicAuthError(authError)}</span></div>}
        {notice && <div className="acct-alert ok">✓ <span>{notice}</span></div>}
      </div>

      <button type="submit" className="acct-submit" disabled={busy}>
        {busy ? '⏳ لحظات...' : mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
      </button>

      <div className="acct-foot">
        <button
          type="button"
          className="acct-link"
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setNotice(''); }}
        >
          {mode === 'login' ? 'ليس لديك حساب؟ أنشئ حساباً' : 'لديك حساب؟ سجّل الدخول'}
        </button>
      </div>
    </form>
  );
}

/**
 * AuthGate — يحمي الشاشات الحساسة.
 * roles: مصفوفة الأدوار المسموح بها، مثال ['admin'] أو ['teacher','admin'].
 * بدون roles: يكفي أي مستخدم مسجّل.
 */
export default function AuthGate({ roles, children }) {
  const { configured, loading, user, role, signOut } = useAuth();

  // Fail closed: لا إعداد Supabase = لا وصول للمناطق المحمية.
  if (!configured) {
    return (
      <GateShell icon="🔌" title="الخدمة غير مهيأة">
        <p style={{ fontSize: '13.5px', color: 'var(--muted)' }}>
          لم يتم ضبط متغيرات البيئة (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY).
          هذه المنطقة محمية ولا يمكن فتحها بدون اتصال آمن.
        </p>
      </GateShell>
    );
  }

  if (loading) {
    return (
      <GateShell icon="⏳" title="جارٍ التحقق من الجلسة...">
        <p style={{ fontSize: '13px', color: 'var(--muted)' }}>لحظات من فضلك</p>
      </GateShell>
    );
  }

  if (!user) {
    return (
      <GateShell icon="🔐" title="تسجيل الدخول مطلوب">
        <LoginForm />
      </GateShell>
    );
  }

  if (roles && roles.length > 0 && !roles.includes(role)) {
    return (
      <GateShell icon="⛔" title="غير مصرّح بالوصول">
        <p style={{ fontSize: '13.5px', color: 'var(--muted)', marginBottom: '16px' }}>
          هذه المساحة مخصصة لدور: {roles.map((r) => ROLE_LABELS[r] || r).join(' / ')}.
          {role ? ` دورك الحالي: ${ROLE_LABELS[role] || role}.` : ' لم يُحدَّد دور لحسابك بعد.'}
        </p>
        <button className="btn-secondary" onClick={signOut} style={{ width: '100%' }}>
          تسجيل الخروج والدخول بحساب آخر
        </button>
      </GateShell>
    );
  }

  return children;
}
