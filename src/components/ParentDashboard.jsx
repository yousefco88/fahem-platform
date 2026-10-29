import React, { useState } from 'react';
import LiveJoin from './LiveJoin';
import { slotsForToday, timeInTz } from '../utils/liveWindow';
import { useApp } from '../context/AppContext';
import AiTutorConsentCard from './parent/AiTutorConsentCard';
import { getChildStats } from '../utils/childProgress';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { isLessonDone } from '../utils/todayPlan';
// Dynamic import for PDF (lazy load - reduces bundle)
const loadPdfGenerator = () => import('./parent/WeeklyReportPDF');
import useStreak, { getStreakMessage, getLevelTitle } from '../hooks/useStreak';
import Emoji from '../ui/Emoji';

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
    scheduleData,
    effectiveTimezone,
    setCurrentScreen,
    triggerToast
  } = useApp();
  const todayLive = slotsForToday((scheduleData || []).filter(x => x.type === 'live'), effectiveTimezone);
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
              style={{ background: 'none', color: 'var(--blue-text)', fontSize: '11px', fontWeight: 800 }}
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
                  color: child.id === activeChild.id ? 'var(--blue-text)' : 'var(--navy)',
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
            background: 'var(--blue-light)', border: '1.5px solid var(--blue-border)',
            borderRadius: 'var(--radius-md)', padding: '14px',
            display: 'flex', alignItems: 'center', gap: '12px'
          }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: 'var(--blue-light)', border: '2px solid var(--blue)',
              display: 'grid', placeItems: 'center', fontSize: '22px'
            }}>
              {activeChild.avatar}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h4 style={{ fontSize: '15px', marginBottom: '2px' }}>{activeChild.name} (الملف النشط)</h4>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{activeChild.grade}</span>
            </div>
          </div>

          <AiTutorConsentCard />

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
                  <span style={{ fontSize: '20px' }}><Emoji>🔥</Emoji></span>
                  <span style={{ fontWeight: 800, color: 'var(--amber-text)', fontSize: '18px' }}>
                    {streak.currentStreak}
                  </span>
                  <span style={{ fontWeight: 600, color: 'var(--amber-text)', fontSize: '12px' }}>
                    {streak.currentStreak === 1 ? 'يوم' : 'أيام'}
                  </span>
                </div>
                <span style={{
                  background: streak.isActiveToday ? '#16a34a' : '#475569',
                  color: 'white',
                  padding: '3px 8px',
                  borderRadius: '10px',
                  fontSize: '10px',
                  fontWeight: 700
                }}>
                  {streak.isActiveToday ? '✅ نشط' : '⏳ لم يبدأ'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--amber-text)' }}>
                <span>⭐ {streak.xpTotal} XP</span>
                <span>🎖️ Lv.{streak.level}</span>
                <span>🏆 أفضل: {streak.bestStreak}</span>
              </div>
            </div>
          )}
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <button className="u-12 quick-link active">
            <span>⌂</span> لوحة المتابعة الشاملة
          </button>
          <button
            className="u-12"
            onClick={() => document.getElementById('live-schedule-section')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <span><Emoji>🗓</Emoji></span> جدول الحصص الحية
          </button>
          <button
            className="u-12"
            onClick={() => document.getElementById('mastery-matrix-section')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <span><Emoji>🎯</Emoji></span> مصفوفة إتقان المهارات (5 مواد)
          </button>
          <button
            className="u-12"
            onClick={() => setCurrentScreen('pricing')}
          >
            <span><Emoji>💳</Emoji></span> باقة الاشتراك النشطة
          </button>
        </nav>

        {/* WhatsApp integration placeholder */}
        <button
          style={{
            background: 'linear-gradient(135deg, #25D366, #128C7E)', color: 'white', padding: '11px', borderRadius: 999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            fontWeight: 800, fontSize: '12.5px', boxShadow: 'var(--press)'
          }}
          onClick={() => {
            const shareText = `سجّل طفلك في منصة فاهم للتعليم المصري بالخارج 📚\n${window.location.origin}`;
            window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
          }}
        >
          <span><Emoji>💬</Emoji></span>
          <span>إرسال الرابط عبر واتساب</span>
        </button>

        {/* 📄 Weekly PDF Report Button */}
        <button
          style={{
            background: 'var(--g-primary)', color: 'white',
            padding: '11px', borderRadius: 999,
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
            marginTop: 'auto', background: 'var(--g-fun)',
            color: 'white', padding: '14px', borderRadius: 999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            fontWeight: 700, boxShadow: '0 10px 20px rgba(236,72,153,0.25)'
          }}
          onClick={() => setCurrentScreen('child')}
        >
          <span>دخول مساحة {activeChild.name}</span>
          <span style={{ fontSize: '18px' }}><Emoji>🚀</Emoji></span>
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="main-viewport">
        <header style={{
          height: '72px', background: 'var(--card-bg)', borderBottom: '1px solid var(--line)',
          padding: '0 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <h2 style={{ fontSize: '20px' }}>متابعة تقدّم: {activeChild.name} 🌟</h2>
            <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
              التوقيت المحلي المحسوب: {countryText}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button className="tag-badge" style={{ background: 'var(--green-light)', color: 'var(--green-text)', cursor: 'pointer' }} onClick={() => setCurrentScreen('ai-tutor')}>
              🤖 مساعد التدريب
            </button>
            <button className="tag-badge info" onClick={() => setCurrentScreen('pricing')}>
              📚 الوصول التجريبي المجاني
            </button>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: 'var(--blue-light)', color: 'var(--blue-text)', display: 'grid',
              placeItems: 'center', fontWeight: 800
            }}>أ.م</div>
          </div>
        </header>

        <div style={{ padding: '32px', maxWidth: '1350px', width: '100%', margin: '0 auto' }}>
          
          {/* Missed Class Recovery Reassurance Alert */}
          <div style={{
            background: 'var(--green-light)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-md)',
            padding: '14px 20px', marginBottom: '22px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}><Emoji>🛡️</Emoji></span>
              <div>
                <strong style={{ color: 'var(--green-text)', fontSize: '13.5px', display: 'block' }}>
                  تغطية المنهج المصري المتكامل لأبنائنا بالخارج:
                </strong>
                <span style={{ color: 'var(--green-text)', fontSize: '12.5px' }}>
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

          {/* حصة مباشرة اليوم لهذا الطفل (تظهر فقط إن وُجدت في جدوله) */}
          {todayLive.length > 0 && (
            <section id="live-schedule-section" style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '18px', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', color: 'var(--navy)', marginBottom: '10px' }}><Emoji>🔴</Emoji> حصة مباشرة اليوم</h3>
              {todayLive.map(x => (
                <div key={x.id} style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '6px', fontSize: '14px', color: 'var(--navy)' }}>
                    <strong style={{ direction: 'ltr' }}>{timeInTz(x.startsAt, effectiveTimezone)}</strong>
                    <span>{curriculumData[x.subjectId]?.title || x.subjectId}</span>
                  </div>
                  <LiveJoin slot={x} />
                </div>
              ))}
            </section>
          )}

          {/* 2. Reassurance Metrics Grid */}
          <section style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '18px', marginBottom: '30px'
          }}>
            <div className="u-13">
              <div>
                <span className="u-14">حضور الحصص الحية</span>
                <h3 className="u-15">—</h3>
                <small style={{ color: 'var(--muted)', fontWeight: 600, fontSize: '12px' }}>يُحتسب بعد بدء الحصص المباشرة</small>
              </div>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'var(--green-light)', color: '#10b981', display: 'grid', placeItems: 'center', fontSize: '22px' }}><Emoji>🗓</Emoji></div>
            </div>

            <div className="u-13">
              <div>
                <span className="u-14">المهارات المتقنة بنجاح</span>
                <h3 className="u-15">{childStats.done} / {childStats.total}</h3>
                <small style={{ color: 'var(--green-text)', fontWeight: 600, fontSize: '12px' }}>⭐ درس متقن من المنهج المنشور</small>
              </div>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'var(--yellow-light)', color: '#ca8a04', display: 'grid', placeItems: 'center', fontSize: '22px' }}><Emoji>🏆</Emoji></div>
            </div>

            <div className="u-13">
              <div>
                <span className="u-14">مواد ومسارات تجريبية</span>
                <h3 className="u-15">{Object.values(curriculumData || {}).filter(v => Array.isArray(v?.lessons)).length} مسارًا</h3>
                <small style={{ color: 'var(--blue-text)', fontWeight: 600, fontSize: '12px' }}><Emoji>📖</Emoji> لغات + عام + هوية + تقنية</small>
              </div>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'var(--blue-light)', color: 'var(--blue-text)', display: 'grid', placeItems: 'center', fontSize: '22px' }}><Emoji>📚</Emoji></div>
            </div>

            <div className="u-13">
              <div>
                <span className="u-14">نقاط الفهم والشارات</span>
                <h3 className="u-15">{childStats.points} ⭐</h3>
                <small style={{ color: 'var(--orange-text)', fontWeight: 600, fontSize: '12px' }}>🔥 {childStats.badges} شارات إتقان مكتسبة</small>
              </div>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'var(--orange-light)', color: 'var(--orange-text)', display: 'grid', placeItems: 'center', fontSize: '22px' }}>⭐</div>
            </div>
          </section>

          {/* 3. أجندة امتحانات المغتربين الرسمية — تُدار بالكامل من لوحة الإدارة (site_settings.examCalendar) */}
          <section style={{
            background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)',
            padding: '24px', boxShadow: 'var(--shadow-sm)', marginBottom: '30px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ fontSize: '18px', color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span><Emoji>📅</Emoji></span> أجندة امتحانات «أبنائنا في الخارج» — وزارة التربية والتعليم المصرية
                </h3>
                <span style={{ fontSize: '12.5px', color: 'var(--muted)' }}>
                  {siteSettings.examCalendar?.subtitle || 'المحطات الرسمية لامتحانات الطلبة المصريين بالخارج'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {siteSettings.examCalendar?.officialUrl && (
                  <a
                    className="tag-badge mastered"
                    href={siteSettings.examCalendar.officialUrl}
                    target="_blank" rel="noopener noreferrer"
                    style={{ cursor: 'pointer', textDecoration: 'none' }}
                  >
                    🔗 {siteSettings.examCalendar.officialUrlLabel || 'بوابة التسجيل الرسمية'}
                  </a>
                )}
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
              {calendarEvents.map((evt) => (
                <div
                  key={`${evt.stage}-${evt.period}`}
                  style={{
                    border: '1.5px solid var(--line)', borderRadius: '16px', padding: '16px',
                    background: 'var(--bg)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className="tag-badge info" style={{ fontSize: '11px' }}>{evt.period}</span>
                      {/* لون الحالة حسب قيمتها: مجدول أزرق، قريباً برتقالي، منتهٍ/مكتمل أخضر */}
                      <span style={{ fontSize: '12px', fontWeight: 800, color: evt.status === 'قريباً' ? 'var(--orange-text)' : (evt.status || '').match(/منته|مكتمل|تم/) ? 'var(--green-text)' : 'var(--blue-text)' }}>{evt.status}</span>
                    </div>
                    <h4 style={{ fontSize: '15px', color: 'var(--navy)', marginBottom: '6px' }}>{evt.stage}</h4>
                    <p style={{ fontSize: '12.5px', color: 'var(--muted)', marginBottom: '10px' }}>{evt.details}</p>
                  </div>
                  {evt.officialNote && (
                    <div style={{ background: 'var(--green-light)', padding: '8px 12px', borderRadius: '10px', fontSize: '11.5px', color: 'var(--green-text)' }}>
                      🛡️ {evt.officialNote}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* 4. Two Columns: Multi-Subject Mastery Matrix & Recorded Archive */}
          <section style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-sm)', marginBottom: '24px' }}>
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
            <div id="mastery-matrix-section" className="u-16">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span><Emoji>🎯</Emoji></span> مصفوفة إتقان المنهج لـ {activeChild.name}
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>تُبنى من المواد والدروس المنشورة في المنهج — وتقدّم {activeChild.name} الفعلي فيها</span>
                </div>
                <span className="tag-badge mastered" style={{ fontSize: '11px' }}>{matrixSubjects.length} مادة منشورة</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '460px', overflowY: 'auto', paddingRight: '4px' }}>
                {matrixSubjects.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '28px 16px', border: '1px dashed var(--line)', borderRadius: 'var(--radius-md)', color: 'var(--muted)' }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}><Emoji>🎯</Emoji></div>
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

          </div>

        </div>
      </main>

      {/* Modal: Add Child */}
      {showAddChildModal && (
        <div className="modal-overlay">
          <div style={{ background: 'var(--card-bg)', borderRadius: '24px', padding: '30px', maxWidth: '440px', width: '100%' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '14px', color: 'var(--navy)' }}>إضافة طفل جديد للحساب 👶</h3>
            <form onSubmit={handleCreateChild}>
              <div style={{ marginBottom: '16px' }}>
                <label className="u-9">اسم الطفل</label>
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
                <label className="u-9">الصف الدراسي</label>
                <select
                  style={{ width: '100%', padding: '12px', border: '2px solid var(--line)', borderRadius: '10px', background: 'var(--card-bg)' }}
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
                  className="btn-ghost"
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
