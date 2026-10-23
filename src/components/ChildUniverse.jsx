import React from 'react';
import { useApp } from '../context/AppContext';
import { getTodayPlan, getContinueLesson, getNextLesson, isLessonDone } from '../utils/todayPlan';
import { DAY_NAMES, SLOT_TYPES } from '../data/scheduleData';

export default function ChildUniverse() {
  const {
    activeChild,
    curriculumData,
    activeSubject,
    setActiveSubject,
    openLesson,
    setShowGateModal,
    setShowLiveModal,
    soundManager,
    triggerToast,
    setCurrentScreen,
    learningRecords,
    scheduleData
  } = useApp();

  const currentSubjectObj = curriculumData[activeSubject] || curriculumData.arabic;
  const lessons = [...(currentSubjectObj.lessons || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const masteredLessons = activeChild.masteredLessons || [];
  const todayPlan = getTodayPlan({ schedule: scheduleData, curriculum: curriculumData, learningRecords, masteredLessons });
  const continueLesson = getContinueLesson(curriculumData, learningRecords, masteredLessons);
  const currentLessonId = getNextLesson(currentSubjectObj, learningRecords, masteredLessons)?.id || null;
  const todayName = DAY_NAMES[new Date().getDay()];

  const handleMascotSpeak = () => {
    soundManager.speak(`أهلاً يا ${activeChild.name}! أنت بطل متميز. اخترنا لك مادة ${currentSubjectObj.title}. اضغط على أي محطة لنلعب ونفهم سوا!`);
    triggerToast(`🦊 الثعلب فاهم يرحب بك في مادة ${currentSubjectObj.title}!`);
  };

  const handlePlayLetterSound = (text) => {
    soundManager.speak(text);
    triggerToast(`🔊 استمع لنطق: ${text}`);
  };

  const [activeCategory, setActiveCategory] = React.useState('all');

  const subjectsList = [
    // المسار العام
    { id: 'arabic', label: 'اللغة العربية', icon: '📖', color: '#2563eb', category: 'general' },
    { id: 'math', label: 'الرياضيات', icon: '🔢', color: '#059669', category: 'general' },
    { id: 'english', label: 'Connect الإنجليزية', icon: '🔤', color: '#8b5cf6', category: 'general' },
    { id: 'discover', label: 'اكتشف (Discover)', icon: '🔬', color: '#0284c7', category: 'general' },
    { id: 'life_skills', label: 'المهارات الحياتية', icon: '🛠️', color: '#ea580c', category: 'general' },

    // مسار مدارس اللغات (Languages Track)
    { id: 'connect_plus', label: 'Connect Plus (لغات)', icon: '🌟', color: '#7c3aed', category: 'languages' },
    { id: 'math_en', label: 'Math (English)', icon: '📐', color: '#0d9488', category: 'languages' },

    // الهوية والمستقبل
    { id: 'social', label: 'معالم وتاريخ مصر', icon: '🇪🇬', color: '#b91c1c', category: 'identity' },
    { id: 'ict', label: 'تكنولوجيا المعلومات (ICT)', icon: '💻', color: '#4f46e5', category: 'identity' },
    { id: 'phonics_arabic', label: 'نور البيان والخط', icon: '✍️', color: '#be185d', category: 'identity' },

    // التربية الدينية والقيم
    { id: 'values', label: 'القيم والأخلاق', icon: '🤝', color: '#d97706', category: 'religion' },
    { id: 'islamic_religion', label: 'التربية الإسلامية', icon: '🕋', color: '#16a34a', category: 'religion' },
    { id: 'christian_religion', label: 'التربية المسيحية', icon: '✝️', color: '#b45309', category: 'religion' }
  ];

  const filteredSubjects = activeCategory === 'all'
    ? subjectsList
    : subjectsList.filter(s => s.category === activeCategory);

  return (
    <div style={{
      background: 'radial-gradient(circle at 10% 20%, #eff6ff 0%, #f0fdf4 90%)',
      padding: '24px', minHeight: 'calc(100vh - 46px)'
    }}>
      {/* Child Top Bar */}
      <nav style={{
        maxWidth: '1200px', margin: '0 auto 28px', background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)', border: '2px solid #e0e7ff', borderRadius: 'var(--radius-full)',
        padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: '0 10px 25px rgba(99, 102, 241, 0.08)', flexWrap: 'wrap', gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '50px', height: '50px', borderRadius: '50%', background: '#fef08a',
            border: '3px solid #f59e0b', display: 'grid', placeItems: 'center', fontSize: '24px',
            boxShadow: '0 4px 10px rgba(245, 158, 11, 0.2)'
          }}>
            {activeChild.avatar}
          </div>
          <div>
            <h3 style={{ fontSize: '18px', color: 'var(--navy)' }}>البطل {activeChild.name}</h3>
            <span style={{ fontSize: '12px', color: '#4338ca', fontWeight: 700 }}>{activeChild.grade} 🚀</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: '#ffffff', border: '2px solid #fde047', padding: '6px 14px',
            borderRadius: 'var(--radius-full)', fontWeight: 800, fontSize: '15px', color: '#ca8a04',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            <span>⭐</span>
            <span>{activeChild.points}</span>
            <span style={{ fontSize: '12px', fontWeight: 600 }}>نقطة</span>
          </div>

          <div style={{
            background: '#ffffff', border: '2px solid #fed7aa', padding: '6px 14px',
            borderRadius: 'var(--radius-full)', fontWeight: 800, fontSize: '15px', color: '#ea580c',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            <span>🏆</span>
            <span>{activeChild.badges}</span>
            <span style={{ fontSize: '12px', fontWeight: 600 }}>شارات</span>
          </div>

          <div style={{
            background: '#ffffff', border: '2px solid #fca5a5', padding: '6px 14px',
            borderRadius: 'var(--radius-full)', fontWeight: 800, fontSize: '15px', color: '#dc2626',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            <span>🔥</span>
            <span>3 أيام</span>
          </div>
        </div>

        <button
          style={{
            background: '#f1f5f9', color: 'var(--muted)', border: '1px solid #cbd5e1',
            padding: '8px 16px', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: '6px'
          }}
          onClick={() => setShowGateModal(true)}
        >
          <span>🔒 مساحة ولي الأمر</span>
        </button>
      </nav>

      {/* Hero Banner with Interactive Talking Mascot */}
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <section style={{
          background: 'linear-gradient(135deg, #4338ca, #3b82f6 60%, #06b6d4)',
          color: 'white', borderRadius: '32px', padding: '32px 40px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: '0 20px 35px rgba(59, 130, 246, 0.25)', marginBottom: '34px',
          position: 'relative'
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
              >
                🔊
              </button>
            </div>
            
            <h1 style={{ fontSize: '32px', marginBottom: '8px', fontWeight: 900 }}>
              جاهز نفهم ونلعب سوا يا {activeChild.name}؟ 🌟
            </h1>
            <p style={{ fontSize: '16px', color: '#e0e7ff', maxWidth: '580px', marginBottom: '20px' }}>
              معلمتك وزملائك مستنينك في الفصل الحي! كل مواد المنهج المصري (عربي، ماث، إنجليزي، ديسكفر، وأخلاق) موجودة في جزيرتك.
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
                <span>ادخل الحصة الحية مع المعلم</span>
                <span>👋</span>
              </button>
              <button
                style={{
                  background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 'var(--radius-full)', fontSize: '15px', padding: '15px 24px', fontWeight: 700
                }}
                onClick={() => openLesson(activeSubject, lessons[0]?.id, 'video')}
              >
                <span>🎥 راجع تسجيل آخر حصة</span>
              </button>
              <button
                style={{
                  background: 'linear-gradient(135deg, #e11d48, #be123c)', color: 'white', border: 'none',
                  borderRadius: 'var(--radius-full)', fontSize: '15px', padding: '15px 24px', fontWeight: 800,
                  boxShadow: '0 8px 20px rgba(190, 18, 60, 0.35)', display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer'
                }}
                onClick={() => setCurrentScreen('exam')}
              >
                <span>🇪🇬 محاكي امتحانات السفارة</span>
              </button>
            </div>
          </div>

          {/* Interactive Talking Mascot */}
          <div
            style={{ textAlign: 'center', cursor: 'pointer' }}
            onClick={handleMascotSpeak}
            title="انقر للتحدث مع فاهم!"
          >
            <div style={{
              background: 'white', color: 'var(--navy)', padding: '6px 12px', borderRadius: '16px',
              fontSize: '11px', fontWeight: 800, marginBottom: '6px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
            }}>
              اضغط لسماعي! 💬
            </div>
            <div style={{ fontSize: '90px' }}>🦊</div>
          </div>
        </section>

        {/* ===== يومك النهارده 📅 — خطة اليوم من الجدول الأسبوعي ===== */}
        <section style={{
          background: 'white', border: '3px solid #fde68a', borderRadius: '32px',
          padding: '28px 32px', marginBottom: '34px', boxShadow: '0 15px 30px rgba(245, 158, 11, 0.07)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>📅 يومك النهارده</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#92400e', background: '#fef3c7', padding: '4px 12px', borderRadius: '20px' }}>
                {todayName}
              </span>
            </h2>
            {continueLesson && (
              <button
                style={{
                  background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white',
                  padding: '10px 20px', borderRadius: 'var(--radius-full)', fontWeight: 800, fontSize: '13px',
                  display: 'inline-flex', alignItems: 'center', gap: '8px', border: 'none', cursor: 'pointer',
                  boxShadow: '0 8px 18px rgba(5, 150, 105, 0.25)'
                }}
                onClick={() => {
                  setActiveSubject(continueLesson.subjectId);
                  openLesson(continueLesson.subjectId, continueLesson.lesson.id, 'video');
                }}
              >
                <span>⏯️ أكمل من حيث توقفت: {continueLesson.lesson.title}</span>
                {continueLesson.progress > 0 && <span style={{ background: 'rgba(255,255,255,0.25)', padding: '2px 8px', borderRadius: '10px', fontSize: '11px' }}>{Math.round(continueLesson.progress)}%</span>}
              </button>
            )}
          </div>

          {todayPlan.length === 0 ? (
            <div style={{
              background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '20px',
              padding: '28px', textAlign: 'center', color: '#64748b', fontWeight: 700, fontSize: '15px'
            }}>
              🌴 لا توجد حصص مجدولة اليوم — يوم راحة! يمكنك اللعب في خريطة المغامرة بالأسفل.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              {todayPlan.map(slot => {
                const slotType = SLOT_TYPES[slot.type] || SLOT_TYPES.lesson;
                return (
                  <div
                    key={slot.id}
                    style={{
                      border: slot.done ? '2px solid #86efac' : '2px solid #e0e7ff',
                      background: slot.done ? '#f0fdf4' : '#fafaff',
                      borderRadius: '20px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, fontSize: '13px', color: '#4338ca', background: '#e0e7ff', padding: '3px 12px', borderRadius: '14px' }}>
                        🕓 {slot.time}
                      </span>
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#92400e' }}>
                        {slotType.icon} {slotType.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '26px' }}>{slot.subject?.icon || '📚'}</span>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--navy)' }}>{slot.subject?.title || slot.subjectId}</div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                          {slot.lesson
                            ? <>الدرس {slot.lesson.order}: {slot.lesson.title}</>
                            : slot.subject
                              ? '🎉 كل دروس المادة مُتقنة'
                              : 'المادة غير متاحة في المنهج بعد'}
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
                        onClick={() => {
                          setActiveSubject(slot.subjectId);
                          openLesson(slot.subjectId, slot.lesson.id, slot.done ? 'video' : 'video');
                        }}
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
        <div style={{
          background: 'white', border: '3px solid #e0e7ff', borderRadius: '36px',
          padding: '32px', boxShadow: '0 15px 30px rgba(99, 102, 241, 0.05)', marginBottom: '40px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>خريطة مغامرة: {currentSubjectObj.title} {currentSubjectObj.icon}</span>
                <span className="tag-badge info" style={{ fontSize: '11px' }}>{currentSubjectObj.badge}</span>
              </div>

              {/* Category Track Filter */}
              <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: 'var(--radius-full)', gap: '4px', flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: 'الكل (12 مادة) 📚' },
                  { id: 'general', label: '🏫 المسار العام' },
                  { id: 'languages', label: '🌍 مسار اللغات (Connect Plus & Math)' },
                  { id: 'identity', label: '🇪🇬 الهوية والمستقبل (ICT & تاريخ مصر)' },
                  { id: 'religion', label: '🕊️ التربية والقيم' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    style={{
                      padding: '6px 12px', borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: '11.5px',
                      background: activeCategory === cat.id ? 'var(--blue)' : 'transparent',
                      color: activeCategory === cat.id ? 'white' : '#64748b',
                      border: 'none', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                    onClick={() => setActiveCategory(cat.id)}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Subjects Pill List */}
            <div style={{
              display: 'flex', background: '#e2e8f0', padding: '6px',
              borderRadius: 'var(--radius-full)', gap: '6px', overflowX: 'auto', maxWidth: '100%'
            }}>
              {filteredSubjects.map(subj => (
                <button
                  key={subj.id}
                  style={{
                    padding: '8px 16px', borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: '12.5px',
                    background: activeSubject === subj.id ? 'white' : 'transparent',
                    color: activeSubject === subj.id ? subj.color : 'var(--muted)',
                    boxShadow: activeSubject === subj.id ? 'var(--shadow-sm)' : 'none',
                    display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', border: 'none', cursor: 'pointer'
                  }}
                  onClick={() => {
                    setActiveSubject(subj.id);
                    triggerToast(`تم فتح مسار: ${subj.label}`);
                  }}
                >
                  <span>{subj.icon}</span>
                  <span>{subj.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Node Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
            {lessons.map((lesson) => {
              const isMastered = isLessonDone(lesson.id, learningRecords, masteredLessons) || (lesson.id === 'baa' && activeChild.baaMastered);
              const isCurrent = !isMastered && lesson.id === currentLessonId;

              return (
                <div
                  key={lesson.id}
                  style={{
                    border: isMastered ? '2px solid #86efac' : isCurrent ? '3px solid #4f46e5' : '2px solid var(--yellow)',
                    borderRadius: '24px', padding: '24px 18px', textAlign: 'center',
                    background: isMastered ? 'linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)' : isCurrent ? '#eef2ff' : '#fffbeb',
                    boxShadow: isMastered ? 'none' : isCurrent ? '0 0 0 5px #c7d2fe' : '0 0 0 4px #fef08a',
                    position: 'relative',
                    opacity: !isMastered && !isCurrent ? 0.78 : 1
                  }}
                >
                  {/* رقم المحطة في التسلسل */}
                  <span style={{
                    position: 'absolute', top: '14px', right: '14px',
                    background: isCurrent ? '#4f46e5' : '#e2e8f0', color: isCurrent ? 'white' : '#475569',
                    borderRadius: '12px', padding: '2px 10px', fontSize: '11px', fontWeight: 800
                  }}>
                    محطة {lesson.order}
                  </span>
                  {/* Sound Read Button */}
                  <button
                    style={{
                      position: 'absolute', top: '14px', left: '14px',
                      background: isMastered ? '#dcfce7' : '#fef08a',
                      border: '1px solid #cbd5e1', borderRadius: '50%', width: '32px', height: '32px',
                      display: 'grid', placeItems: 'center', fontSize: '14px'
                    }}
                    onClick={(e) => { e.stopPropagation(); handlePlayLetterSound(`${lesson.letter}... ${lesson.title}`); }}
                    title="استمع لصوت الدرس"
                  >
                    🔊
                  </button>

                  <span className={`tag-badge ${isMastered ? 'mastered' : 'review'}`} style={{ marginBottom: '10px' }}>
                    {isMastered ? '✓ متقن' : isCurrent ? '🎯 درسك الحالي' : '🔜 قادم في الرحلة'}
                  </span>

                  <div style={{
                    width: '72px', height: '72px', borderRadius: '50%', margin: '0 auto 16px',
                    display: 'grid', placeItems: 'center', fontSize: '24px', fontWeight: 900,
                    background: isMastered ? '#dcfce7' : '#fef08a',
                    border: isMastered ? '3px solid #22c55e' : '3px solid #eab308'
                  }}>
                    {lesson.letter}
                  </div>

                  <h4 style={{ fontSize: '16px', marginBottom: '6px', color: 'var(--navy)' }}>{lesson.title}</h4>
                  <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '16px', minHeight: '36px' }}>
                    {lesson.objective}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {isMastered ? (
                      <button
                        className="btn-primary"
                        style={{ width: '100%', justifyContent: 'center' }}
                        onClick={() => openLesson(activeSubject, lesson.id, 'video')}
                      >
                        مشاهدة التسجيل ▶
                      </button>
                    ) : (
                      <button
                        style={{
                          background: '#ea580c', color: 'white', width: '100%',
                          padding: '10px', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '13px'
                        }}
                        onClick={() => openLesson(activeSubject, lesson.id, 'quiz')}
                      >
                        تحدي الإتقان (ابدأ الاختبار) 🎯
                      </button>
                    )}
                    <button
                      className="btn-secondary"
                      style={{ width: '100%', padding: '8px', fontSize: '12px' }}
                      onClick={() => openLesson(activeSubject, lesson.id, 'guide')}
                    >
                      💡 دليل المذاكرة للأهل
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
