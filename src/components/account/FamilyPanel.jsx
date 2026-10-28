import React, { useState } from 'react';
import { gradeLabel } from '../../utils/gradeLabel';
import { supabase } from '../../lib/supabase';
import { arabicAuthError } from './authErrors';
import Field from './Field';
import { GRADES } from './AuthCard';
import Emoji from '../../ui/Emoji';

/**
 * لوحة العائلة بعد تسجيل الدخول: بطاقة ولي الأمر + ملفات الأبناء + إضافة/حذف.
 * نفس عمليات Supabase السابقة — واجهة فقط.
 */
export default function FamilyPanel({ parent, kids, setKids, onSignOut }) {
  const [newChild, setNewChild] = useState({ name: '', grade: GRADES[0] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState(null);

  const addChild = async (e) => {
    e.preventDefault();
    if (!parent || !supabase) return;
    setError(''); setBusy(true);
    const { data, error: e2 } = await supabase.from('children')
      .insert({ parent_id: parent.id, name: newChild.name.trim(), grade: newChild.grade })
      .select().single();
    if (e2) setError(arabicAuthError(e2));
    else {
      setKids(k => [...k, data]);
      setNewChild(c => ({ ...c, name: '' }));
    }
    setBusy(false);
  };

  const removeChild = async (child) => {
    if (!supabase) return;
    setError('');
    const { error: e2 } = await supabase.from('children').delete().eq('id', child.id);
    if (e2) setError(arabicAuthError(e2));
    else setKids(k => k.filter(x => x.id !== child.id));
    setConfirmId(null);
  };

  return (
    <>
      <div className="fam-parent">
        <div className="fam-avatar" aria-hidden="true">{(parent.name || '؟').trim().charAt(0)}</div>
        <div className="who">
          <strong>{parent.name}</strong>
          <small>{parent.email}</small>
        </div>
        <button type="button" className="fam-out" onClick={onSignOut}>تسجيل الخروج</button>
      </div>

      <div aria-live="polite">
        {error && <div className="acct-alert error" role="alert">⚠️ <span>{error}</span></div>}
      </div>

      <h2 className="fam-sec-title">🧒 ملفات الأبناء {kids.length > 0 && <span className="tag-badge info">{kids.length}</span>}</h2>

      {kids.length === 0 && (
        <div className="fam-empty">لا توجد ملفات أبناء بعد — أضف أول ملف من النموذج بالأسفل 👇</div>
      )}

      {kids.map((c) => (
        <div className="fam-child" key={c.id}>
          <span className="emoji" aria-hidden="true"><Emoji>🧒</Emoji></span>
          <div className="info">
            <strong>{c.name}</strong>
            <span className="tag-badge info">{gradeLabel(c.grade)}</span>
          </div>
          {confirmId === c.id ? (
            <div className="fam-confirm">
              <button type="button" className="yes" onClick={() => removeChild(c)}>تأكيد الحذف</button>
              <button type="button" className="no" onClick={() => setConfirmId(null)}>إلغاء</button>
            </div>
          ) : (
            <button type="button" className="fam-del" onClick={() => setConfirmId(c.id)}>🗑 حذف</button>
          )}
        </div>
      ))}

      <form className="fam-add" onSubmit={addChild}>
        <h3 className="fam-sec-title" style={{ marginTop: 0 }}><Emoji>➕</Emoji> إضافة ابن/ابنة</h3>
        <Field
          label="اسم الطفل" required value={newChild.name}
          onChange={(e) => setNewChild(c => ({ ...c, name: e.target.value }))}
          placeholder="الاسم الأول يكفي"
        />
        <Field label="الصف الدراسي">
          <select
            value={newChild.grade}
            onChange={(e) => setNewChild(c => ({ ...c, grade: e.target.value }))}
          >
            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </Field>
        <button type="submit" className="acct-submit" disabled={busy}>
          {busy ? '⏳ لحظات...' : 'إضافة الملف'}
        </button>
      </form>
    </>
  );
}
