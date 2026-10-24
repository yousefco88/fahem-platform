import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { arabicAuthError } from './authErrors';
import Field, { PasswordStrength } from './Field';

export const GRADES = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس']
  .map(n => `الصف ${n} الابتدائي`);

/**
 * بطاقة إنشاء الحساب / تسجيل الدخول لولي الأمر.
 * نفس استدعاءات Supabase السابقة — واجهة فقط.
 */
export default function AuthCard() {
  const [mode, setMode] = useState('register');
  const [form, setForm] = useState({ name: '', child: '', grade: GRADES[0], email: '', password: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const switchMode = (m) => { setMode(m); setError(''); setNotice(''); };

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setNotice(''); setBusy(true);
    try {
      if (!supabase) throw new Error('إعدادات الاتصال غير متاحة في نسخة النشر الحالية.');

      if (mode === 'register') {
        const { data, error: se } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: { data: { full_name: form.name.trim() } }
        });
        if (se) throw se;

        if (data.session && data.user) {
          // جلسة فورية (تأكيد البريد معطّل): أنشئ الملفات مباشرة
          const { error: pe } = await supabase.from('parent_profiles')
            .upsert({ id: data.user.id, full_name: form.name.trim() });
          if (pe) throw pe;
          const { error: ce } = await supabase.from('children')
            .insert({ parent_id: data.user.id, name: form.child.trim(), grade: form.grade });
          if (ce) throw ce;
          // onAuthStateChange سيحدّث الواجهة تلقائياً
        } else {
          // تأكيد البريد مفعّل: لا جلسة بعد — أرشده بوضوح
          setNotice('تم إنشاء الحساب ✅ — أرسلنا رابط تأكيد إلى بريدك. بعد التأكيد سجّل الدخول وأضف ملف طفلك من لوحة العائلة.');
        }
      } else {
        const { error: se } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password
        });
        if (se) throw se;
      }
      setForm(f => ({ ...f, password: '' }));
    } catch (err) {
      setError(arabicAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    setError(''); setNotice('');
    if (!form.email.trim()) { setError('اكتب بريدك الإلكتروني في الحقل أولاً ثم اضغط «نسيت كلمة المرور».'); return; }
    if (!supabase) { setError('إعدادات الاتصال غير متاحة.'); return; }
    const { error: re } = await supabase.auth.resetPasswordForEmail(form.email.trim(), {
      redirectTo: window.location.origin
    });
    if (re) setError(arabicAuthError(re));
    else setNotice('أرسلنا رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني ✉️');
  };

  return (
    <>
      <div className="acct-tabs" role="tablist" aria-label="نوع الدخول">
        <button
          type="button" role="tab" aria-selected={mode === 'register'}
          className={`acct-tab${mode === 'register' ? ' active' : ''}`}
          onClick={() => switchMode('register')}
        >
          ✨ حساب جديد
        </button>
        <button
          type="button" role="tab" aria-selected={mode === 'login'}
          className={`acct-tab${mode === 'login' ? ' active' : ''}`}
          onClick={() => switchMode('login')}
        >
          🔑 تسجيل الدخول
        </button>
      </div>

      <div aria-live="polite">
        {error && <div className="acct-alert error" role="alert">⚠️ <span>{error}</span></div>}
        {notice && <div className="acct-alert ok">✓ <span>{notice}</span></div>}
      </div>

      <form onSubmit={submit}>
        {mode === 'register' && (
          <>
            <Field
              label="اسم ولي الأمر" required value={form.name} onChange={set('name')}
              placeholder="مثال: أحمد محمد" autoComplete="name"
            />
            <Field
              label="اسم الطفل" required value={form.child} onChange={set('child')}
              placeholder="مثال: جويرية" autoComplete="off"
            />
            <Field label="الصف الدراسي">
              <select value={form.grade} onChange={set('grade')}>
                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
          </>
        )}

        <Field
          label="البريد الإلكتروني" type="email" required value={form.email} onChange={set('email')}
          placeholder="name@example.com" autoComplete="email" dir="ltr"
        />
        <Field
          label="كلمة المرور" type="password" required
          value={form.password} onChange={set('password')}
          minLength={mode === 'register' ? 12 : undefined}
          placeholder={mode === 'register' ? '12 حرفاً على الأقل' : '••••••••••••'}
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          hint={mode === 'register' ? undefined : null}
        />
        {mode === 'register' && <PasswordStrength value={form.password} />}

        <button type="submit" className="acct-submit" disabled={busy}>
          {busy ? '⏳ لحظات...' : mode === 'register' ? 'إنشاء حساب الأسرة' : 'دخول'}
        </button>
      </form>

      {mode === 'login' && (
        <div className="acct-foot">
          <button type="button" className="acct-link" onClick={resetPassword}>
            نسيت كلمة المرور؟
          </button>
        </div>
      )}
    </>
  );
}
