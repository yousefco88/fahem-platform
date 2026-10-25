import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { DAY_NAMES, SLOT_TYPES } from '../../data/scheduleData';

const card = { background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, padding: 18, marginBottom: 16 };
const h2 = { fontSize: 17, color: 'var(--navy)', margin: '0 0 12px' };
const muted = { color: '#475569', fontSize: 13.5 };
const tabBtn = (on) => ({ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--line)', cursor: 'pointer', font: 'inherit', fontSize: 13.5, background: on ? '#1d4ed8' : '#f8fafc', color: on ? 'white' : '#0f172a' });

// طلاب المعلم = من أسندهم له المسؤول فقط (teacher_students). حصصه = schedule_slots.teacher_id.
export default function TeacherRoster() {
  const { user } = useAuth();
  const { curriculumData, setSlotMeetingUrl } = useApp();
  const [urlDraft, setUrlDraft] = useState({});
  const [urlMsg, setUrlMsg] = useState({});
  const [tab, setTab] = useState('students');
  const [students, setStudents] = useState(null);
  const [slots, setSlots] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!supabase || !user) return;
    (async () => {
      const st = await supabase.from('teacher_students')
        .select('child_id, children(id, name, grade, avatar)').eq('teacher_id', user.id);
      if (st.error) {
        setErr('تعذر تحميل الطلاب (هل طُبّقت migration الإسناد؟): ' + st.error.message);
        setStudents([]);
      } else {
        const kids = st.data.map(r => r.children).filter(Boolean);
        const ids = kids.map(k => k.id);
        const rec = ids.length
          ? await supabase.from('learning_records').select('child_id, status').in('child_id', ids)
          : { data: [] };
        const done = {};
        (rec.data || []).forEach(r => { if (r.status === 'completed') done[r.child_id] = (done[r.child_id] || 0) + 1; });
        setStudents(kids.map(k => ({ ...k, completed: done[k.id] || 0 })));
      }
      const sl = await supabase.from('schedule_slots').select('id, child_id, day, time, subject_id, slot_type, meeting_url, children(name)')
        .eq('teacher_id', user.id).order('day').order('time');
      setSlots(sl.error ? [] : sl.data);
    })();
  }, [user?.id]);

  return (
    <section style={card}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button style={tabBtn(tab === 'students')} onClick={() => setTab('students')}>👧 طلابي</button>
        <button style={tabBtn(tab === 'classes')} onClick={() => setTab('classes')}>🗓️ حصصي</button>
      </div>
      {err && <p role="alert" style={{ ...muted, color: '#b91c1c' }}>{err}</p>}
      {tab === 'students' && (
        <>
          <h2 style={h2}>طلابي ({students?.length ?? '…'})</h2>
          {students?.length === 0 && !err && <p style={muted}>لم يُسنَد إليك أي طالب بعد. يُسنِد المسؤول الطلاب من «مساحتي».</p>}
          {students?.map(s => (
            <div key={s.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--line)', color: 'var(--navy)' }}>
              <span style={{ fontSize: 22 }}>{s.avatar || '🧒'}</span>
              <div style={{ flex: 1 }}><strong>{s.name}</strong><div style={muted}>{s.grade}</div></div>
              <span style={muted}>دروس مكتملة: <strong>{s.completed}</strong></span>
            </div>
          ))}
        </>
      )}
      {tab === 'classes' && (
        <>
          <h2 style={h2}>حصصي</h2>
          {slots === null && <p style={muted}>جارٍ التحميل…</p>}
          {slots?.length === 0 && <p style={muted}>لا توجد حصص مسندة إليك في الجدول.</p>}
          {slots?.length > 0 && <p style={muted}>أوقات الحصص بتوقيت القاهرة. أضف رابط الاجتماع (Zoom / Meet / Teams) لكل حصة؛ يظهر للطالب داخل درسه قبل الموعد بـ 15 دقيقة.</p>}
          {slots?.map(s => {
            const draft = urlDraft[s.id] ?? s.meeting_url ?? '';
            const save = async () => {
              setUrlMsg(m => ({ ...m, [s.id]: '…' }));
              const r = await setSlotMeetingUrl(s.id, draft.trim());
              setUrlMsg(m => ({ ...m, [s.id]: r.ok ? 'تم الحفظ ✓' : r.reason }));
              if (r.ok) setSlots(list => list.map(x => x.id === s.id ? { ...x, meeting_url: draft.trim() || null } : x));
            };
            return (
              <div key={s.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--line)', color: 'var(--navy)', fontSize: 14 }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <strong>{DAY_NAMES[s.day]}</strong>
                  <span style={{ direction: 'ltr' }}>{s.time}</span>
                  <span>{curriculumData?.[s.subject_id]?.title || s.subject_id}</span>
                  <span>· {s.children?.name || 'طالب'}</span>
                  <span style={{ ...muted, marginInlineStart: 'auto' }}>{SLOT_TYPES[s.slot_type]?.label}</span>
                </div>
                {s.slot_type === 'live' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <input
                      type="url" inputMode="url" dir="ltr" placeholder="https://…" aria-label="رابط الاجتماع"
                      value={draft} onChange={e => setUrlDraft(d => ({ ...d, [s.id]: e.target.value }))}
                      style={{ flex: '1 1 220px', minWidth: 0, padding: '9px 10px', borderRadius: 10, border: '1px solid var(--line)' }}
                    />
                    <button style={tabBtn(true)} onClick={save}>حفظ الرابط</button>
                    {urlMsg[s.id] && <span role="status" style={muted}>{urlMsg[s.id]}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </section>
  );
}
