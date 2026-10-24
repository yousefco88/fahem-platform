import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { getTodayPlan, getContinueLesson } from '../../utils/todayPlan';
import { getSubjectProgress } from '../../utils/childProgress';
import { DAY_NAMES, SLOT_TYPES } from '../../data/scheduleData';
import { CHILD_SUBJECTS, CHILD_CATEGORIES, childPaths } from './childSubjects';
import StreakBadge from './StreakBadge';
import useStreak from '../../hooks/useStreak';

// /child — الرئيسية: التحية + تابِع من حيث توقفت + يومك النهارده + المواد بتقدمها الحقيقي
export default function ChildHome() {
  const navigate = useNavigate();
  const {
    activeChild, curriculumData, activeSubject, soundManager, triggerToast,
    setShowLiveModal, setCurrentScreen, learningRecords, scheduleData
  } = useApp();
  const [activeCategory, setActiveCategory] = useState('all');

  // 🔥 Streak & XP system
  const streak = useStreak(activeChild?.id);

  const masteredLessons = activeChild.masteredLessons || [];
  const todayPlan = getTodayPlan({ schedule: scheduleData, curriculum: curriculumData, learningRecords, masteredLessons });
  const continueLesson = getContinueLesson(curriculumData, learningRecords, masteredLessons);
  const todayName = DAY_NAMES[new Date().getDay()];
  const currentSubjectObj = curriculumData[activeSubject] || curriculumData.arabic;
  const firstLesson = [...(currentSubjectObj?.lessons || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0];

  const goLesson = (id, tab = 'video') => navigate(childPaths.lesson(id, tab), { state: { fromApp: true } });

  const handleMascotSpeak = () => {
    soundManager.speak(`أهلاً يا ${activeChild.name}! أنت بطل متميز. اختر مادة واضغط على أي محطة لنلعب ونفهم سوا!`);
    triggerToast('🦊 الثعلب فاهم يرحب بك!');
  };

  const subjects = CHILD_SUBJECTS
    .filter(s => curriculumData[s.id])
    .filter(s => activeCategory === 'all' || s.category === activeCategory);

  return (
    <>
      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, #4338ca, #3b82f6 60%, #06b6d4)',
        color: 'white', borderRadius: '32px', padding: '32px 40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px',
        boxShadow: '0 20px 35px rgba(59, 130, 246, 0.25)', marginBottom: '28px'
      }}>
        <div>
          <div style={{
            background: 'rgba(255,255,255,0.2)', display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '4px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 800, marginBottom: '12px'
          }}>
            <span>🔴 الحصص المباشرة ستبدأ قريباً</span>
            <button
              style={{ background: 'white', color: 'var(--navy)', borderRadius: '50%', width: '22px', height: '22px', display: 'grid', placeItems: 'center', fontSize: '11px' }}
              onClick={() => soundManager.speak('الحصص المباشرة ستبدأ قريباً')}
              title="استمع للصوت"
            >🔊</button>
          </div>
          <h1 style={{ fontSize: '32px', marginBottom: '8px', fontWeight: 900 }}>
            جاهز نفهم ونلعب سوا يا {activeChild.name}؟ 🌟
          </h1>
          <p style={{ fontSize: '16px', color: '#e0e7ff', maxWidth: '580px', marginBottom: '20px' }}>
            كل مواد المنهج المصري (عربي، ماث، إنجليزي، ديسكفر، وأخلاق) موجودة في جزيرتك — اختر مادة وابدأ رحلتك.
          </p>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              style={{
                background: '#facc15', color: '#1e1b4b', fontSize: '18px', fontWeight: 900,
                padding: '16px 32px', borderRadius: 'var(--radius-full)', display: 'inline-flex',
                alignItems: 'center', gap: '12px', boxShadow: '0 10px 25px rgba(250, 204, 21, 0.4)'
              }}
              onClick={() => setShowLiveModal(true)}
            >
              <span>ادخل الحصة الحية مع المعلم</span><span>👋</span>
            </button>
            {firstLesson && (
              <button
                style={{
                  background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 'var(--radius-full)', fontSize: '15px', padding: '15px 24px', fontWeight: 700
                }}
                onClick={() => goLesson(firstLesson.id, 'video')}
              >🎥 راجع تسجيل آخر حصة</button>
            )}
            <button
              style={{
                background: 'linear-gradient(135deg, #e11d48, #be123c)', color: 'white', border: 'none',
                borderRadius: 'var(--radius-full)', fontSize: '15px', padding: '15px 24px', fontWeight: 800,
                boxShadow: '0 8px 20px rgba(190, 18, 60, 0.35)', cursor: 'pointer'
              }}
              onClick={() => setCurrentScreen('exam')}
            >🇪🇬 محاكي امتحانات السفارة</button>
          </div>
        </div>
        <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={handleMascotSpeak} title="انقر للتحدث مع فاهم!">
          <div style={{ background: 'white', color: 'var(--navy)', padding: '6px 12px', borderRadius: '16px', fontSize: '11px', fontWeight: 800, marginBottom: '6px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
            اضغط لسماعي! 💬
          </div>
          <div style={{ fontSize: '90px' }}>🦊</div>
        </div>
      </section>

      {/* 🔥 Streak & XP Badge */}
      {!streak.loading && (
        <section style={{ marginBottom: '28px' }}>
          <StreakBadge
            currentStreak={streak.currentStreak}
            bestStreak={streak.bestStreak}
            xpTotal={streak.xpTotal}
            level={streak.level}
            isActiveToday={streak.isActiveToday}
          />
        </section>
      )}

      {/* تابِع من حيث توقفت — بطاقة بارزة من آخر درس فُتح فعلياً */}
      {continueLesson && (
        <section style={{
          background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', borderRadius: '28px',
          padding: '22px 28px', marginBottom: '28px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', boxShadow: '0 14px 28px rgba(5, 150, 105, 0.25)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '42px' }}>{continueLesson.subject?.icon || '📚'}</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, opacity: 0.9 }}>⏯️ تابِع من حيث توقفت</div>
              <div style={{ fontSize: '20px', fontWeight: 900 }}>{continueLesson.lesson.title}</div>
              <div style={{ fontSize: '12.5px', opacity: 0.9 }}>{continueLesson.subject?.title}</div>
              {continueLesson.progress > 0 && (
                <div style={{ marginTop: '8px', width: '220px', height: '8px', background: 'rgba(255,255,255,0.3)', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, Math.round(continueLesson.progress))}%`, height: '100%', background: 'white' }} />
                </div>
              )}
            </div>
          </div>
          <button
            style={{ background: 'white', color: '#047857', fontWeight: 900, fontSize: '15px', padding: '12px 26px', borderRadius: 'var(--radius-full)', border: 'none', cursor: 'pointer' }}
            onClick={() => goLesson(continueLesson.lesson.id, 'video')}
          >
            أكمل الدرس ▶ {continueLesson.progress > 0 ? `(${Math.round(continueLesson.progress)}%)` : ''}
          </button>
        </section>
      )}

      {/* يومك النهارده */}
      <section style={{
        background: 'white', border: '3px solid #fde68a', borderRadius: '32px',
        padding: '28px 32px', marginBottom: '28px', boxShadow: '0 15px 30px rgba(245, 158, 11, 0.07)'
      }}>
        <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
          <span>📅 يومك النهارده</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#92400e', background: '#fef3c7', padding: '4px 12px', borderRadius: '20px' }}>{todayName}</span>
        </h2>
        {todayPlan.length === 0 ? (
          <div style={{ background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '20px', padding: '28px', textAlign: 'center', color: '#64748b', fontWeight: 700, fontSize: '15px' }}>
            🌴 لا توجد حصص مجدولة اليوم — يوم راحة! يمكنك اختيار أي مادة بالأسفل.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {todayPlan.map(slot => {
              const slotType = SLOT_TYPES[slot.type] || SLOT_TYPES.lesson;
              return (
                <div key={slot.id} style={{
                  border: slot.done ? '2px solid #86efac' : '2px solid #e0e7ff',
                  background: slot.done ? '#f0fdf4' : '#fafaff',
                  borderRadius: '20px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: '13px', color: '#4338ca', background: '#e0e7ff', padding: '3px 12px', borderRadius: '14px' }}>🕓 {slot.time}</span>
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#92400e' }}>{slotType.icon} {slotType.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '26px' }}>{slot.subject?.icon || '📚'}</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--navy)' }}>{slot.subject?.title || slot.subjectId}</div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                        {slot.lesson
                          ? <>الدرس {slot.lesson.order}: {slot.lesson.title}</>
                          : slot.subject ? '🎉 كل دروس المادة مُتقنة' : 'المادة غير متاحة في المنهج بعد'}
                      </div>
                    </div>
                  </div>
                  {slot.lesson && (
                    <button
                      style={{
                        background: slot.done ? '#dcfce7' : 'var(--blue)', color: slot.done ? '#166534' : 'white',
                        padding: '9px', borderRadius: 'var(--radius-md)', fontWeight: 800, fontSize: '13px',
                        border: 'none', cursor: 'pointer', width: '100%'
                      }}
                      onClick={() => goLesson(slot.lesson.id, 'video')}
                    >
                      {slot.done ? '✓ مُنجز — شاهد مرة أخرى' : 'ابدأ الدرس ▶'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* المواد بتقدمها الحقيقي */}
      <section style={{
        background: 'white', border: '3px solid #e0e7ff', borderRadius: '36px',
        padding: '28px 32px', boxShadow: '0 15px 30px rgba(99, 102, 241, 0.05)', marginBottom: '40px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--navy)' }}>🗺️ جزيرة المواد</h2>
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: 'var(--radius-full)', gap: '4px', flexWrap: 'wrap' }}>
            {CHILD_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                style={{
                  padding: '6px 12px', borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: '11.5px',
                  background: activeCategory === cat.id ? 'var(--blue)' : 'transparent',
                  color: activeCategory === cat.id ? 'white' : '#64748b', border: 'none', cursor: 'pointer'
                }}
                onClick={() => setActiveCategory(cat.id)}
              >{cat.label}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '16px' }}>
          {subjects.map(s => {
            const p = getSubjectProgress(curriculumData[s.id], learningRecords, masteredLessons);
            return (
              <button
                key={s.id}
                onClick={() => navigate(childPaths.subject(s.id))}
                style={{
                  textAlign: 'right', background: '#fafaff', border: `2px solid ${s.color}33`, borderRadius: '22px',
                  padding: '18px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '30px' }}>{s.icon}</span>
                  <span style={{ fontWeight: 900, fontSize: '14.5px', color: 'var(--navy)' }}>{s.label}</span>
                </div>
                <div style={{ height: '9px', background: '#e2e8f0', borderRadius: '9px', overflow: 'hidden' }}>
                  <div style={{ width: `${p.percent}%`, height: '100%', background: s.color, transition: 'width 0.4s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 800 }}>
                  <span style={{ color: s.color }}>{p.percent}%</span>
                  <span style={{ color: '#64748b' }}>{p.done}/{p.total} درس متقن</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}
