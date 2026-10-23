import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS = { parent: 'ولي أمر', teacher: 'معلم', admin: 'إدارة' };

function GateShell({ icon, title, children }) {
  return (
    <div style={{
      flex: 1, display: 'grid', placeItems: 'center', padding: '24px',
      background: 'linear-gradient(160deg, #f8fafc 0%, #eef2ff 100%)'
    }}>
      <div style={{
        width: '100%', maxWidth: '420px', background: 'white',
        border: '1px solid var(--line)', borderRadius: '20px',
        padding: '28px', boxShadow: 'var(--shadow-md, 0 10px 30px rgba(15,23,42,.08))',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '40px', marginBottom: '10px' }}>{icon}</div>
        <h2 style={{ fontSize: '20px', color: 'var(--navy)', marginBottom: '16px' }}>{title}</h2>
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

  const inputStyle = {
    width: '100%', padding: '12px 14px', borderRadius: '12px',
    border: '1px solid var(--line)', fontSize: '14px', fontFamily: 'inherit',
    marginBottom: '12px', textAlign: 'right'
  };

  return (
    <form onSubmit={submit}>
      {mode === 'signup' && (
        <input
          style={inputStyle} type="text" placeholder="الاسم الكامل"
          value={fullName} onChange={(e) => setFullName(e.target.value)}
          autoComplete="name"
        />
      )}
      <input
        style={{ ...inputStyle, direction: 'ltr', textAlign: 'left' }} type="email" required
        placeholder="البريد الإلكتروني" value={email}
        onChange={(e) => setEmail(e.target.value)} autoComplete="email"
      />
      <input
        style={{ ...inputStyle, direction: 'ltr', textAlign: 'left' }} type="password" required minLength={8}
        placeholder="كلمة المرور (8 أحرف على الأقل)" value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
      />

      {authError && (
        <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '10px' }}>⚠️ {authError}</p>
      )}
      {notice && (
        <p style={{ color: '#059669', fontSize: '13px', marginBottom: '10px' }}>✓ {notice}</p>
      )}

      <button type="submit" className="btn-accent" disabled={busy} style={{ width: '100%', padding: '12px', fontSize: '15px' }}>
        {busy ? '... جارٍ التنفيذ' : mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
      </button>

      <button
        type="button"
        onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setNotice(''); }}
        style={{ background: 'none', border: 'none', color: 'var(--blue, #2563eb)', fontSize: '13px', marginTop: '14px', cursor: 'pointer', fontFamily: 'inherit' }}
      >
        {mode === 'login' ? 'ليس لديك حساب؟ أنشئ حساباً' : 'لديك حساب؟ سجّل الدخول'}
      </button>
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
