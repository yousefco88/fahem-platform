import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function ParentDashboard() {
  const {
    activeChild,
    childrenList,
    switchChild,
    addChild,
    curriculumData,
    openLesson,
    countryText,
    liveClassTimeText,
    setCurrentScreen,
    setShowLiveModal,
    triggerToast
  } = useApp();

  const [showAddChildModal, setShowAddChildModal] = useState(false);
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

  const calendarEvents = curriculumData.expatExamCalendar || [];

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
            onClick={() => triggerToast('جدول الحصص المباشرة والمسجلة متاح في الأسفل')}
          >
            <span>🗓</span> جدول الحصص الحية
          </button>
          <button
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
              borderRadius: 'var(--radius-md)', background: 'transparent', color: '#475569',
              fontWeight: 600, fontSize: '14px', width: '100%', textAlign: 'right'
            }}
            onClick={() => triggerToast('سجل إتقان المهارات معروض في اللوحة')}
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

        {/* WhatsApp Notification Simulator */}
        <button
          style={{
            background: '#25D366', color: 'white', padding: '11px', borderRadius: 'var(--radius-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            fontWeight: 700, fontSize: '12.5px', boxShadow: '0 4px 10px rgba(37,211,102,0.25)'
          }}
          onClick={() => triggerToast(`📲 تم إرسال تذكير حصة اليوم وتقرير ${activeChild.name} إلى رقم واتساب الخاص بك بنجاح!`)}
        >
          <span>💬</span>
          <span>إرسال الرابط عبر واتساب</span>
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
            <button className="tag-badge mastered" onClick={() => setCurrentScreen('pricing')}>
              🟢 باقة التأسيس الحي النشطة (شاملة الـ 5 مواد)
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
                  جميع المواد الرسمية المعتمدة لاختبارات السفارات (اللغة العربية، الرياضيات، Connect الإنجليزية، اكتشف Discover، والتربية الدينية) مغطاة بحصص حية وتسجيلات دائمة.
                </span>
              </div>
            </div>
            <button
              className="btn-secondary"
              style={{ padding: '7px 14px', fontSize: '12px' }}
              onClick={() => openLesson('arabic', 'baa', 'video')}
            >
              عرض آخر تسجيل متاح
            </button>
          </div>

          {/* 1. Live Hero Session Card */}
          <section style={{
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
              <span>الحصة الحية القادمة اليوم</span>
            </div>

            <h1 style={{ fontSize: '26px', marginBottom: '8px', fontWeight: 800 }}>
              اللغة العربية: أصوات حرف الباء الممدودة وتكوين الكلمات
            </h1>
            <p style={{ color: '#cbd5e1', maxWidth: '650px', fontSize: '14.5px', marginBottom: '22px' }}>
              حصة تفاعلية مباشرة مع الأستاذة <strong>سارة أحمد</strong> في مجموعة صغيرة (4 طلاب). يتعلم فيها {activeChild.name} نطق الحرف، التمييز السمعي، والمشاركة الصوتية.
            </p>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn-accent" onClick={() => setShowLiveModal(true)}>
                <span>دخول الفصل الحي الآن (السبورة التفاعلية)</span>
                <span>🔴</span>
              </button>
              <button
                style={{
                  background: 'rgba(255, 255, 255, 0.12)', color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.25)', padding: '12px 20px',
                  borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '14px'
                }}
                onClick={() => triggerToast(`📲 تم إرسال تذكير حصة ${activeChild.name} عبر واتساب برقم ولي الأمر`)}
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
                <h3 style={{ fontSize: '28px', color: 'var(--navy)', lineHeight: 1, marginBottom: '6px' }}>100%</h3>
                <small style={{ color: 'var(--green)', fontWeight: 600, fontSize: '12px' }}>✓ 5 مواد أساسية مغطاة</small>
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
                <h3 style={{ fontSize: '28px', color: 'var(--navy)', lineHeight: 1, marginBottom: '6px' }}>{activeChild.masteredSkills} / 10</h3>
                <small style={{ color: 'var(--green)', fontWeight: 600, fontSize: '12px' }}>⭐ في العربي والماث والكونكت</small>
              </div>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#fefce8', color: '#ca8a04', display: 'grid', placeItems: 'center', fontSize: '22px' }}>🏆</div>
            </div>

            <div style={{
              background: 'var(--card-bg)', border: '1px solid var(--line)',
              borderRadius: 'var(--radius-md)', padding: '20px', boxShadow: 'var(--shadow-sm)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
            }}>
              <div>
                <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>المواد الدراسية المعتمدة</span>
                <h3 style={{ fontSize: '28px', color: 'var(--navy)', lineHeight: 1, marginBottom: '6px' }}>12 مادة</h3>
                <small style={{ color: 'var(--blue)', fontWeight: 600, fontSize: '12px' }}>📖 لغات + عام + هوية + تقنية</small>
              </div>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#eff6ff', color: '#2563eb', display: 'grid', placeItems: 'center', fontSize: '22px' }}>📚</div>
            </div>

            <div style={{
              background: 'var(--card-bg)', border: '1px solid var(--line)',
              borderRadius: 'var(--radius-md)', padding: '20px', boxShadow: 'var(--shadow-sm)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
            }}>
              <div>
                <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>نقاط الفهم والشارات</span>
                <h3 style={{ fontSize: '28px', color: 'var(--navy)', lineHeight: 1, marginBottom: '6px' }}>{activeChild.points} ⭐</h3>
                <small style={{ color: 'var(--orange)', fontWeight: 600, fontSize: '12px' }}>🔥 {activeChild.badges} شارات إتقان مكتسبة</small>
              </div>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#fff7ed', color: '#ea580c', display: 'grid', placeItems: 'center', fontSize: '22px' }}>⭐</div>
            </div>
          </section>

          {/* 3. Official Expat Exam Calendar Section */}
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
                  onClick={() => triggerToast('المنهج مشمول ومعتمد لامتحانات السفارات')}
                >
                  مربوط بالمنهج الوزاري الرسمي 🇪🇬
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
            
            {/* Left: Mastery Matrix across all official subjects */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🎯</span> مصفوفة إتقان المنهج الكامل لـ {activeChild.name}
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>شاملة المسار العام ومسار مدارس اللغات والهوية</span>
                </div>
                <span className="tag-badge mastered" style={{ fontSize: '11px' }}>12 مادة مغطاة</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '460px', overflowY: 'auto', paddingRight: '4px' }}>
                {/* 1. Arabic */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', background: '#fafaf9' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', marginBottom: '2px' }}>📖 اللغة العربية: حرف الباء وأصوات المد</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>التمييز السمعي والبصري للحركات الطويلة</div>
                  </div>
                  <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '11.5px' }} onClick={() => openLesson('arabic', 'baa', 'quiz')}>
                    {activeChild.baaMastered ? '✓ متقن' : '↺ مراجعة'}
                  </button>
                </div>

                {/* 2. Connect Plus for Languages */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', border: '1px solid #ddd6fe', borderRadius: 'var(--radius-md)', background: '#f5f3ff' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', marginBottom: '2px', color: '#6d28d9' }}>🌟 Connect Plus (لغات): My Senses & Phonics /s/</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>Sentence Building & Speaking Fluency</div>
                  </div>
                  <button className="tag-badge mastered" onClick={() => openLesson('connect_plus', 'cp_senses', 'video')}>
                    ✓ متقن (لغات)
                  </button>
                </div>

                {/* 3. Math English */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', border: '1px solid #ccfbf1', borderRadius: 'var(--radius-md)', background: '#f0fdfa' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', marginBottom: '2px', color: '#0f766e' }}>📐 Math (English): Numbers 1-10 & Ten-Frame</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>Counting, Place Value & Greater/Less than</div>
                  </div>
                  <button className="tag-badge mastered" onClick={() => openLesson('math_en', 'mathen_count_10', 'quiz')}>
                    ✓ متقن (لغات)
                  </button>
                </div>

                {/* 4. Arabic Math */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', background: '#fafaf9' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', marginBottom: '2px' }}>🔢 الرياضيات: المقارنة (أكبر من وأصغر من)</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>الوحدة الأولى · رمز التمساح الجائع</div>
                  </div>
                  <button className="tag-badge mastered" onClick={() => openLesson('math', 'math_compare', 'guide')}>
                    💡 دليل المذاكرة
                  </button>
                </div>

                {/* 5. ICT & Logic */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', border: '1px solid #e0e7ff', borderRadius: 'var(--radius-md)', background: '#eef2ff' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', marginBottom: '2px', color: '#4338ca' }}>💻 تكنولوجيا المعلومات: مكونات الحاسوب والأمان</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>الأمان الرقمي ومقدمة التفكير البرمجي</div>
                  </div>
                  <button className="tag-badge mastered" onClick={() => openLesson('ict', 'ict_basics', 'quiz')}>
                    ✓ متقن بالكامل
                  </button>
                </div>

                {/* 6. Egyptian Heritage & Geography */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', border: '1px solid #fee2e2', borderRadius: 'var(--radius-md)', background: '#fef2f2' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', marginBottom: '2px', color: '#b91c1c' }}>🇪🇬 معالم وتاريخ مصر: نهر النيل والأهرامات</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>الهوية الوطنية وخريطة مصر وألوان العلم</div>
                  </div>
                  <button className="tag-badge mastered" onClick={() => openLesson('social', 'soc_nile', 'video')}>
                    ✓ مسار الهوية
                  </button>
                </div>

                {/* 7. Phonics & Fast Reading */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', border: '1px solid #fce7f3', borderRadius: 'var(--radius-md)', background: '#fdf2f8' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', marginBottom: '2px', color: '#be185d' }}>✍️ نور البيان: التهجي السريع وقاعدة الفتح</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>علاج ضعف القراءة لأبناء المغتربين والخط</div>
                  </div>
                  <button className="tag-badge mastered" onClick={() => openLesson('phonics_arabic', 'ph_fast_reading', 'quiz')}>
                    ✓ متقن بالكامل
                  </button>
                </div>

                {/* 8. Discover */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', background: '#fafaf9' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', marginBottom: '2px' }}>🔬 اكتشف: الحواس الخمس والبيئة</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>من أكون؟ العلوم المتكاملة والبيئة</div>
                  </div>
                  <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '11.5px' }} onClick={() => openLesson('discover', 'disc_senses', 'guide')}>
                    💡 دليل الأنشطة
                  </button>
                </div>

                {/* 9. Islamic / Christian Religion & Ethics */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', background: '#fafaf9' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', marginBottom: '2px' }}>🕋 التربية الإسلامية: سورة الفاتحة والآداب</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>التلاوة والتجويد وقيم بر الوالدين والصدق</div>
                  </div>
                  <button className="tag-badge mastered" onClick={() => openLesson('islamic_religion', 'isl_fatiha', 'video')}>
                    ✓ متقن بالكامل
                  </button>
                </div>
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
                <div style={{ display: 'flex', gap: '14px', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--line)', background: 'white', alignItems: 'center' }}>
                  <div style={{ width: '72px', height: '52px', borderRadius: '8px', background: 'linear-gradient(135deg, #1e293b, #8b5cf6)', display: 'grid', placeItems: 'center', color: 'white', fontSize: '18px', flexShrink: 0, position: 'relative' }}>
                    ▶<small style={{ position: 'absolute', bottom: '2px', right: '4px', fontSize: '9px', background: 'rgba(0,0,0,0.6)', padding: '1px 4px', borderRadius: '4px' }}>27:30</small>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h5 style={{ fontSize: '13.5px', marginBottom: '2px' }}>Connect 1: Unit 1 Phonics & Busy Bee</h5>
                    <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>اللغة الإنجليزية · أ/ دينا مصطفى · مسجلة</span>
                  </div>
                  <button style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--blue-light)', color: 'var(--blue)', display: 'grid', placeItems: 'center' }} onClick={() => openLesson('english', 'eng_hello', 'video')}>
                    ▶
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '14px', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--line)', background: 'white', alignItems: 'center' }}>
                  <div style={{ width: '72px', height: '52px', borderRadius: '8px', background: 'linear-gradient(135deg, #1e3a8a, #0284c7)', display: 'grid', placeItems: 'center', color: 'white', fontSize: '18px', flexShrink: 0, position: 'relative' }}>
                    ▶<small style={{ position: 'absolute', bottom: '2px', right: '4px', fontSize: '9px', background: 'rgba(0,0,0,0.6)', padding: '1px 4px', borderRadius: '4px' }}>29:30</small>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h5 style={{ fontSize: '13.5px', marginBottom: '2px' }}>اكتشف: الحواس الخمس واستكشاف العالم</h5>
                    <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>ديسكفر · أ/ أحمد سالم · مسجلة</span>
                  </div>
                  <button style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--blue-light)', color: 'var(--blue)', display: 'grid', placeItems: 'center' }} onClick={() => openLesson('discover', 'disc_senses', 'video')}>
                    ▶
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '14px', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--line)', background: 'white', alignItems: 'center' }}>
                  <div style={{ width: '72px', height: '52px', borderRadius: '8px', background: 'linear-gradient(135deg, #1e3a8a, #d97706)', display: 'grid', placeItems: 'center', color: 'white', fontSize: '18px', flexShrink: 0, position: 'relative' }}>
                    ▶<small style={{ position: 'absolute', bottom: '2px', right: '4px', fontSize: '9px', background: 'rgba(0,0,0,0.6)', padding: '1px 4px', borderRadius: '4px' }}>25:20</small>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h5 style={{ fontSize: '13.5px', marginBottom: '2px' }}>التربية والأخلاق: الصدق والأمانة في الفصل</h5>
                    <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>القيم والأخلاق · مسجلة</span>
                  </div>
                  <button style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--blue-light)', color: 'var(--blue)', display: 'grid', placeItems: 'center' }} onClick={() => openLesson('values', 'val_honesty', 'video')}>
                    ▶
                  </button>
                </div>
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
