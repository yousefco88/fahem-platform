import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { getTodayPlan, getContinueLesson } from '../../utils/todayPlan';
import { getSubjectProgress, getExamUnlockProgress } from '../../utils/childProgress';
import { DAY_NAMES, SLOT_TYPES } from '../../data/scheduleData';
import { CHILD_SUBJECTS, CHILD_CATEGORIES, childPaths } from './childSubjects';
import LiveJoin from '../LiveJoin';
import StreakBadge from './StreakBadge';
import useStreak from '../../hooks/useStreak';
import './ChildHome.css';

// /child — الرئيسية: التحية + تابِع من حيث توقفت + يومك النهارده + المواد بتقدمها الحقيقي
export default function ChildHome() {
  const navigate = useNavigate();
  const {
    activeChild, activeChildCloudId, curriculumData, activeSubject, soundManager, triggerToast,
    setCurrentScreen, learningRecords, scheduleData, effectiveTimezone, slotsLoaded
  } = useApp();
  const [activeCategory, setActiveCategory] = useState('all');

  // 🔥 Streak & XP system
  const streak = useStreak(activeChildCloudId);

  const masteredLessons = activeChild.masteredLessons || [];
  const todayPlan = getTodayPlan({ schedule: scheduleData, curriculum: curriculumData, learningRecords, masteredLessons, timezone: effectiveTimezone });
  const continueLesson = getContinueLesson(curriculumData, learningRecords, masteredLessons);
  const todayName = DAY_NAMES[new Date().getDay()];

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
      <section className="ch-hero">
        <div>
          <h1 className="ch-hero-title">جاهز نفهم ونلعب سوا يا {activeChild.name}؟ 🌟</h1>
          <p className="ch-hero-sub">
            كل مواد المنهج المصري (عربي، ماث، إنجليزي، ديسكفر، وأخلاق) موجودة في جزيرتك — اختر مادة وابدأ رحلتك.
          </p>
          <div className="ch-hero-actions">
            {(() => {
              // المحاكي يُفتح بإكمال أي مادة كاملة أو بفتح يدوي من المعلم/الأدمن
              const unlock = getExamUnlockProgress(curriculumData, learningRecords?.[activeChild.id] || {}, activeChild.masteredLessons || []);
              const examOpen = activeChild.examUnlocked || unlock.unlocked;
              return examOpen ? (
                <button className="ch-exam-btn" onClick={() => setCurrentScreen('exam')}>
                  🇪🇬 محاكي امتحانات السفارة
                </button>
              ) : (
                <div
                  className="ch-exam-locked"
                  title={unlock.subjectTitle ? `الأقرب: ${unlock.subjectTitle} (${unlock.done}/${unlock.total} دروس)` : ''}
                >🔒 محاكي السفارة — يُفتح بإكمال مادة كاملة{unlock.subjectTitle ? ` (${unlock.subjectTitle}: ${unlock.done}/${unlock.total})` : ''}</div>
              );
            })()}
          </div>
        </div>
        <div className="ch-mascot" onClick={handleMascotSpeak} title="انقر للتحدث مع فاهم!">
          <div className="ch-mascot-bubble">اضغط لسماعي! 💬</div>
          <div className="ch-mascot-emoji">🦊</div>
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
        <section className="ch-continue">
          <div className="ch-continue-info">
            <div className="ch-continue-icon">{continueLesson.subject?.icon || '📚'}</div>
            <div>
              <div className="ch-continue-kicker">⏯️ تابِع من حيث توقفت</div>
              <div className="ch-continue-title">{continueLesson.lesson.title}</div>
              <div className="ch-continue-subject">{continueLesson.subject?.title}</div>
              {continueLesson.progress > 0 && (
                <div className="ch-continue-track">
                  <div className="ch-continue-fill" style={{ '--p': `${Math.min(100, Math.round(continueLesson.progress))}%` }} />
                </div>
              )}
            </div>
          </div>
          <button className="ch-continue-btn" onClick={() => goLesson(continueLesson.lesson.id, 'video')}>
            أكمل الدرس ▶ {continueLesson.progress > 0 ? `(${Math.round(continueLesson.progress)}%)` : ''}
          </button>
        </section>
      )}

      {/* يومك النهارده */}
      <section className="ch-card">
        <h2 className="ch-card-title">
          <span>📅 يومك النهارده</span>
          <span className="ch-day-chip">{todayName}</span>
        </h2>
        {todayPlan.length === 0 ? (
          <div className="ch-empty">
            {scheduleData.length === 0 && slotsLoaded
              ? '📭 لم تُحدَّد خانات جدول لهذا الطفل بعد — ستضيفها الإدارة. يمكنك اختيار أي مادة بالأسفل.'
              : '🌴 لا توجد حصص مجدولة اليوم — يوم راحة! يمكنك اختيار أي مادة بالأسفل.'}
          </div>
        ) : (
          <div className="ch-plan-grid">
            {todayPlan.map(slot => {
              const slotType = SLOT_TYPES[slot.type] || SLOT_TYPES.lesson;
              return (
                <div key={slot.id} className={`ch-slot${slot.done ? ' done' : ''}`}>
                  <div className="ch-slot-head">
                    <span className="ch-slot-time">🕓 {slot.localTime || slot.time}</span>
                    <span className="ch-slot-type">{slotType.icon} {slotType.label}</span>
                  </div>
                  <div className="ch-slot-body">
                    <span className="ch-slot-icon">{slot.subject?.icon || '📚'}</span>
                    <div>
                      <div className="ch-slot-subject">{slot.subject?.title || slot.subjectId}</div>
                      <div className="ch-slot-lesson">
                        {slot.lesson
                          ? <>الدرس {slot.lesson.order}: {slot.lesson.title}</>
                          : slot.subject ? '🎉 كل دروس المادة مُتقنة' : 'المادة غير متاحة في المنهج بعد'}
                      </div>
                    </div>
                  </div>
                  <LiveJoin slot={slot} />
                  {slot.lesson && (
                    <button
                      className={`ch-slot-btn${slot.done ? ' done' : ''}`}
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
      <section className="ch-card">
        <div className="ch-subjects-head">
          <h2>🗺️ جزيرة المواد</h2>
          <div className="ch-cats">
            {CHILD_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                className={`ch-cat-btn${activeCategory === cat.id ? ' active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >{cat.label}</button>
            ))}
          </div>
        </div>

        <div className="ch-subjects-grid">
          {subjects.map(s => {
            const p = getSubjectProgress(curriculumData[s.id], learningRecords, masteredLessons);
            return (
              <button
                key={s.id}
                className="ch-subject-card"
                style={{ '--subj': s.color }}
                onClick={() => navigate(childPaths.subject(s.id))}
              >
                <div className="ch-subject-head">
                  <span className="ch-subject-icon">{s.icon}</span>
                  <span className="ch-subject-label">{s.label}</span>
                </div>
                <div className="ch-subject-track">
                  <div className="ch-subject-fill" style={{ '--p': `${p.percent}%` }} />
                </div>
                <div className="ch-subject-stats">
                  <span className="pct">{p.percent}%</span>
                  <span className="count">{p.done}/{p.total} درس متقن</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}
