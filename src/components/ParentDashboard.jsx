import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import ExamAttemptsCard from './parent/ExamAttemptsCard';
import { getChildStats } from '../utils/childProgress';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { isLessonDone } from '../utils/todayPlan';
import { recordedSessions } from '../data/curriculumData';
// Dynamic import for PDF (lazy load - reduces bundle)
const loadPdfGenerator = () => import('./parent/WeeklyReportPDF');
import useStreak, { getStreakMessage, getLevelTitle } from '../hooks/useStreak';

export default function ParentDashboard() {
  const {
    activeChild,
    childrenList,
    switchChild,
    activeChildCloudId,
    addChild,
    learningRecords,
    curriculumData,
    openLesson,
    countryText,
    liveClassTimeText,
    setCurrentScreen,
    setShowLiveModal,
    triggerToast
  } = useApp();
  // كل الأرقام مشتقة من سجل التعلم الفعلي — لا قيم مخزنة أو مزروعة
  const childStats = getChildStats(curriculumData, learningRecords, activeChild.masteredLessons || []);

  // مصفوفة الإتقان — مواد حقيقية من المنهج (المنشورة في CMS) فقط؛ لا بطاقات يدوية
  const matrixSubjects = Object.entries(curriculumData)
    .filter(([, s]) => s && typeof s === 'object' && !Array.isArray(s) && Array.isArray(s.lessons) && s.lessons.length > 0);

  // 🔥 Streak & XP data for active child
  const streak = useStreak(activeChildCloudId);

  const [showAddChildModal, setShowAddChildModal] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [newChildGrade, setNewChildGrade] = useState('الصف الثاني الابتدائي');

  const handleCreateChild = (e) => {
    e.preventDefault();
    if (!newChildName.trim()) {
      triggerToast('اكتب اسم الطفل أولاً');
      return;
    }
    addChild(newChildName, newChildGrade);
    setNewChildName('');
    setShowAddChildModal(false);
  };

  // 📄 Generate & Download Weekly PDF Report
  const handleDownloadReport = async () => {
    if (pdfGenerating) return;
    setPdfGenerating(true);
    try {
      // Dynamic import - loads PDF library only when needed
      const { downloadWeeklyReport } = await loadPdfGenerator();

      // Prepare subjects data from curriculum
      const subjectsList = curriculumData.subjects?.map(subject => {
        const lessons = subject.modules?.flatMap(m => m.lessons || []) || [];
        const completed = lessons.filter(l => 
          learningRecords?.[activeChild.id]?.[l.id]?.status === 'completed' ||
          (activeChild.masteredLessons || []).includes(l.id)
        ).length;
        return {
          name: subject.title,
          emoji: subject.icon || '📘',
          completed,
          total: lessons.length,
          percent: lessons.length > 0 ? Math.round((completed / lessons.length) * 100) : 0
        };
      }) || [];

      await downloadWeeklyReport({
        child: {
          name: activeChild.name,
          grade: activeChild.grade
        },
        streak: {
          currentStreak: streak.currentStreak || 0,
          bestStreak: streak.bestStreak || 0,
          xpTotal: streak.xpTotal || 0,
          level: streak.level || 1
        },
        stats: {
          lessonsCompleted: childStats.totalMastered || 0,
          totalLessons: childStats.totalLessons || 0,
          progressPercent: childStats.totalLessons > 0 
            ? Math.round((childStats.totalMastered / childStats.totalLessons) * 100) 
            : 0,
          hoursStudied: 0 // Future: calculate from activity logs
        },
        subjects: subjectsList,
        weekRange: `أسبوع ${new Date().toLocaleDateString('ar-EG', { month: 'long', day: 'numeric' })}`
      });
      triggerToast('✅ تم تحميل التقرير بنجاح!');
    } catch (error) {
      console.error('PDF generation failed:', error);
      triggerToast('❌ حدث خطأ في إنشاء التقرير');
    } finally {
      setPdfGenerating(false);
    }
  };

  // تقويم الامتحانات من إعدادات الموقع (م4) — يحرره الطاقم من لوحة الإدارة
  const { settings: siteSettings } = useSiteSettings();
  const calendarEvents = Array.isArray(siteSettings.examCalendar?.events) ? siteSettings.examCalendar.events : [];

  return (
    <div className="parent-grid-layout">
      {/* Sidebar Panel */}
      <aside className="sidebar-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '16px', borderBottom: '1px solid var(--line)' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '14px',
            background: 'linear-gradient(135deg, var(--blue), #1d4ed8)',
            color: 'white', display: 'grid', placeItems: 'center',
            fontSize: '24px', fontWeight: 900, boxShadow: 'var(--shadow-lg)'
          }}>ف</div>
          <div>
            <h3 style={{ fontSize: '20px', color: 'var(--navy)', lineHeight: 1.1 }}>فاهم</h3>
            <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 500 }}>التعليم الحي لأبنائنا بالخارج</span>
          </div>
        </div>

        {/* Multi-Child Selector */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)' }}>الأبناء المسجلون:</span>
            <button
              style={{ background: 'none', color: 'var(--blue)', fontSize: '11px', fontWeight: 800 }}
              onClick={() => setShowAddChildModal(true)}
            >
              + إضافة طفل
            </button>
          </div>

          <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
            {childrenList.map(child => (
              <button
                key={child.id}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-md)',
                  border: child.id === activeChild.id ? '2px solid var(--blue)' : '1px solid var(--line)',
                  background: child.id === activeChild.id ? 'var(--blue-light)' : '#ffffff',
                  color: child.id === activeChild.id ? 'var(--blue)' : 'var(--navy)',
                  fontWeight: child.id === activeChild.id ? 800 : 600,
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
                onClick={() => switchChild(child.id)}
              >
                <span>{child.avatar}</span>
                <span>{child.name}</span>
              </button>
            ))}
          </div>

          {/* Active Child Summary Card */}
          <div style={{
            background: 'var(--blue-light)', border: '1.5px solid #bfdbfe',
            borderRadius: 'var(--radius-md)', padding: '14px',
            display: 'flex', alignItems: 'center', gap: '12px'
          }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: '#dbeafe', border: '2px solid var(--blue)',
              display: 'grid', placeItems: 'center', fontSize: '22px'
            }}>
              {activeChild.avatar}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h4 style={{ fontSize: '15px', marginBottom: '2px' }}>{activeChild.name} (الملف النشط)</h4>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{activeChild.grade}</span>
            </div>
          </div>

          {/* 🔥 Child Streak Mini Card */}
          {!streak.loading && (
            <div style={{
              background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
              border: '1.5px solid #fbbf24',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              marginTop: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '20px' }}>🔥</span>
                  <span style={{ fontWeight: 800, color: '#92400e', fontSize: '18px' }}>
                    {streak.currentStreak}
                  </span>
                  <span style={{ fontWeight: 600, color: '#b45309', fontSize: '12px' }}>
                    {streak.currentStreak === 1 ? 'يوم' : 'أيام'}
                  </span>
                </div>
                <span style={{
                  background: streak.isActiveToday ? '#22c55e' : '#94a3b8',
                  color: 'white',
                  padding: '3px 8px',
                  borderRadius: '10px',
                  fontSize: '10px',
                  fontWeight: 700
                }}>
                  {streak.isActiveToday ? '✅ نشط' : '⏳ لم يبدأ'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#78350f' }}>
                <span>⭐ {streak.xpTotal} XP</span>
                <span>🎖️ Lv.{streak.level}</span>
                <span>🏆 أفضل: {streak.bestStreak}</span>
              </div>
            </div>
          )}
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
            borderRadius: 'var(--radius-md)', background: 'var(--blue-light)', color: 'var(--blue)',
            fontWeight: 700, fontSize: '14px', width: '100%', textAlign: 'right'
          }}>
            <span>⌂</span> لوحة المتابعة الشاملة
          </button>
          <button
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
              borderRadius: 'var(--radius-md)', background: 'transparent', color: '#475569',
              fontWeight: 600, fontSize: '14px', width: '100%', textAlign: 'right'
            }}
            onClick={() => document.getElementById('live-schedule-section')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <span>🗓</span> جدول الحصص الحية
          </button>
          <button
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
              borderRadius: 'var(--radius-md)', background: 'transparent', color: '#475569',
              fontWeight: 600, fontSize: '14px', width: '100%', textAlign: 'right'
            }}
            onClick={() => document.getElementById('mastery-matrix-section')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <span>🎯</span> مصفوفة إتقان المهارات (5 مواد)
          </button>
          <button
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
              borderRadius: 'var(--radius-md)', background: 'transparent', color: '#475569',
              fontWeight: 600, fontSize: '14px', width: '100%', textAlign: 'right'
            }}
            onClick={() => setCurrentScreen('pricing')}
          >
            <span>💳</span> باقة الاشتراك النشطة
          </button>
        </nav>

        {/* WhatsApp integration placeholder */}
        <button
          style={{
            background: '#25D366', color: 'white', padding: '11px', borderRadius: 'var(--radius-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            fontWeight: 700, fontSize: '12.5px', boxShadow: '0 4px 10px rgba(37,211,102,0.25)'
          }}
          onClick={() => {
            const shareText = `سجّل طفلك في منصة فاهم للتعليم المصري بالخارج 📚\n${window.location.origin}`;
            window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
          }}
        >
          <span>💬</span>
          <span>إرسال الرابط عبر واتساب</span>
        </button>

        {/* 📄 Weekly PDF Report Button */}
        <button
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white',
            padding: '11px', borderRadius: 'var(--radius-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            fontWeight: 700, fontSize: '12.5px', boxShadow: '0 4px 10px rgba(99,102,241,0.25)',
            opacity: pdfGenerating ? 0.7 : 1, cursor: pdfGenerating ? 'wait' : 'pointer'
          }}
          onClick={handleDownloadReport}
          disabled={pdfGenerating}
        >
          <span>{pdfGenerating ? '⏳' : '📄'}</span>
          <span>{pdfGenerating ? 'جاري إنشاء التقرير...' : 'تحميل التقرير الأسبوعي'}</span>
        </button>

        <button
          style={{
            marginTop: 'auto', background: 'linear-gradient(135deg, #f59e0b, #ec4899)',
            color: 'white', padding: '14px', borderRadius: 'var(--radius-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            fontWeight: 700, boxShadow: '0 10px 20px rgba(236,72,153,0.25)'
          }}
          onClick={() => setCurrentScreen('child')}
        >
          <span>دخول مساحة {activeChild.name}</span>
          <span style={{ fontSize: '18px' }}>🚀</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="main-viewport">
        <header style={{
          height: '72px', background: '#ffffff', borderBottom: '1px solid var(--line)',
          padding: '0 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <h2 style={{ fontSize: '20px' }}>متابعة تقدّم: {activeChild.name} 🌟</h2>
            <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
              التوقيت المحلي المحسوب: {countryText}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button className="tag-badge" style={{ background: '#f0fdf4', color: '#166534', cursor: 'pointer' }} onClick={() => setCurrentScreen('ai-tutor')}>
              🤖 المعلم الذكي
            </button>
            <button className="tag-badge" style={{ background: '#fef3c7', color: '#92400e', cursor: 'pointer' }} onClick={() => setCurrentScreen('lessons')}>
              📹 الدروس المسجلة
            </button>
            <button className="tag-badge info" onClick={() => setCurrentScreen('pricing')}>
              📚 الوصول التجريبي المجاني
            </button>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: '#dbeafe', color: 'var(--blue)', display: 'grid',
              placeItems: 'center', fontWeight: 800
            }}>أ.م</div>
          </div>
        </header>

        <div style={{ padding: '32px', maxWidth: '1350px', width: '100%', margin: '0 auto' }}>
          
          {/* Missed Class Recovery Reassurance Alert */}
          <div style={{
            background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 'var(--radius-md)',
            padding: '14px 20px', marginBottom: '22px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>🛡️</span>
              <div>
                <strong style={{ color: '#166534', fontSize: '13.5px', display: 'block' }}>
                  تغطية المنهج المصري المتكامل لأبنائنا بالخارج:
                </strong>
                <span style={{ color: '#15803d', fontSize: '12.5px' }}>
                  تعرض المنصة مواد ودروسًا تجريبية؛ تتم مراجعة مطابقتها للمنهج قبل اعتماد المحتوى.
                </span>
              </div>
            </div>
            <button
              className="btn-secondary"
              style={{ padding: '7px 14px', fontSize: '12px' }}
              onClick={() => openLesson('arabic', 'baa', 'video')}
            >
              عرض درس تجريبي
            </button>
          </div>

          {/* 1. Live Hero Session Card */}
          <section id="live-schedule-section" style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #2563eb 100%)',
            color: 'white', borderRadius: 'var(--radius-lg)', padding: '28px 32px',
            position: 'relative', overflow: 'hidden', boxShadow: '0 20px 40px -10px rgba(30, 58, 138, 0.4)',
            marginBottom: '30px'
          }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5', padding: '6px 14px', borderRadius: 'var(--radius-full)',
              fontSize: '12px', fontWeight: 700, marginBottom: '16px'
            }}>
              <span style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: '#ef4444', display: 'inline-block'
              }}></span>
              <span>نموذج عرض لحصة مباشرة</span>
            </div>

            <h1 style={{ fontSize: '26px', marginBottom: '8px', fontWeight: 800 }}>
              اللغة العربية: أصوات حرف الباء الممدودة وتكوين الكلمات
            </h1>
            <p style={{ color: '#cbd5e1', maxWidth: '650px', fontSize: '14.5px', marginBottom: '22px' }}>
              معاينة تجريبية لفصل تفاعلي. البث متعدد المستخدمين وجدولة الحصص غير متصلين بخادم بعد.
            </p>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn-accent" onClick={() => { triggerToast('ستفتح معاينة الفصل. الكاميرا اختيارية ولا يوجد بث مع طلاب آخرين.'); setShowLiveModal(true); }}>
                <span>فتح معاينة الفصل التفاعلية</span>
                <span>🔴</span>
              </button>
              <button
                style={{
                  background: 'rgba(255, 255, 255, 0.12)', color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.25)', padding: '12px 20px',
                  borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '14px'
                }}
                onClick={() => triggerToast('إرسال تذكيرات واتساب غير متاح قبل ربط خدمة الرسائل.')}
              >
                💬 إرسال تذكير واتساب
              </button>
              <span style={{ fontSize: '13px', opacity: 0.85 }}>{liveClassTimeText}</span>
            </div>
          </section>

          {/* 2. Reassurance Metrics Grid */}
          <section style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '18px', marginBottom: '30px'
          }}>
            <div style={{
              background: 'var(--card-bg)', border: '1px solid var(--line)',
              borderRadius: 'var(--radius-md)', padding: '20px', boxShadow: 'var(--shadow-sm)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
            }}>
              <div>
                <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>حضور الحصص الحية</span>
                <h3 style={{ fontSize: '28px', color: 'var(--navy)', lineHeight: 1, marginBottom: '6px' }}>—</h3>
                <small style={{ color: 'var(--muted)', fontWeight: 600, fontSize: '12px' }}>يُحتسب بعد بدء الحصص المباشرة</small>
              </div>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#ecfdf5', color: '#10b981', display: 'grid', placeItems: 'center', fontSize: '22px' }}>🗓</div>
            </div>

            <div style={{
              background: 'var(--card-bg)', border: '1px solid var(--line)',
              borderRadius: 'var(--radius-md)', padding: '20px', boxShadow: 'var(--shadow-sm)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
            }}>
              <div>
                <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>المهارات المتقنة بنجاح</span>
                <h3 style={{ fontSize: '28px', color: 'var(--navy)', lineHeight: 1, marginBottom: '6px' }}>{childStats.done} / {childStats.total}</h3>
                <small style={{ color: 'var(--green)', fontWeight: 600, fontSize: '12px' }}>⭐ درس متقن من المنهج المنشور</small>
              </div>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#fefce8', color: '#ca8a04', display: 'grid', placeItems: 'center', fontSize: '22px' }}>🏆</div>
            </div>

            <div style={{
              background: 'var(--card-bg)', border: '1px solid var(--line)',
              borderRadius: 'var(--radius-md)', padding: '20px', boxShadow: 'var(--shadow-sm)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
            }}>
              <div>
                <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>مواد ومسارات تجريبية</span>
                <h3 style={{ fontSize: '28px', color: 'var(--navy)', lineHeight: 1, marginBottom: '6px' }}>{Object.values(curriculumData || {}).filter(v => Array.isArray(v?.lessons)).length} مسارًا</h3>
                <small style={{ color: 'var(--blue)', fontWeight: 600, fontSize: '12px' }}>📖 لغات + عام + هوية + تقنية</small>
              </div>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'var(--blue-light)', color: 'var(--blue)', display: 'grid', placeItems: 'center', fontSize: '22px' }}>📚</div>
            </div>

            <div style={{
              background: 'var(--card-bg)', border: '1px solid var(--line)',
              borderRadius: 'var(--radius-md)', padding: '20px', boxShadow: 'var(--shadow-sm)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
            }}>
              <div>
                <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>نقاط الفهم والشارات</span>
                <h3 style={{ fontSize: '28px', color: 'var(--navy)', lineHeight: 1, marginBottom: '6px' }}>{childStats.points} ⭐</h3>
                <small style={{ color: 'var(--orange)', fontWeight: 600, fontSize: '12px' }}>🔥 {childStats.badges} شارات إتقان مكتسبة</small>
              </div>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#fff7ed', color: '#ea580c', display: 'grid', placeItems: 'center', fontSize: '22px' }}>⭐</div>
            </div>
          </section>

          {/* 3. Official Expat Exam Calendar Section */}
          <ExamAttemptsCard />

          <section style={{
            background: 'white', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)',
            padding: '24px', boxShadow: 'var(--shadow-sm)', marginBottom: '30px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ fontSize: '18px', color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📅</span> أجندة امتحانات «أبنائنا في الخارج» — وزارة التربية والتعليم المصرية
                </h3>
                <span style={{ fontSize: '12.5px', color: 'var(--muted)' }}>
                  شاملة جميع المواد الخمس المقررة للصف الأول الابتدائي بالسفارات والقنصليات
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  style={{
                    background: 'linear-gradient(135deg, #be123c, #9f1239)', color: 'white',
                    border: 'none', padding: '6px 14px', borderRadius: 'var(--radius-full)',
                    fontSize: '12px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                  onClick={() => setCurrentScreen('exam')}
                >
                  <span>🇪🇬 تجربة محاكي امتحانات السفارة</span>
                </button>
                <button
                  className="tag-badge info"
                  style={{ cursor: 'pointer' }}
                  onClick={() => triggerToast('المحتوى الحالي تجريبي وقيد المراجعة الأكاديمية.')}
                >
                  محتوى تجريبي قيد المراجعة 📚
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              {calendarEvents.map((evt, idx) => (
                <div
                  key={idx}
                  style={{
                    border: '1.5px solid var(--line)', borderRadius: '16px', padding: '16px',
                    background: '#f8fafc', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className="tag-badge info" style={{ fontSize: '11px' }}>{evt.period}</span>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--blue)' }}>{evt.status}</span>
                    </div>
                    <h4 style={{ fontSize: '15px', color: 'var(--navy)', marginBottom: '6px' }}>{evt.stage}</h4>
                    <p style={{ fontSize: '12.5px', color: 'var(--muted)', marginBottom: '10px' }}>{evt.details}</p>
                  </div>
                  {evt.officialNote && (
                    <div style={{ background: '#f0fdf4', padding: '8px 12px', borderRadius: '10px', fontSize: '11.5px', color: '#166534' }}>
                      🛡️ {evt.officialNote}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* 4. Two Columns: Multi-Subject Mastery Matrix & Recorded Archive */}
          <section style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-sm)', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '10px', flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ fontSize: '18px', color: 'var(--navy)', margin: 0 }}>سجل تعلّم {activeChild.name}</h3>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>نشاط محفوظ في هذا المتصفح</span>
              </div>
              <span className="tag-badge info">{Object.keys(learningRecords).length} درسًا له نشاط</span>
            </div>
            {Object.entries(learningRecords).length ? (
              <div style={{ display: 'grid', gap: '9px' }}>
                {Object.entries(learningRecords)
                  .sort((a, b) => new Date(b[1].lastOpenedAt || b[1].completedAt || 0) - new Date(a[1].lastOpenedAt || a[1].completedAt || 0))
                  .map(([lessonId, record]) => {
                    const lesson = curriculumData[record.subject]?.lessons?.find(item => item.id === lessonId);
                    return <div key={lessonId} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '10px 12px', border: '1px solid var(--line)', borderRadius: '10px', flexWrap: 'wrap' }}>
                      <div><strong>{lesson?.title || lessonId}</strong><div style={{ fontSize: '12px', color: 'var(--muted)' }}>{curriculumData[record.subject]?.title || record.subject || 'درس'}</div></div>
                      <div style={{ textAlign: 'left', fontSize: '12px', color: 'var(--muted)' }}>
                        <div>{record.completed ? 'مكتمل ✓' : record.videoProgress ? `الفيديو ${record.videoProgress}%` : 'قيد التعلم'} · فتح {record.openedCount || 0} مرة</div>
                        {record.attempts?.length > 0 && <div>آخر اختبار: {record.lastAttemptCorrect ? 'إجابة صحيحة' : 'يحتاج مراجعة'} ({record.attempts.length} محاولة)</div>}
                      </div>
                    </div>;
                  })}
              </div>
            ) : <p style={{ color: 'var(--muted)', fontSize: '13px' }}>لم يبدأ هذا الطفل أي درس بعد.</p>}
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
            
            {/* Left: Mastery Matrix — مبنية من منهج CMS الحقيقي (المواد المنشورة فقط)، لا بطاقات يدوية */}
            <div id="mastery-matrix-section" style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🎯</span> مصفوفة إتقان المنهج لـ {activeChild.name}
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>تُبنى من المواد والدروس المنشورة في المنهج — وتقدّم {activeChild.name} الفعلي فيها</span>
                </div>
                <span className="tag-badge mastered" style={{ fontSize: '11px' }}>{matrixSubjects.length} مادة منشورة</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '460px', overflowY: 'auto', paddingRight: '4px' }}>
                {matrixSubjects.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '28px 16px', border: '1px dashed var(--line)', borderRadius: 'var(--radius-md)', color: 'var(--muted)' }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>🎯</div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, marginBottom: '4px' }}>لا توجد مواد منشورة بعد</div>
                    <div style={{ fontSize: '12px' }}>عند نشر المواد والدروس من لوحة إدارة المنهج ستظهر هنا تلقائياً</div>
                  </div>
                )}
                {matrixSubjects.map(([subjectKey, subject]) => {
                  const lessons = subject.lessons;
                  const doneCount = lessons.filter(l => isLessonDone(l.id, learningRecords, activeChild.masteredLessons || [])).length;
                  const pct = Math.round((doneCount / lessons.length) * 100);
                  const nextLesson = lessons.find(l => !isLessonDone(l.id, learningRecords, activeChild.masteredLessons || [])) || null;
                  const complete = doneCount === lessons.length;
                  return (
                    <div key={subjectKey} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 14px', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', background: 'var(--bg)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '13.5px', marginBottom: '4px', color: 'var(--navy)' }}>
                          {subject.icon ? `${subject.icon} ` : ''}{subject.title || subjectKey}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginBottom: '6px' }}>
                          {complete
                            ? `أتقن كل الدروس (${lessons.length})`
                            : nextLesson
                              ? `التالي: ${nextLesson.title}`
                              : `${lessons.length} درس`}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: 'var(--line)', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', borderRadius: '3px', background: complete ? 'var(--green)' : 'var(--blue)', transition: 'width .3s' }} />
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{doneCount}/{lessons.length}</span>
                        </div>
                      </div>
                      <button
                        className={complete ? 'tag-badge mastered' : 'btn-secondary'}
                        style={{ padding: '6px 12px', fontSize: '11.5px', whiteSpace: 'nowrap', flexShrink: 0 }}
                        onClick={() => openLesson(subjectKey, (nextLesson || lessons[0]).id, (nextLesson || lessons[0]).type || 'video')}
                      >
                        {complete ? '✓ متقنة بالكامل' : doneCount > 0 ? '↺ تابع' : '▶ ابدأ'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Recorded Archive across Subjects */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--line)' }}>
                <h3 style={{ fontSize: '18px', color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🎥</span> مكتبة الحصص المسجلة (متعددة المواد)
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recordedSessions.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '28px 16px', border: '1px dashed var(--line)', borderRadius: 'var(--radius-md)', color: 'var(--muted)' }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>🎥</div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, marginBottom: '4px' }}>لا توجد حصص مسجلة بعد</div>
                    <div style={{ fontSize: '12px' }}>تُضاف تسجيلات الحصص الحية هنا تلقائياً بعد انعقادها</div>
                  </div>
                )}
                {recordedSessions.map(session => (
                  <div key={session.id} style={{ display: 'flex', gap: '14px', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--line)', background: 'white', alignItems: 'center' }}>
                    <div style={{ width: '72px', height: '52px', borderRadius: '8px', background: session.gradient, display: 'grid', placeItems: 'center', color: 'white', fontSize: '18px', flexShrink: 0, position: 'relative' }}>
                      ▶<small style={{ position: 'absolute', bottom: '2px', right: '4px', fontSize: '9px', background: 'rgba(0,0,0,0.6)', padding: '1px 4px', borderRadius: '4px' }}>{session.duration}</small>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h5 style={{ fontSize: '13.5px', marginBottom: '2px' }}>{session.title}</h5>
                      <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                        {session.teacher ? `${session.teacher} · ` : ''}مسجلة
                      </span>
                    </div>
                    <button style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--blue-light)', color: 'var(--blue)', display: 'grid', placeItems: 'center' }} onClick={() => openLesson(session.subjectKey, session.lessonId, 'video')}>
                      ▶
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* Modal: Add Child */}
      {showAddChildModal && (
        <div className="modal-overlay">
          <div style={{ background: 'white', borderRadius: '24px', padding: '30px', maxWidth: '440px', width: '100%' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '14px', color: 'var(--navy)' }}>إضافة طفل جديد للحساب 👶</h3>
            <form onSubmit={handleCreateChild}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '13.5px', marginBottom: '6px' }}>اسم الطفل</label>
                <input
                  type="text"
                  style={{ width: '100%', padding: '12px', border: '2px solid var(--line)', borderRadius: '10px' }}
                  placeholder="مثال: يوسف"
                  value={newChildName}
                  onChange={(e) => setNewChildName(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '13.5px', marginBottom: '6px' }}>الصف الدراسي</label>
                <select
                  style={{ width: '100%', padding: '12px', border: '2px solid var(--line)', borderRadius: '10px', background: 'white' }}
                  value={newChildGrade}
                  onChange={(e) => setNewChildGrade(e.target.value)}
                >
                  <option value="الصف الأول الابتدائي">الصف الأول الابتدائي (المنهج المصري)</option>
                  <option value="الصف الثاني الابتدائي">الصف الثاني الابتدائي (المنهج المصري)</option>
                  <option value="الصف الثالث الابتدائي">الصف الثالث الابتدائي (المنهج المصري)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-accent" style={{ flex: 1, justifyContent: 'center' }} type="submit">
                  إضافة الطفل
                </button>
                <button
                  type="button"
                  style={{ background: '#e2e8f0', color: 'var(--navy)', border: 'none', padding: '12px 18px', borderRadius: 'var(--radius-md)', fontWeight: 700 }}
                  onClick={() => setShowAddChildModal(false)}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
