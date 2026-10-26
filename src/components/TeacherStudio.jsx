/**
 * TeacherStudio.jsx — مساحة المعلم (/teacher)
 * كل الأرقام حقيقية من Supabase عبر RLS (حصص المعلم + طلابه المسندون).
 * التصميم الموثق في migration 20261025130000: الإدارة وحدها تكتب الجدول؛
 * المعلم يقرأ حصصه ويضع رابط الاجتماع من «مساحتي ← حصصي».
 * لذلك زر الجدولة واعٍ بالدور: الأدمن → لوحة الإدارة؛ المعلم → مساحتي.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { DAY_NAMES, SLOT_TYPES } from '../data/scheduleData';

const cardStyle = {
  background: 'var(--card-bg)', border: '1px solid var(--line)',
  borderRadius: 'var(--radius-md)', padding: '20px',
  display: 'flex', justifyContent: 'space-between'
};
const iconBox = (bg, color) => ({
  width: '46px', height: '46px', borderRadius: '12px', background: bg,
  color, display: 'grid', placeItems: 'center', fontSize: '22px', flexShrink: 0
});

export default function TeacherStudio() {
  const { allSlots, slotsLoaded, curriculumData, triggerToast } = useApp();
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const [students, setStudents] = useState(null);   // null = جارٍ التحميل
  const [mastery, setMastery] = useState(null);     // { done, total } | 'none'

  // طلابي المسندون + نسبة الإتقان من سجلاتهم الفعلية (RLS يحصر النطاق تلقائياً)
  useEffect(() => {
    if (!supabase || !user?.id) return;
    let cancelled = false;
    (async () => {
      const ts = await supabase
        .from('teacher_students')
        .select('child_id, children(name)')
        .eq('teacher_id', user.id);
      if (cancelled) return;
      if (ts.error) { setStudents([]); setMastery('none'); return; }
      const rows = ts.data || [];
      setStudents(rows);
      if (!rows.length) { setMastery('none'); return; }
      const lr = await supabase
        .from('learning_records')
        .select('status')
        .in('child_id', rows.map(r => r.child_id));
      if (cancelled) return;
      if (lr.error || !(lr.data || []).length) { setMastery('none'); return; }
      setMastery({
        done: lr.data.filter(r => r.status === 'completed').length,
        total: lr.data.length
      });
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // حصصي من الجدول الحقيقي (RLS: teacher_id أو طلابي المسندون)
  const mySlots = allSlots.filter(s => s.teacherId === user?.id);
  const today = new Date().getDay();
  const todaySlots = mySlots.filter(s => s.day === today).sort((a, b) => String(a.time).localeCompare(String(b.time)));
  const subjectsCount = Object.keys(curriculumData || {}).length;

  const masteryLabel = mastery === 'none' || mastery === null
    ? '—'
    : `${Math.round((mastery.done / mastery.total) * 100)}%`;

  const handleScheduleClick = () => {
    if (role === 'admin') {
      navigate('/admin'); // جدولة الحصص تتم من لوحة الإدارة (قسم الجداول)
    } else {
      triggerToast('جدولة الحصص تتم عبر الإدارة — تجد حصصك وروابطها في «مساحتي ← حصصي»');
      navigate('/account');
    }
  };

  return (
    <div className="teacher-page">
      {/* Teacher Hero Banner */}
      <section className="teacher-hero">
        <div>
          <h1 style={{ fontSize: '26px', marginBottom: '6px' }}>مرحباً بك في مساحة المعلم 👋</h1>
          <p style={{ opacity: 0.9, fontSize: '14px', maxWidth: '600px' }}>
            مساحة معلم المنهج المصري — تغطية متكاملة لجميع مواد الصف الأول الابتدائي (عربي، ماث، إنجليزي كونكت، ديسكفر، وقيم وأخلاق).
          </p>
        </div>
        <div>
          <button
            className="btn-accent"
            style={{ background: '#fef08a', color: '#064e3b' }}
            onClick={handleScheduleClick}
          >
            <span>{role === 'admin' ? '🗓 إدارة جدولة الحصص' : '🗓 حصصي وروابط اجتماعاتي'}</span>
          </button>
        </div>
      </section>

      {/* Metrics Grid — أرقام حقيقية فقط */}
      <section className="teacher-metrics">
        <div style={cardStyle}>
          <div>
            <span className="u-17">حصصي المجدولة أسبوعياً</span>
            <h3 className="u-18">{slotsLoaded ? mySlots.length : '…'}</h3>
            <small style={{ color: 'var(--muted)', fontWeight: 600 }}>
              {slotsLoaded && mySlots.length === 0 ? 'لم تُسند لك حصص بعد — الجدولة عبر الإدارة' : 'من جدول الحصص الفعلي'}
            </small>
          </div>
          <div style={iconBox('#ecfdf5', '#10b981')}>🗓</div>
        </div>

        <div style={cardStyle}>
          <div>
            <span className="u-17">طلابي المسندون إليّ</span>
            <h3 className="u-18">{students === null ? '…' : students.length}</h3>
            <small style={{ color: 'var(--muted)', fontWeight: 600 }}>
              {students !== null && students.length === 0 ? '👥 لم يُسند لك طلاب بعد (يتم الإسناد من الإدارة)' : 'من سجل الإسناد الفعلي'}
            </small>
          </div>
          <div style={iconBox('var(--blue-light)', 'var(--blue)')}>🎒</div>
        </div>

        <div style={cardStyle}>
          <div>
            <span className="u-17">نسبة إتقان طلابي</span>
            <h3 className="u-18">{masteryLabel}</h3>
            <small style={{ color: 'var(--muted)', fontWeight: 600 }}>
              {masteryLabel === '—' ? 'تُحتسب من نتائج الطلاب الفعلية' : `${mastery.done} درس مكتمل من ${mastery.total} سجل`}
            </small>
          </div>
          <div style={iconBox('#fefce8', '#ca8a04')}>🏆</div>
        </div>

        <div style={cardStyle}>
          <div>
            <span className="u-17">المواد المتاحة بالمنصة</span>
            <h3 style={{ fontSize: '28px', color: '#0284c7', marginBottom: '6px' }}>{subjectsCount ? `${subjectsCount} مادة` : '…'}</h3>
            <small style={{ color: '#0284c7', fontWeight: 600 }}>من المنهج المنشور فعلياً</small>
          </div>
          <div style={iconBox('#f0f9ff', '#0284c7')}>📚</div>
        </div>
      </section>

      {/* قائمة المتابعة — من نتائج الإتقان الفعلية */}
      <div style={{
        background: 'var(--orange-light)', border: '2px solid var(--line)', borderRadius: 'var(--radius-lg)',
        padding: '24px', marginBottom: '30px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '18px', color: 'var(--orange-text)' }}>⚠️ قائمة المتابعة الخاصة: طلاب بحاجة لتشجيع في الحصة القادمة</h3>
            <span style={{ fontSize: '12.5px', color: 'var(--orange-text)' }}>مرصودون تلقائياً عبر نتائج محاولات الإتقان في مختلف المواد:</span>
          </div>
        </div>

        <div style={{ background: 'var(--card-bg)', border: '1px dashed var(--line)', borderRadius: 'var(--radius-md)', padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', marginBottom: '6px' }}>📭</div>
          <p style={{ fontSize: '13.5px', color: 'var(--muted)' }}>
            {students !== null && students.length === 0
              ? 'لم يُسند لك طلاب بعد — ستظهر قائمة المتابعة تلقائياً بعد الإسناد وبدء الحصص الفعلية.'
              : 'لا توجد بيانات كافية بعد — ستظهر قائمة المتابعة تلقائياً بعد تسجيل محاولات الإتقان.'}
          </p>
        </div>
      </div>

      {/* Two Column Section */}
      <div className="teacher-cols">
        <div className="u-16">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--line)' }}>
            <h3 style={{ fontSize: '18px', color: 'var(--navy)' }}><span>🗓️</span> جدول حصصي اليوم — {DAY_NAMES[today]}</h3>
          </div>
          {!slotsLoaded ? (
            <p style={{ fontSize: '13px', color: 'var(--muted)' }}>جارٍ تحميل الجدول…</p>
          ) : todaySlots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px', color: 'var(--muted)' }}>
              <div style={{ fontSize: '26px', marginBottom: '6px' }}>📭</div>
              <p style={{ fontSize: '13px' }}>لا حصص لك اليوم — كامل جدولك وروابط الاجتماعات في «مساحتي ← حصصي».</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {todaySlots.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid var(--line)', borderRadius: '12px', padding: '10px 14px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, color: 'var(--navy)', fontSize: '14px', minWidth: '58px' }}>{s.time}</span>
                  <span style={{ flex: 1, fontSize: '13.5px', color: 'var(--navy)', fontWeight: 700 }}>
                    {SLOT_TYPES?.[s.type]?.icon || '📖'} {curriculumData?.[s.subjectId]?.title || s.subjectId}
                  </span>
                  {s.meetingUrl ? (
                    <a href={s.meetingUrl} target="_blank" rel="noreferrer" style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--blue-text)' }}>🎥 رابط الحصة</a>
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>بلا رابط — أضفه من «حصصي»</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
