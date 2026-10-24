import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { getChildStats } from '../../utils/childProgress';
import { DAY_NAMES, SLOT_TYPES } from '../../data/scheduleData';
import { ROLE_LABELS, resolveNavRole } from '../../navigation/navConfig';
import ParentAccount from '../ParentAccount';
import TeacherRoster from './TeacherRoster';
import AssignStudents from './AssignStudents';

const card = { background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, padding: 18, marginBottom: 16 };
const h2 = { fontSize: 17, color: '#0f172a', margin: '0 0 12px' };
const muted = { color: '#475569', fontSize: 13.5 };
const btn = { padding: '9px 14px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', cursor: 'pointer', font: 'inherit', fontSize: 13.5 };
const btnPrimary = { ...btn, background: '#1d4ed8', borderColor: '#1d4ed8', color: 'white' };

function Stat({ label, value }) {
  return (
    <div style={{ flex: '1 1 120px', background: '#f8fafc', borderRadius: 12, padding: 12, textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{value}</div>
      <div style={{ fontSize: 12, color: '#475569' }}>{label}</div>
    </div>
  );
}

function TodaySchedule({ slots, curriculumData }) {
  const todayIdx = new Date().getDay();
  const today = (slots || []).filter(s => s.day === todayIdx).sort((a, b) => a.time.localeCompare(b.time));
  return (
    <section style={card}>
      <h2 style={h2}>📅 جدول اليوم — {DAY_NAMES[todayIdx]}</h2>
      {today.length === 0 ? (
        <p style={muted}>لا توجد خانات في الجدول لهذا اليوم.</p>
      ) : today.map(s => (
        <div key={s.id} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: 14, color: '#0f172a' }}>
          <strong style={{ direction: 'ltr' }}>{s.time}</strong>
          <span>{SLOT_TYPES[s.type]?.icon} {curriculumData?.[s.subjectId]?.title || s.subjectId}</span>
          <span style={{ ...muted, marginInlineStart: 'auto' }}>{SLOT_TYPES[s.type]?.label}</span>
        </div>
      ))}
    </section>
  );
}

function ParentSpace({ go }) {
  const { childrenList, activeChild, switchChild, curriculumData, learningRecords, scheduleData } = useApp();
  const [attempts, setAttempts] = useState(null);

  useEffect(() => {
    if (!supabase) { setAttempts([]); return; }
    supabase.from('exam_attempts').select('id, child_name, percentage, band, created_at')
      .order('created_at', { ascending: false }).limit(3)
      .then(({ data }) => setAttempts(data || []));
  }, []);

  const stats = activeChild ? getChildStats(curriculumData, learningRecords, activeChild.masteredLessons) : null;

  return (
    <>
      <TodaySchedule slots={scheduleData} curriculumData={curriculumData} />
      <section style={card}>
        <h2 style={h2}>👧 أبنائي ({childrenList.length})</h2>
        {childrenList.length === 0 && <p style={muted}>لم تُضف ملفات أبناء بعد — أضفهم من قسم «إدارة ملفات الأبناء» أدناه.</p>}
        {childrenList.map(c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: 24 }}>{c.avatar || '🧒'}</span>
            <div style={{ flex: 1, color: '#0f172a' }}>
              <strong>{c.name}</strong>
              <div style={muted}>{c.grade}{activeChild?.id === c.id ? ' — الملف النشط' : ''}</div>
            </div>
            <button style={btnPrimary} onClick={() => { switchChild(c.id); go('child'); }}>فتح مساحته</button>
          </div>
        ))}
        {stats && (
          <>
            <p style={{ ...muted, margin: '14px 0 8px' }}>تقدّم {activeChild.name} (محسوب من سجل التعلم الفعلي):</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Stat label="دروس متقنة" value={`${stats.done}/${stats.total}`} />
              <Stat label="نقاط" value={stats.points} />
              <Stat label="أيام متتالية" value={stats.streak} />
            </div>
          </>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <button style={btn} onClick={() => go('parent')}>لوحة ولي الأمر</button>
          <button style={btn} onClick={() => go('exam')}>محاكي الامتحانات</button>
        </div>
      </section>
      <section style={card}>
        <h2 style={h2}>📝 آخر نتائج المحاكي</h2>
        {attempts === null && <p style={muted}>جارٍ التحميل…</p>}
        {attempts?.length === 0 && <p style={muted}>لا توجد نتائج موثقة حتى الآن.</p>}
        {attempts?.map(a => (
          <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', color: '#0f172a', fontSize: 14 }}>
            <span>{a.child_name || 'طفل'} — {new Date(a.created_at).toLocaleDateString('ar-EG')}</span>
            <strong>{Math.round(a.percentage)}%{a.band ? ` · ${a.band}` : ''}</strong>
          </div>
        ))}
      </section>
    </>
  );
}

function TeacherSpace({ go, setShowLiveModal }) {
  const { scheduleData, curriculumData } = useApp();
  const liveToday = (scheduleData || []).filter(s => s.day === new Date().getDay() && s.type === 'live').length;
  return (
    <>
      <TodaySchedule slots={scheduleData} curriculumData={curriculumData} />
      <section style={card}>
        <h2 style={h2}>🛠️ أدواتك</h2>
        <p style={muted}>حصص مباشرة مجدولة اليوم: <strong>{liveToday}</strong></p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={btnPrimary} onClick={() => go('teacher')}>مساحة المعلم</button>
          <button style={btn} onClick={() => setShowLiveModal(true)}>🔴 الفصل الحي</button>
          <button style={btn} onClick={() => go('lessons')}>الدروس المسجلة</button>
        </div>
      </section>
    </>
  );
}

function AdminSpace({ go, isAdmin }) {
  const [counts, setCounts] = useState(null);
  useEffect(() => {
    if (!supabase) { setCounts({}); return; }
    Promise.all([
      supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'new'),
      supabase.from('parent_profiles').select('id', { count: 'exact', head: true }),
      supabase.from('children').select('id', { count: 'exact', head: true })
    ]).then(([b, p, c]) => setCounts({ newBookings: b.count, families: p.count, children: c.count }));
  }, []);
  const v = x => (x == null ? '—' : x);
  return (
    <section style={card}>
      <h2 style={h2}>⚙️ نظرة سريعة</h2>
      {counts === null ? <p style={muted}>جارٍ التحميل…</p> : (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Stat label="حجوزات جديدة" value={v(counts.newBookings)} />
          <Stat label="أسر" value={v(counts.families)} />
          <Stat label="أبناء" value={v(counts.children)} />
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        <button style={btnPrimary} onClick={() => go('admin')}>لوحة الإدارة</button>
        {isAdmin && <button style={btn} onClick={() => go('analytics')}>التحليلات</button>}
      </div>
    </section>
  );
}

function PersonalSettings() {
  const { user, profile, signOut } = useAuth();
  const [name, setName] = useState(profile?.full_name || '');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setName(profile?.full_name || ''); }, [profile?.full_name]);

  const saveName = async (e) => {
    e.preventDefault();
    if (!supabase || !name.trim()) return;
    setBusy(true);
    const clean = name.trim();
    const { error } = await supabase.from('profiles').update({ full_name: clean }).eq('id', user.id);
    // parent_profiles مصدر اسم لوحة ولي الأمر؛ لا يُحدَّث إلا إن كان للمستخدم صف فيه
    const { error: pe } = error ? { error: null } : await supabase.from('parent_profiles').update({ full_name: clean }).eq('id', user.id);
    setMsg(error ? `تعذر الحفظ: ${error.message}` : pe ? `حُفظ الاسم في الحساب، وتعذر تحديث ملف ولي الأمر: ${pe.message}` : 'تم حفظ الاسم. سيظهر بعد إعادة التحميل.');
    setBusy(false);
  };
  const resetPassword = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: window.location.origin });
    setMsg(error ? error.message : 'أرسلنا رابط تغيير كلمة المرور إلى بريدك.');
  };
  return (
    <section style={card}>
      <h2 style={h2}>⚙️ الإعدادات الشخصية</h2>
      <form onSubmit={saveName} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="الاسم الكامل" aria-label="الاسم الكامل"
          style={{ flex: '1 1 200px', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 10, font: 'inherit' }} />
        <button style={btnPrimary} disabled={busy}>حفظ الاسم</button>
      </form>
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <button style={btn} onClick={resetPassword}>🔐 تغيير كلمة المرور بالبريد</button>
        <button style={btn} onClick={signOut}>تسجيل الخروج</button>
      </div>
      {msg && <p role="status" style={{ ...muted, marginTop: 10 }}>{msg}</p>}
    </section>
  );
}

export default function MySpace() {
  const { user, role, profile, loading } = useAuth();
  const { setCurrentScreen, setShowLiveModal } = useApp();
  const navRole = resolveNavRole(user, role);

  if (loading) return <main dir="rtl" style={{ padding: 40, textAlign: 'center', color: '#475569' }}>جارٍ التحقق من الجلسة…</main>;
  // غير مسجّل: نموذج الدخول/التسجيل الحالي كما هو
  if (!user) return <ParentAccount />;

  const name = profile?.full_name || user.email;
  const staff = navRole === 'admin' || navRole === 'content_editor';

  return (
    <main dir="rtl" style={{ maxWidth: 760, width: 'calc(100% - 32px)', margin: '24px auto', color: '#0f172a' }}>
      <section style={{ ...card, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#1d4ed8', color: 'white', display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 800 }}>
          {(name || '?').trim().charAt(0)}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 20, margin: 0 }}>مرحباً، {name}</h1>
          <div style={muted}>{user.email}</div>
        </div>
        <span style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: 999, padding: '4px 12px', fontSize: 12.5, fontWeight: 700 }}>
          {ROLE_LABELS[navRole]}
        </span>
      </section>

      {navRole === 'parent' && <ParentSpace go={setCurrentScreen} />}
      {navRole === 'teacher' && <TeacherSpace go={setCurrentScreen} setShowLiveModal={setShowLiveModal} />}
      {navRole === 'teacher' && <TeacherRoster />}
      {staff && <AdminSpace go={setCurrentScreen} isAdmin={navRole === 'admin'} />}
      {navRole === 'admin' && <AssignStudents />}

      <PersonalSettings />

      {navRole === 'parent' && (
        <details style={card}>
          <summary style={{ cursor: 'pointer', fontWeight: 700 }}>👧 إدارة ملفات الأبناء (إضافة / حذف)</summary>
          <ParentAccount embedded />
        </details>
      )}
    </main>
  );
}
