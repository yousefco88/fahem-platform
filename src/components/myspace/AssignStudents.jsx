import React, { useEffect, useState } from 'react';
import { gradeLabel } from '../../utils/gradeLabel';
import { supabase } from '../../lib/supabase';
import { resolveAssignmentLoad } from '../../lib/assignmentLoadState';

const card = { background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 16, padding: 18, marginBottom: 16 };
const muted = { color: 'var(--muted)', fontSize: 13.5 };
const sel = { flex: '1 1 180px', padding: '9px 10px', border: '1px solid var(--line)', borderRadius: 10, font: 'inherit' };
const btn = { padding: '9px 14px', borderRadius: 10, border: '1px solid #1d4ed8', background: 'var(--blue-dark)', color: 'white', cursor: 'pointer', font: 'inherit', fontSize: 13.5 };

// للمسؤول فقط: إسناد طالب لمعلم (RLS يمنع غير المسؤول حتى لو ظهرت الواجهة).
export default function AssignStudents() {
  const [teachers, setTeachers] = useState([]);
  const [kids, setKids] = useState([]);
  const [links, setLinks] = useState([]);
  const [t, setT] = useState('');
  const [c, setC] = useState('');
  const [msg, setMsg] = useState('');
  const [loadStatus, setLoadStatus] = useState('loading');

  const load = async () => {
    setLoadStatus('loading');
    try {
      if (!supabase) throw new Error('Supabase unavailable');
      const results = await Promise.all([
        supabase.from('profiles').select('id, full_name').eq('role', 'teacher'),
        supabase.from('children').select('id, name, grade, exam_unlocked'),
        supabase.from('teacher_students').select('teacher_id, child_id')
      ]);
      const result = resolveAssignmentLoad(results);
      if (result.status === 'error') throw result.error;
      setTeachers(result.teachers);
      setKids(result.kids);
      setLinks(result.links);
      setLoadStatus(result.status);
    } catch {
      setLoadStatus('error');
    }
  };
  useEffect(() => { load(); }, []);

  const tName = id => teachers.find(x => x.id === id)?.full_name || 'معلم';
  const kName = id => kids.find(x => x.id === id)?.name || 'طالب';

  if (loadStatus === 'loading' || loadStatus === 'error') {
    return (
      <section style={card}>
        <h2 style={{ fontSize: 17, margin: '0 0 12px', color: 'var(--navy)' }}>🔗 إسناد الطلاب للمعلمين</h2>
        {loadStatus === 'loading'
          ? <p role="status" style={muted}>جارٍ تحميل بيانات الإسناد…</p>
          : <div role="alert">
              <p style={muted}>تعذر تحميل بيانات الإسناد. أعد المحاولة، وإذا استمر الخطأ تواصل مع الإدارة التقنية.</p>
              <button type="button" style={btn} onClick={load}>إعادة المحاولة</button>
            </div>}
      </section>
    );
  }

  const assign = async () => {
    if (!t || !c) return;
    const { error } = await supabase.from('teacher_students').insert({ teacher_id: t, child_id: c });
    setMsg(error ? (error.code === '23505' ? 'مُسنَد مسبقاً.' : error.message) : 'تم الإسناد.');
    load();
  };
  const unassign = async (l) => {
    const { error } = await supabase.from('teacher_students').delete().eq('teacher_id', l.teacher_id).eq('child_id', l.child_id);
    setMsg(error ? error.message : 'أُزيل الإسناد.');
    load();
  };

  // تحكم الأدمن اليدوي في محاكي السفارة لكل طالب (يُفتح تلقائياً أيضاً بإكمال مادة كاملة)
  const toggleExam = async (k) => {
    const { error } = await supabase.rpc('set_exam_unlocked', { p_child_id: k.id, p_unlocked: !k.exam_unlocked });
    setMsg(error ? ('تعذر تغيير حالة المحاكي: ' + error.message) : (k.exam_unlocked ? 'أُقفل المحاكي لـ' : 'فُتح المحاكي لـ') + ' ' + k.name + '.');
    load();
  };

  return (
    <section style={card}>
      <h2 style={{ fontSize: 17, margin: '0 0 12px', color: 'var(--navy)' }}>🔗 إسناد الطلاب للمعلمين</h2>
      {teachers.length === 0 && <p style={muted}>لا يوجد معلمون مسجلون (غيّر دور الحساب إلى معلم أولاً).</p>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select aria-label="المعلم" style={sel} value={t} onChange={e => setT(e.target.value)}>
          <option value="">— المعلم —</option>
          {teachers.map(x => <option key={x.id} value={x.id}>{x.full_name || x.id.slice(0, 8)}</option>)}
        </select>
        <select aria-label="الطالب" style={sel} value={c} onChange={e => setC(e.target.value)}>
          <option value="">— الطالب —</option>
          {kids.map(x => <option key={x.id} value={x.id}>{x.name} ({gradeLabel(x.grade)})</option>)}
        </select>
        <button style={btn} onClick={assign}>إسناد</button>
      </div>
      {links.map(l => (
        <div key={l.teacher_id + l.child_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', color: 'var(--navy)', fontSize: 14 }}>
          <span>{kName(l.child_id)} ← {tName(l.teacher_id)}</span>
          <button onClick={() => unassign(l)} style={{ ...muted, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red-text)' }}>إزالة</button>
        </div>
      ))}
      {msg && <p role="status" style={{ ...muted, marginTop: 8 }}>{msg}</p>}

      <h3 style={{ fontSize: 15, margin: '18px 0 8px', color: 'var(--navy)' }}>🇪🇬 محاكي السفارة لكل طالب</h3>
      <p style={muted}>يُفتح تلقائياً بإكمال الطالب مادة كاملة — وهنا الفتح/القفل اليدوي:</p>
      {kids.length === 0 && <p style={muted}>لا يوجد طلاب بعد.</p>}
      {kids.map(k => (
        <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', color: 'var(--navy)', fontSize: 14 }}>
          <span>{k.name} ({k.grade})</span>
          <button
            onClick={() => toggleExam(k)}
            style={{
              border: '1px solid var(--line)', borderRadius: 999, padding: '4px 12px', fontSize: 12,
              fontWeight: 800, cursor: 'pointer', font: 'inherit',
              background: k.exam_unlocked ? 'var(--green-light)' : 'var(--bg)',
              color: k.exam_unlocked ? 'var(--green-text)' : 'var(--muted)'
            }}
          >{k.exam_unlocked ? '🔓 مفتوح' : '🔒 فتح المحاكي'}</button>
        </div>
      ))}
    </section>
  );
}
