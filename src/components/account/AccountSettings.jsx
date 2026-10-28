import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { arabicAuthError } from './authErrors';
import Field from './Field';

/** تحكم ولي الأمر بحسابه: الاسم، كلمة المرور، إنهاء الجلسات الأخرى. */
export default function AccountSettings({ parent, onRenamed }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(parent.name || '');
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);
  const ok = (text) => setMsg({ type: 'ok', text });
  const bad = (text) => setMsg({ type: 'error', text });

  const saveName = async (e) => {
    e.preventDefault();
    const v = name.trim();
    if (!v) return bad('الاسم فارغ');
    setBusy(true);
    const { error } = await supabase.from('parent_profiles').update({ full_name: v }).eq('id', parent.id);
    setBusy(false);
    if (error) return bad(arabicAuthError(error));
    onRenamed?.(v); ok('تم حفظ الاسم ✓');
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (newPw.length < 8) return bad('كلمة المرور الجديدة 8 أحرف على الأقل');
    setBusy(true);
    // تأكيد الهوية بكلمة المرور الحالية قبل التغيير
    const re = await supabase.auth.signInWithPassword({ email: parent.email, password: oldPw });
    if (re.error) { setBusy(false); return bad('كلمة المرور الحالية غير صحيحة'); }
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setBusy(false);
    if (error) return bad(arabicAuthError(error));
    setOldPw(''); setNewPw(''); ok('تم تغيير كلمة المرور ✓');
  };

  const signOutOthers = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signOut({ scope: 'others' });
    setBusy(false);
    error ? bad(arabicAuthError(error)) : ok('تم تسجيل الخروج من الأجهزة الأخرى ✓');
  };

  return (
    <div style={{ margin: '12px 0' }}>
      <button type="button" className="fam-out" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        ⚙️ إعدادات الحساب {open ? '▴' : '▾'}
      </button>
      {open && (
        <div style={{ display: 'grid', gap: 14, marginTop: 10 }}>
          <div aria-live="polite">
            {msg.text && <div className={`acct-alert ${msg.type}`} role={msg.type === 'error' ? 'alert' : 'status'}>{msg.type === 'error' ? '⚠️ ' : ''}<span>{msg.text}</span></div>}
          </div>
          <form className="fam-add" onSubmit={saveName}>
            <h3 className="fam-sec-title" style={{ marginTop: 0 }}>✏️ الاسم</h3>
            <Field label="الاسم الظاهر" required value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            <button type="submit" className="acct-submit" disabled={busy}>حفظ الاسم</button>
          </form>
          <form className="fam-add" onSubmit={savePassword}>
            <h3 className="fam-sec-title" style={{ marginTop: 0 }}>🔑 تغيير كلمة المرور</h3>
            <Field label="كلمة المرور الحالية" type="password" required autoComplete="current-password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} />
            <Field label="كلمة المرور الجديدة" type="password" required autoComplete="new-password" hint="8 أحرف على الأقل" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
            <button type="submit" className="acct-submit" disabled={busy}>تغيير كلمة المرور</button>
          </form>
          <div className="fam-add">
            <h3 className="fam-sec-title" style={{ marginTop: 0 }}>📱 الأجهزة</h3>
            <p style={{ margin: '0 0 8px' }}>تسجيل الخروج من كل الأجهزة الأخرى مع بقاء هذا الجهاز.</p>
            <button type="button" className="fam-out" onClick={signOutOthers} disabled={busy}>خروج من الأجهزة الأخرى</button>
          </div>
          <small>لإيقاف الحساب مؤقتاً أو حذفه: تواصل مع إدارة المنصة.</small>
        </div>
      )}
    </div>
  );
}
