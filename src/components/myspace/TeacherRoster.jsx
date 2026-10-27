import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { DAY_NAMES, SLOT_TYPES } from '../../data/scheduleData';
import { uploadLessonRecording } from '../../hooks/useLessonRecordings';
import { minutesUntil, humanCountdown, sameAsCairo, formatLocal } from '../../utils/slotTime';
import { getLiveState } from '../../utils/liveWindow';
import { getTeacherSlotState } from '../../lib/teacherSlotState';
import { getTeacherCompletedCount } from '../../lib/teacherCompletion';
import { resolveTeacherRosterLoad } from '../../lib/teacherRosterLoadState';

const card = { background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 16, padding: 18, marginBottom: 16 };
const h2 = { fontSize: 17, color: 'var(--navy)', margin: '0 0 12px' };
const muted = { color: 'var(--muted)', fontSize: 13.5 };
const tabBtn = (on) => ({ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--line)', cursor: 'pointer', font: 'inherit', fontSize: 13.5, background: on ? 'var(--blue)' : 'var(--bg)', color: on ? 'white' : 'var(--navy)' });

// طلاب المعلم = من أسندهم له المسؤول فقط (teacher_students). حصصه = schedule_slots.teacher_id.
export default function TeacherRoster() {
  const { user } = useAuth();
  const { curriculumData, setSlotMeetingUrl } = useApp();
  const [urlDraft, setUrlDraft] = useState({});
  const [urlMsg, setUrlMsg] = useState({});
  const [tab, setTab] = useState('students');
  const [rec, setRec] = useState({});
  const setRecField = (id, patch) => setRec(r => ({ ...r, [id]: { ...(r[id] || {}), ...patch } }));
  const sendRecording = async (s) => {
    const d = rec[s.id] || {};
    setRecField(s.id, { msg: '… جارٍ الرفع (قد يستغرق وقتاً)', busy: true });
    const r = await uploadLessonRecording({ userId: user.id, file: d.file, lessonId: d.lessonId, slotId: s.id, confirmed: !!d.ok });
    setRecField(s.id, { busy: false, msg: r.ok ? 'أُرسل للمراجعة؛ يظهر للطلاب بعد قبول الإدارة ✓' : r.reason, ...(r.ok ? { file: null, ok: false } : {}) });
  };
  const [students, setStudents] = useState(null);
  const [slots, setSlots] = useState(null);
  const [slotError, setSlotError] = useState('');
  const slotState = getTeacherSlotState(slots, slotError);
  const [err, setErr] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [unlockBusy, setUnlockBusy] = useState({});
  // ساعة حية (كل دقيقة) لعدّاد «تبدأ خلال…» — بيانات حقيقية من مواعيد الجدول فقط
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);
  const showLocal = !sameAsCairo(now);
  const lessonTitleOf = (s) => (curriculumData?.[s.subject_id]?.lessons || []).find(l => l.id === s.lesson_ref)?.title;
  const liveOf = (s) => getLiveState({ day: s.day, time: s.time, durationMin: s.duration_min }, now);
  // الحصة الجارية تبقى «القادمة» حتى نهايتها (لا تقفز للأسبوع التالي)
  const nextOf = (s) => { const l = liveOf(s); return l.state === 'none' ? null : l.start; };
  const nextLive = (slots || [])
    .filter(s => s.slot_type === 'live')
    .map(s => ({ s, at: nextOf(s) }))
    .filter(x => x.at)
    .sort((a, b) => a.at - b.at)[0] || null;

  useEffect(() => {
    let active = true;
    setErr('');
    setStudents(null);
    setSlots(null);
    setSlotError('');

    const applyLoadError = (message) => {
      if (!active) return;
      setErr(message);
      setStudents(null);
      setSlots(null);
      setSlotError(message);
    };

    if (!supabase || !user?.id) {
      const result = resolveTeacherRosterLoad({ serviceAvailable: !!supabase, userId: user?.id });
      applyLoadError(result.message);
      return () => { active = false; };
    }

    (async () => {
      let studentsResult;
      let slotsResult;
      try {
        [studentsResult, slotsResult] = await Promise.all([
          supabase.from('teacher_students')
            .select('child_id, children(id, name, grade, avatar, exam_unlocked)').eq('teacher_id', user.id),
          supabase.from('schedule_slots').select('id, child_id, day, time, subject_id, slot_type, meeting_url, duration_min, children(name)')
            .eq('teacher_id', user.id).order('day').order('time'),
        ]);
      } catch (thrown) {
        const result = resolveTeacherRosterLoad({ serviceAvailable: true, userId: user.id, thrown });
        applyLoadError(result.message);
        return;
      }

      const result = resolveTeacherRosterLoad({ serviceAvailable: true, userId: user.id, studentsResult, slotsResult });
      if (result.status === 'error') {
        applyLoadError(result.message);
        return;
      }

      const kids = result.students.map(row => row.children).filter(Boolean);
      const ids = kids.map(child => child.id);
      let records = [];
      let recordsError = null;
      if (ids.length) {
        try {
          const recordsResult = await supabase.from('learning_records').select('child_id, status').in('child_id', ids);
          records = recordsResult.data || [];
          recordsError = recordsResult.error;
        } catch {
          recordsError = true;
        }
      }
      if (!active) return;
      setStudents(kids.map(child => ({
        ...child,
        completed: getTeacherCompletedCount(records.filter(record => record.child_id === child.id), recordsError),
      })));
      setSlots(result.slots);
    })().catch(() => {
      const result = resolveTeacherRosterLoad({ serviceAvailable: true, userId: user.id, thrown: true });
      applyLoadError(result.message);
    });

    return () => { active = false; };
  }, [user?.id, reloadKey]);

  return (
    <section style={card}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button style={tabBtn(tab === 'students')} onClick={() => setTab('students')}>👧 طلابي</button>
        <button style={tabBtn(tab === 'classes')} onClick={() => setTab('classes')}>🗓️ حصصي</button>
      </div>
      {err && <div role="alert" style={{ ...muted, color: 'var(--red-text)', marginBottom: 10 }}>
        <p style={{ margin: '0 0 6px' }}>{err}</p>
        <button type="button" style={tabBtn(false)} onClick={() => setReloadKey(key => key + 1)}>إعادة المحاولة</button>
      </div>}
      {tab === 'students' && (
        <>
          <h2 style={h2}>طلابي ({students?.length ?? '…'})</h2>
          {students?.length === 0 && !err && <p style={muted}>لم يُسنَد إليك أي طالب بعد. يُسنِد المسؤول الطلاب من «مساحتي».</p>}
          {students?.map(s => (
            <div key={s.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--line)', color: 'var(--navy)', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 22 }}>{s.avatar || '🧒'}</span>
              <div style={{ flex: 1 }}><strong>{s.name}</strong><div style={muted}>{s.grade}</div></div>
              <span style={muted}>{s.completed === null ? 'تعذر تحميل تقدم الدروس' : <>دروس مكتملة: <strong>{s.completed}</strong></>}</span>
              <button
                title="فتح/قفل محاكي السفارة يدوياً لهذا الطالب (يُفتح تلقائياً أيضاً بإكمال مادة كاملة)"
                style={{
                  border: '1px solid var(--line)', borderRadius: 999, padding: '5px 12px', fontSize: 12,
                  fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                  background: s.exam_unlocked ? 'var(--green-light)' : 'var(--bg)',
                  color: s.exam_unlocked ? 'var(--green-text)' : 'var(--muted)'
                }}
                disabled={!!unlockBusy[s.id]}
                onClick={async () => {
                  if (unlockBusy[s.id]) return;
                  const next = !s.exam_unlocked;
                  setUnlockBusy(current => ({ ...current, [s.id]: true }));
                  try {
                    const r = await supabase.rpc('set_exam_unlocked', { p_child_id: s.id, p_unlocked: next });
                    if (r.error) {
                      setErr('تعذر تغيير حالة المحاكي. أعد المحاولة، وإذا استمر الخطأ تواصل مع الإدارة التقنية.');
                      return;
                    }
                    setStudents(list => list.map(x => x.id === s.id ? { ...x, exam_unlocked: next } : x));
                  } catch {
                    setErr('تعذر تغيير حالة المحاكي. أعد المحاولة، وإذا استمر الخطأ تواصل مع الإدارة التقنية.');
                  } finally {
                    setUnlockBusy(current => ({ ...current, [s.id]: false }));
                  }
                }}
              >{s.exam_unlocked ? '🔓 المحاكي مفتوح' : '🔒 فتح المحاكي'}</button>
            </div>
          ))}
        </>
      )}
      {tab === 'classes' && (
        <>
          <h2 style={h2}>حصصي</h2>
          {slotState.status === 'loading' && <p style={muted}>جارٍ التحميل…</p>}
          {slotState.status === 'error' && <p role="alert" style={{ ...muted, color: 'var(--red-text)' }}>{slotState.message}</p>}
          {slotState.status === 'empty' && <p style={muted}>لا توجد حصص مسندة إليك في الجدول.</p>}
          {slotState.status === 'data' && <p style={muted}>أوقات الحصص بتوقيت القاهرة. أضف رابط الاجتماع (Zoom / Meet / Teams) لكل حصة؛ يظهر للطالب داخل درسه قبل الموعد بـ 15 دقيقة ويبقى مفتوحاً طوال مدة الحصة التي تحددها الإدارة (الافتراضي ساعة).</p>}
          {nextLive && (() => {
            const { s, at } = nextLive;
            const mins = minutesUntil(at, now);
            const soon = mins <= 60;
            const lessonTitle = lessonTitleOf(s);
            const kid = students?.find(k => k.id === s.child_id);
            return (
              <div role="status" style={{
                border: `1px solid ${soon ? 'var(--amber-text)' : 'var(--line)'}`,
                background: soon ? 'var(--yellow-light)' : 'var(--bg)',
                borderRadius: 14, padding: '12px 14px', margin: '4px 0 14px', fontSize: 13.5, color: 'var(--navy)',
              }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
                  <strong>⏰ حصتك المباشرة القادمة:</strong>
                  <span>{DAY_NAMES[s.day]} <span style={{ direction: 'ltr', display: 'inline-block' }}>{s.time}</span> بتوقيت القاهرة</span>
                  <strong style={{ color: soon ? 'var(--amber-text)' : 'var(--blue-text)' }}>— {mins <= 0 ? 'جارية الآن 🔴' : `تبدأ ${humanCountdown(mins)}`}</strong>
                </div>
                {showLocal && <div style={{ ...muted, marginTop: 4 }}>🌍 بتوقيتك المحلي: {formatLocal(at)}</div>}
                <ul style={{ margin: '8px 0 0', paddingInlineStart: 18, display: 'grid', gap: 3 }}>
                  <li>{s.meeting_url ? '✅ رابط الاجتماع جاهز' : '⚠️ رابط الاجتماع غير مُضاف بعد — أضفه من خانة الحصة أدناه'}</li>
                  <li>{lessonTitle ? `📘 درس الحصة: ${lessonTitle}` : 'ℹ️ لم تحدد الإدارة درساً لهذه الخانة بعد'}</li>
                  <li>👧 الطالب: {s.children?.name || '—'}{kid?.completed != null ? ` — أكمل ${kid.completed} درساً حتى الآن` : ''}</li>
                </ul>
              </div>
            );
          })()}
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
                {s.slot_type === 'live' && (() => {
                  const at = nextOf(s);
                  if (!at) return null;
                  return (
                    <div style={{ ...muted, marginTop: 4 }}>
                      {minutesUntil(at, now) <= 0 ? 'جارية الآن' : `تبدأ ${humanCountdown(minutesUntil(at, now))}`}{showLocal ? ` · بتوقيتك: ${formatLocal(at)}` : ''}
                      {!s.meeting_url && <strong style={{ color: 'var(--amber-text)' }}> · ⚠️ بلا رابط اجتماع</strong>}
                    </div>
                  );
                })()}
                {(
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
                {s.slot_type === 'live' && (
                  <details style={{ marginTop: 8 }}>
                    <summary style={{ cursor: 'pointer', ...muted }}>🎥 رفع تسجيل هذه الحصة</summary>
                    <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                      <select aria-label="الدرس" value={rec[s.id]?.lessonId || ''} onChange={e => setRecField(s.id, { lessonId: e.target.value })}
                        style={{ padding: '9px 10px', borderRadius: 10, border: '1px solid var(--line)' }}>
                        <option value="">اختر الدرس الذي شُرح في الحصة</option>
                        {(curriculumData?.[s.subject_id]?.lessons || []).map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                      </select>
                      <input type="file" accept="video/mp4,video/webm" aria-label="ملف التسجيل" onChange={e => setRecField(s.id, { file: e.target.files?.[0] || null })} />
                      <label style={{ ...muted, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <input type="checkbox" checked={!!rec[s.id]?.ok} onChange={e => setRecField(s.id, { ok: e.target.checked })} />
                        <span>أؤكد أن التسجيل يعرض شرحي وشاشة الدرس فقط، ولا يظهر فيه وجه أي طفل ولا صوته.</span>
                      </label>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <button style={tabBtn(true)} disabled={rec[s.id]?.busy || !rec[s.id]?.lessonId || !rec[s.id]?.file || !rec[s.id]?.ok} onClick={() => sendRecording(s)}>إرسال للمراجعة</button>
                        {rec[s.id]?.msg && <span role="status" style={muted}>{rec[s.id].msg}</span>}
                      </div>
                    </div>
                  </details>
                )}
              </div>
            );
          })}
        </>
      )}
    </section>
  );
}
