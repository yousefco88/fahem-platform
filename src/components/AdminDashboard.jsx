import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function AdminDashboard() {
  const {
    curriculumData,
    setCurriculumData,
    setShowLiveModal,
    triggerToast
  } = useApp();

  const [activeAdminTab, setActiveAdminTab] = useState('cms');
  const [selectedSubjectId, setSelectedSubjectId] = useState('arabic');
  const [selectedLessonIndex, setSelectedLessonIndex] = useState(0);

  // Editable lesson state
  const currentSubject = curriculumData[selectedSubjectId] || curriculumData.arabic;
  const currentLesson = currentSubject.lessons?.[selectedLessonIndex] || currentSubject.lessons?.[0];

  const [editTitle, setEditTitle] = useState(currentLesson?.title || '');
  const [editObjective, setEditObjective] = useState(currentLesson?.objective || '');
  const [editDuration, setEditDuration] = useState(currentLesson?.duration || '');
  const [editQuestion, setEditQuestion] = useState(currentLesson?.question || '');

  // Keep editor synced when subject/lesson changes
  const handleSelectLesson = (subjId, index) => {
    setSelectedSubjectId(subjId);
    setSelectedLessonIndex(index);
    const lesson = curriculumData[subjId]?.lessons?.[index];
    if (lesson) {
      setEditTitle(lesson.title);
      setEditObjective(lesson.objective);
      setEditDuration(lesson.duration);
      setEditQuestion(lesson.question || '');
    }
  };

  // Save lesson modifications
  const handleSaveLesson = (e) => {
    e.preventDefault();
    if (!currentLesson) return;

    const updatedData = { ...curriculumData };
    const updatedLessons = [...updatedData[selectedSubjectId].lessons];
    updatedLessons[selectedLessonIndex] = {
      ...updatedLessons[selectedLessonIndex],
      title: editTitle,
      objective: editObjective,
      duration: editDuration,
      question: editQuestion
    };
    updatedData[selectedSubjectId] = {
      ...updatedData[selectedSubjectId],
      lessons: updatedLessons
    };

    setCurriculumData(updatedData);
    triggerToast(`✓ تم حفظ وتحديث درس "${editTitle}" ونشره فوراً للطلاب والمعلمين!`);
  };

  // Staff & RBAC Mock Data
  const [staffMembers, setStaffMembers] = useState([
    { id: 1, name: 'د. إبراهيم فؤاد', role: 'المدير العام (Super Admin)', email: 'director@fahem.academy', status: 'نشط', canEditCMS: true, canAudit: true, canBilling: true },
    { id: 2, name: 'أ. منى عادل', role: 'مشرفة المناهج ولغات', email: 'mona.curriculum@fahem.academy', status: 'نشط', canEditCMS: true, canAudit: true, canBilling: false },
    { id: 3, name: 'م. طارق حسن', role: 'مسؤول العمليات والدعم', email: 'support@fahem.academy', status: 'نشط', canEditCMS: false, canAudit: true, canBilling: false },
    { id: 4, name: 'أ. سارة أحمد', role: 'معلمة أولى معتمدة', email: 'sara.teacher@fahem.academy', status: 'نشط', canEditCMS: false, canAudit: false, canBilling: false }
  ]);

  // Audit Log items
  const auditLogs = [
    { time: 'منذ 5 دقائق', user: 'د. إبراهيم فؤاد (Super Admin)', action: 'تعديل ونشر هدف تعليمي في مادة Connect Plus', ip: '156.202.44.12', badge: 'تعديل محتوى' },
    { time: 'منذ 18 دقيقة', user: 'أ. سارة أحمد (معلمة)', action: 'جدولة حصة ميكرو-جروب (المجموعة أ) - الرياضيات', ip: '41.34.12.98', badge: 'جدولة حصة' },
    { time: 'منذ 45 دقيقة', user: 'م. طارق حسن (الدعم)', action: 'إعادة إرسال رابط حصة عبر واتساب لولي أمر بالرياض', ip: '156.198.5.60', badge: 'دعم فني' },
    { time: 'منذ ساعتين', user: 'نظام المنصة الآلي', action: 'تفعيل اشتراك باقة التأسيس الحي لأسرة الطالب عمر الشافعي (جدة)', ip: 'سيرفر الدفع', badge: 'مالية واشتراك' },
    { time: 'منذ 3 ساعات', user: 'أ. منى عادل (مشرفة)', action: 'دخول في وضع الرقابة الخفية (Ghost Mode) لحصة اكتشف لمراجعة الأداء', ip: '197.55.22.10', badge: 'رقابة وجودة' }
  ];

  return (
    <div style={{ maxWidth: '1400px', margin: '24px auto', padding: '0 24px', width: '100%' }}>
      {/* Super Admin Top Banner */}
      <section style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #334155 100%)',
        color: 'white', borderRadius: 'var(--radius-lg)', padding: '24px 30px',
        marginBottom: '26px', boxShadow: '0 20px 40px rgba(15, 23, 42, 0.4)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '54px', height: '54px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #38bdf8, #2563eb)',
            display: 'grid', placeItems: 'center', fontSize: '26px', fontWeight: 900
          }}>
            ⚙️
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800 }}>لوحة التحكم والرقابة العليا (Super Admin)</h1>
              <span style={{ background: '#0284c7', color: 'white', fontSize: '11px', padding: '3px 10px', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
                كامل الصلاحيات
              </span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '13.5px', marginTop: '4px' }}>
              إدارة المناهج والصفحات (CMS) • الصلاحيات والأدوار (RBAC) • سجل التدقيق التاريخي • والرقابة التربوية
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            style={{
              background: '#38bdf8', color: '#0f172a', padding: '10px 18px',
              borderRadius: 'var(--radius-md)', fontWeight: 800, fontSize: '13px', border: 'none', cursor: 'pointer'
            }}
            onClick={() => triggerToast('✓ تم عمل نسخة احتياطية فورية لقاعدة بيانات المناهج')}
          >
            💾 حفظ نسخة احتياطية
          </button>
          <button
            style={{
              background: 'rgba(255, 255, 255, 0.12)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.25)',
              padding: '10px 18px', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '13px', cursor: 'pointer'
            }}
            onClick={() => setShowLiveModal(true)}
          >
            👁️ دخول وضع الرقابة الخفية (Ghost Mode)
          </button>
        </div>
      </section>

      {/* Admin KPI Ribbon */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px', marginBottom: '26px'
      }}>
        <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '18px', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>الطلاب المسجلون بالخارج</span>
          <h3 style={{ fontSize: '26px', color: 'var(--navy)' }}>420 طالباً</h3>
          <small style={{ color: 'var(--green)', fontWeight: 700, fontSize: '11.5px' }}>✓ 65% في السعودية والخليج</small>
        </div>

        <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '18px', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>طاقم المعلمين المعتمدين</span>
          <h3 style={{ fontSize: '26px', color: 'var(--navy)' }}>28 معلماً</h3>
          <small style={{ color: 'var(--blue)', fontWeight: 700, fontSize: '11.5px' }}>👥 100% مدربون على Edu 2.0</small>
        </div>

        <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '18px', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>المواد والمسارات النشطة</span>
          <h3 style={{ fontSize: '26px', color: '#7c3aed' }}>12 مادة</h3>
          <small style={{ color: '#7c3aed', fontWeight: 700, fontSize: '11.5px' }}>شاملة Connect Plus والماث</small>
        </div>

        <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '18px', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>مؤشر الإتقان ورضا الأسر</span>
          <h3 style={{ fontSize: '26px', color: 'var(--green)' }}>99.2%</h3>
          <small style={{ color: 'var(--green)', fontWeight: 700, fontSize: '11.5px' }}>⭐ 4.9/5 في تقييمات السفارة</small>
        </div>
      </div>

      {/* Admin Tabs */}
      <div style={{
        display: 'flex', gap: '8px', borderBottom: '2px solid var(--line)',
        marginBottom: '24px', overflowX: 'auto', paddingBottom: '2px'
      }}>
        {[
          { id: 'cms', label: '📖 محرر المناهج والصفحات (CMS)', icon: '📖' },
          { id: 'rbac', label: '👥 المستخدمين والصلاحيات (RBAC)', icon: '👥' },
          { id: 'audit', label: '🛡️ سجل التدقيق والرقابة (Audit Trail)', icon: '🛡️' },
          { id: 'subscriptions', label: '💳 الاشتراكات وتوزيع المغتربين', icon: '💳' }
        ].map(tab => (
          <button
            key={tab.id}
            style={{
              padding: '12px 20px', borderRadius: '12px 12px 0 0', fontWeight: 800, fontSize: '13.5px',
              border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              background: activeAdminTab === tab.id ? 'var(--blue)' : 'transparent',
              color: activeAdminTab === tab.id ? 'white' : '#64748b'
            }}
            onClick={() => setActiveAdminTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: CURRICULUM CMS */}
      {activeAdminTab === 'cms' && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
          {/* Subject & Lesson Navigator */}
          <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '16px', color: 'var(--navy)', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>قائمة المواد والدروس</span>
              <button
                style={{ background: 'none', color: 'var(--blue)', fontSize: '12px', fontWeight: 800, border: 'none', cursor: 'pointer' }}
                onClick={() => triggerToast('إضافة مادة جديدة تتطلب اعتماد المشرف العام')}
              >
                + مادة جديدة
              </button>
            </h3>

            {/* Subject Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
              {Object.keys(curriculumData)
                .filter(key => key !== 'expatExamCalendar')
                .map(key => {
                  const s = curriculumData[key];
                  return (
                    <button
                      key={key}
                      style={{
                        textAlign: 'right', padding: '10px 12px', borderRadius: 'var(--radius-md)',
                        border: selectedSubjectId === key ? '2px solid var(--blue)' : '1px solid var(--line)',
                        background: selectedSubjectId === key ? 'var(--blue-light)' : '#ffffff',
                        color: selectedSubjectId === key ? 'var(--blue)' : 'var(--navy)',
                        fontWeight: selectedSubjectId === key ? 800 : 600, fontSize: '13px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer'
                      }}
                      onClick={() => handleSelectLesson(key, 0)}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{s.icon}</span>
                        <span>{s.title}</span>
                      </span>
                      <small style={{ fontSize: '11px', color: 'var(--muted)' }}>{s.lessons?.length || 0} درس</small>
                    </button>
                  );
                })}
            </div>

            <h4 style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '8px' }}>دروس مادة {currentSubject.title}:</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {currentSubject.lessons?.map((les, idx) => (
                <button
                  key={les.id}
                  style={{
                    textAlign: 'right', padding: '8px 10px', borderRadius: '8px',
                    border: selectedLessonIndex === idx ? '1.5px solid #2563eb' : '1px solid var(--line)',
                    background: selectedLessonIndex === idx ? '#eff6ff' : '#fafafa',
                    fontSize: '12px', fontWeight: selectedLessonIndex === idx ? 700 : 500, cursor: 'pointer'
                  }}
                  onClick={() => handleSelectLesson(selectedSubjectId, idx)}
                >
                  {les.letter ? `[${les.letter}] ` : ''}{les.title}
                </button>
              ))}
            </div>
          </div>

          {/* Lesson Editor Form */}
          <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '26px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--line)' }}>
              <div>
                <span className="tag-badge info" style={{ marginBottom: '6px' }}>محرر الدروس المباشر</span>
                <h3 style={{ fontSize: '18px', color: 'var(--navy)' }}>
                  تعديل: {currentLesson?.title} ({currentSubject.title})
                </h3>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  style={{ background: '#f1f5f9', color: '#475569', padding: '8px 14px', borderRadius: 'var(--radius-md)', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                  onClick={() => triggerToast('تم حفظ مسودة غير منشورة للدرس')}
                >
                  حفظ كمسودة 📝
                </button>
                <button
                  className="btn-accent"
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                  onClick={handleSaveLesson}
                >
                  نشر التعديل فوراً 🚀
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveLesson}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '13.5px', marginBottom: '6px' }}>
                    عنوان الدرس والمهارة
                  </label>
                  <input
                    type="text"
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--line)', borderRadius: '8px', fontSize: '14px' }}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '13.5px', marginBottom: '6px' }}>
                    مدة الحصة المسجلة
                  </label>
                  <input
                    type="text"
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--line)', borderRadius: '8px', fontSize: '14px' }}
                    value={editDuration}
                    onChange={(e) => setEditDuration(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '13.5px', marginBottom: '6px' }}>
                  الهدف التربوي ونواتج التعلم المعتمدة
                </label>
                <textarea
                  rows={3}
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--line)', borderRadius: '8px', fontSize: '13.5px', lineHeight: 1.5 }}
                  value={editObjective}
                  onChange={(e) => setEditObjective(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '13.5px', marginBottom: '6px' }}>
                  سؤال اختبار الإتقان السريع للطفل
                </label>
                <input
                  type="text"
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--line)', borderRadius: '8px', fontSize: '14px' }}
                  value={editQuestion}
                  onChange={(e) => setEditQuestion(e.target.value)}
                />
              </div>

              {/* Syllable Builder & Word info */}
              {currentLesson?.interactiveBuilder && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '14px', color: 'var(--navy)', marginBottom: '8px' }}>
                    🧩 لغز تركيب الكلمة التفاعلي للطفل:
                  </h4>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                    <span>الكلمة المستهدفة: <strong>{currentLesson.interactiveBuilder.targetWord}</strong></span>
                    <span>المقاطع الصوتية المتاحة: <strong>{currentLesson.interactiveBuilder.syllables?.join(' - ')}</strong></span>
                  </div>
                </div>
              )}

              {/* PDF Worksheet info */}
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: '#166534', fontSize: '13px', display: 'block' }}>ملف ورقة العمل المرتبطة:</strong>
                  <span style={{ fontSize: '12.5px', color: '#15803d' }}>{currentLesson?.pdfTitle || 'ورقة تدريب معتمدة'}</span>
                </div>
                <button
                  type="button"
                  style={{ background: '#166534', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                  onClick={() => triggerToast('تم فتح نافذة استبدال ملف الـ PDF')}
                >
                  رفع نسخة محدثة (PDF) 📤
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: RBAC & USERS */}
      {activeAdminTab === 'rbac' && (
        <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '26px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '18px', color: 'var(--navy)' }}>فريق العمل وصلاحيات الوصول (Role-Based Access Control)</h3>
              <p style={{ fontSize: '13px', color: 'var(--muted)' }}>تحديد مهام المشرفين والمعلمين ومسؤولي الدعم مع حوكمة أمان البيانات</p>
            </div>
            <button
              className="btn-accent"
              style={{ padding: '8px 16px', fontSize: '13px' }}
              onClick={() => triggerToast('فتح نافذة دعوة عضو فريق جديد')}
            >
              + إضافة عضو أو معلم جديد
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '13.5px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--line)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>الاسم والبريد</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>الدور والمسمى</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>الحالة</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>تعديل المناهج (CMS)</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>الرقابة والتدقيق</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>المالية والاشتراكات</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {staffMembers.map(member => (
                <tr key={member.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <strong style={{ display: 'block', color: 'var(--navy)' }}>{member.name}</strong>
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{member.email}</span>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 600 }}>{member.role}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                      {member.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>{member.canEditCMS ? '✅ مسموح' : '❌ محجوب'}</td>
                  <td style={{ padding: '14px 16px' }}>{member.canAudit ? '✅ مسموح' : '❌ محجوب'}</td>
                  <td style={{ padding: '14px 16px' }}>{member.canBilling ? '✅ مسموح' : '❌ محجوب'}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <button
                      style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => triggerToast(`تعديل صلاحيات ${member.name}`)}
                    >
                      تعديل
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: AUDIT TRAIL & QUALITY */}
      {activeAdminTab === 'audit' && (
        <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '26px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '18px', color: 'var(--navy)' }}>سجل التدقيق التاريخي والرقابة التربوية (Audit Trail)</h3>
              <p style={{ fontSize: '13px', color: 'var(--muted)' }}>توثيق زمني غير قابل للحذف لجميع العمليات وحركات التعديل بالمنصة</p>
            </div>
            <button
              style={{ background: '#0284c7', color: 'white', padding: '8px 16px', borderRadius: 'var(--radius-md)', border: 'none', fontWeight: 700, fontSize: '12.5px', cursor: 'pointer' }}
              onClick={() => triggerToast('تم تصدير سجل التدقيق إلى ملف Excel معتمد')}
            >
              تصدير السجل الرسمي 📊
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {auditLogs.map((log, idx) => (
              <div
                key={idx}
                style={{
                  padding: '14px 18px', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)',
                  background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <strong style={{ color: 'var(--navy)', fontSize: '14px' }}>{log.user}</strong>
                    <span className="tag-badge info" style={{ fontSize: '10.5px' }}>{log.badge}</span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#334155', margin: 0 }}>{log.action}</p>
                </div>
                <div style={{ textAlign: 'left', fontSize: '12px', color: 'var(--muted)' }}>
                  <div>{log.time}</div>
                  <small style={{ fontFamily: 'monospace' }}>IP: {log.ip}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: SUBSCRIPTIONS & EXPAT DISTRIBUTION */}
      {activeAdminTab === 'subscriptions' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '17px', color: 'var(--navy)', marginBottom: '14px' }}>
              🌍 التوزيع الجغرافي لأسر المغتربين النشطة
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { country: '🇸🇦 المملكة العربية السعودية', count: '275 طالباً', percent: '65.5%', color: '#16a34a' },
                { country: '🇦🇪 دولة الإمارات العربية المتحدة', count: '78 طالباً', percent: '18.5%', color: '#2563eb' },
                { country: '🇰🇼 دولة الكويت', count: '38 طالباً', percent: '9.0%', color: '#ea580c' },
                { country: '🇬🇧 المملكة المتحدة وأوروبا', count: '20 طالباً', percent: '4.8%', color: '#7c3aed' },
                { country: '🇺🇸 الولايات المتحدة الأمريكية', count: '9 طلاب', percent: '2.2%', color: '#dc2626' }
              ].map((item, i) => (
                <div key={i} style={{ padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px', fontWeight: 700 }}>
                    <span>{item.country}</span>
                    <span>{item.count} ({item.percent})</span>
                  </div>
                  <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: item.percent, height: '100%', background: item.color }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '17px', color: 'var(--navy)', marginBottom: '14px' }}>
              💳 مؤشرات الاشتراكات والإيرادات الشهرية
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '14px', background: '#ecfdf5', borderRadius: '10px', border: '1px solid #86efac' }}>
                <span style={{ fontSize: '12px', color: '#166534', fontWeight: 600 }}>إجمالي الإيراد الشهري المحقق:</span>
                <h4 style={{ fontSize: '24px', color: '#166534', margin: '4px 0 0' }}>124,500 ر.س / شهرياً</h4>
              </div>
              <div style={{ padding: '14px', background: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                <span style={{ fontSize: '12px', color: '#1e40af', fontWeight: 600 }}>الباقة الأكثر طلباً:</span>
                <h4 style={{ fontSize: '18px', color: '#1e40af', margin: '4px 0 0' }}>باقة التأسيس الحي (290 ر.س/شهر) — 74% من المشتركين</h4>
              </div>
              <div style={{ padding: '14px', background: '#fefce8', borderRadius: '10px', border: '1px solid #fde047' }}>
                <span style={{ fontSize: '12px', color: '#854d0e', fontWeight: 600 }}>نسبة تجديد الاشتراكات التلقائي:</span>
                <h4 style={{ fontSize: '18px', color: '#854d0e', margin: '4px 0 0' }}>94.2% (معدل استبقاء ممتاز لأسر المغتربين)</h4>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
