import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const card = { background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, padding: 18, marginBottom: 16 };
const muted = { color: '#475569', fontSize: 13.5 };
const sel = { flex: '1 1 180px', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 10, font: 'inherit' };
const btn = { padding: '9px 14px', borderRadius: 10, border: '1px solid #1d4ed8', background: '#1d4ed8', color: 'white', cursor: 'pointer', font: 'inherit', fontSize: 13.5 };

// للمسؤول فقط: إسناد طالب لمعلم (RLS يمنع غير المسؤول حتى لو ظهرت الواجهة).
export default function AssignStudents() {
  const [teachers, setTeachers] = useState([]);
  const [kids, setKids] = useState([]);
  const [links, setLinks] = useState([]);
  const [t, setT] = useState('');
  const [c, setC] = useState('');
  const [msg, setMsg] = useState('');

  const load = async () => {
    const [tr, kr, lr] = await Promise.all([
      supabase.from('profiles').select('id, full_name').eq('role', 'teacher'),
      supabase.from('children').select('id, name, grade'),
      supabase.from('teacher_students').select('teacher_id, child_id')
    ]);
    const bad = tr.error || kr.error || lr.error;
    if (bad) { setMsg('تعذر التحميل: ' + bad.message); return; }
    setTeachers(tr.data); setKids(kr.data); setLinks(lr.data);
  };
  useEffect(() => { if (supabase) load(); }, []);

  const tName = id => teachers.find(x => x.id === id)?.full_name || 'معلم';
  const kName = id => kids.find(x => x.id === id)?.name || 'طالب';

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

  return (
    <section style={card}>
      <h2 style={{ fontSize: 17, margin: '0 0 12px', color: '#0f172a' }}>🔗 إسناد الطلاب للمعلمين</h2>
      {teachers.length === 0 && <p style={muted}>لا يوجد معلمون مسجلون (غيّر دور الحساب إلى معلم أولاً).</p>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select aria-label="المعلم" style={sel} value={t} onChange={e => setT(e.target.value)}>
          <option value="">— المعلم —</option>
          {teachers.map(x => <option key={x.id} value={x.id}>{x.full_name || x.id.slice(0, 8)}</option>)}
        </select>
        <select aria-label="الطالب" style={sel} value={c} onChange={e => setC(e.target.value)}>
          <option value="">— الطالب —</option>
          {kids.map(x => <option key={x.id} value={x.id}>{x.name} ({x.grade})</option>)}
        </select>
        <button style={btn} onClick={assign}>إسناد</button>
      </div>
      {links.map(l => (
        <div key={l.teacher_id + l.child_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', color: '#0f172a', fontSize: 14 }}>
          <span>{kName(l.child_id)} ← {tName(l.teacher_id)}</span>
          <button onClick={() => unassign(l)} style={{ ...muted, background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}>إزالة</button>
        </div>
      ))}
      {msg && <p role="status" style={{ ...muted, marginTop: 8 }}>{msg}</p>}
    </section>
  );
}
