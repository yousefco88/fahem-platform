import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { saveAttachment } from '../utils/attachmentStore';
import { useApp } from '../context/AppContext';
import { DAY_NAMES, SLOT_TYPES } from '../data/scheduleData';
import BookingsPanel from './admin/BookingsPanel';
import FamiliesPanel from './admin/FamiliesPanel';
import SiteSettingsPanel from './admin/SiteSettingsPanel';
import { GradesPanel, SubjectsPanel, LessonsPanel, LessonEditor } from './admin/curriculum';
import './admin/curriculum/CurriculumAdmin.css';

export default function AdminDashboard() {
  const {
    curriculumData,
    setCurriculumData,
    curriculumDrafts,
    setCurriculumDrafts,
    lessonFiles,
    setLessonFiles,
    lessonVideos,
    setLessonVideos,
    setShowLiveModal,
    triggerToast,
    scheduleData,
    setScheduleData,
    saveScheduleToCloud
  } = useApp();

  const [activeAdminTab, setActiveAdminTab] = useState('cms');
  const [syncingSchedule, setSyncingSchedule] = useState(false);

  // ===== KPI ديناميكي من Supabase =====
  const [kpiStats, setKpiStats] = useState({ families: 0, children: 0, bookings: 0, newBookings: 0 });
  const [kpiLoading, setKpiLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { setKpiLoading(false); return; }
    Promise.all([
      supabase.from('parent_profiles').select('id', { count: 'exact', head: true }),
      supabase.from('children').select('id', { count: 'exact', head: true }),
      supabase.from('bookings').select('id', { count: 'exact', head: true }),
      supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'new')
    ]).then(([parents, children, bookings, newBookings]) => {
      setKpiStats({
        families: parents.count || 0,
        children: children.count || 0,
        bookings: bookings.count || 0,
        newBookings: newBookings.count || 0
      });
      setKpiLoading(false);
    }).catch(() => setKpiLoading(false));
  }, []);

  // عدد المواد الفعلي
  const subjectsCount = Object.keys(curriculumData).filter(k => k !== 'expatExamCalendar').length;

  // ===== محرر الجدول الأسبوعي =====
  const updateSlot = (id, field, value) =>
    setScheduleData(prev => prev.map(s => s.id === id ? { ...s, [field]: field === 'day' ? Number(value) : value } : s));
  const removeSlot = (id) => setScheduleData(prev => prev.filter(s => s.id !== id));
  const addSlot = () => setScheduleData(prev => ([...prev, {
    id: `slot_${Date.now()}`, day: 0, time: '16:00',
    subjectId: Object.keys(curriculumData)[0] || 'arabic', lessonRef: 'next', type: 'lesson'
  }]));
  const syncSchedule = async () => {
    setSyncingSchedule(true);
    const res = await saveScheduleToCloud(scheduleData);
    setSyncingSchedule(false);
    triggerToast(res.ok
      ? 'تم حفظ الجدول على Supabase ✓'
      : `الحفظ المحلي سارٍ، لكن تعذر الحفظ السحابي: ${res.reason}`);
  };
  // المعلمون المتاحون لإسناد الحصص (الإدارة فقط تقرأ profiles)
  const [teachers, setTeachers] = useState([]);
  useEffect(() => {
    if (!supabase) return;
    supabase.from('profiles').select('id, full_name').eq('role', 'teacher')
      .then(({ data }) => setTeachers(data || []));
  }, []);
  const [selectedSubjectId, setSelectedSubjectId] = useState('arabic');
  const [selectedLessonId, setSelectedLessonId] = useState(() => curriculumData.arabic.lessons?.find(lesson => lesson.id === 'baa')?.id || curriculumData.arabic.lessons?.[0]?.id || '');

  // Editable lesson state
  const currentSubject = curriculumData[selectedSubjectId] || curriculumData.arabic;
  const selectedLessonIndex = currentSubject.lessons?.findIndex(lesson => lesson.id === selectedLessonId) ?? -1;
  const currentLesson = currentSubject.lessons?.[selectedLessonIndex] || currentSubject.lessons?.[0];

  const [editTitle, setEditTitle] = useState(currentLesson?.title || '');
  const [editObjective, setEditObjective] = useState(currentLesson?.objective || '');
  const [editDuration, setEditDuration] = useState(currentLesson?.duration || '');
  const [editQuestion, setEditQuestion] = useState(currentLesson?.question || '');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  React.useEffect(() => {
    setEditTitle(currentLesson?.title || '');
    setEditObjective(currentLesson?.objective || '');
    setEditDuration(currentLesson?.duration || '');
    setEditQuestion(currentLesson?.question || '');
  }, [currentLesson?.id]);

  // Keep editor synced when subject/lesson changes
  const handleSelectLesson = (subjId, index) => {
    setSelectedSubjectId(subjId);
    const selectedLesson = curriculumData[subjId]?.lessons?.[index];
    setSelectedLessonId(selectedLesson?.id || '');
    const lesson = curriculumData[subjId]?.lessons?.[index];
    if (lesson) {
      setEditTitle(lesson.title);
      setEditObjective(lesson.objective);
      setEditDuration(lesson.duration);
      setEditQuestion(lesson.question || '');
    }
  };

  // Save lesson modifications
  const buildEditedLesson = (lesson = currentLesson) => ({
    ...lesson,
    title: editTitle.trim(),
    objective: editObjective.trim(),
    duration: editDuration.trim(),
    question: editQuestion.trim()
  });

  const updateLessonCollection = (collection, lessonId, updatedLesson) => ({
    ...collection,
    [selectedSubjectId]: {
      ...collection[selectedSubjectId],
      lessons: collection[selectedSubjectId].lessons.map(lesson => lesson.id === lessonId ? updatedLesson : lesson)
    }
  });

  const handleSaveLesson = (e) => {
    e.preventDefault();
    if (!currentLesson || !editTitle.trim() || !editObjective.trim() || !editDuration.trim()) return;
    const updatedLesson = buildEditedLesson();
    if (curriculumDrafts[selectedSubjectId]?.[currentLesson.id]) {
      setCurriculumDrafts(prev => updateLessonCollection(prev, currentLesson.id, updatedLesson));
      triggerToast(`تم تحديث مسودة «${editTitle}» وحفظها على هذا المتصفح.`);
      return;
    }
    setCurriculumData(prev => updateLessonCollection(prev, currentLesson.id, updatedLesson));
    triggerToast(`تم حفظ «${editTitle}» محليًا. لم يُنشر إلى خادم مشترك.`);
  };

  const handleSaveDraft = () => {
    if (!currentLesson || !editTitle.trim() || !editObjective.trim() || !editDuration.trim()) {
      triggerToast('أدخل عنوان الدرس والهدف والمدة قبل حفظ المسودة.');
      return;
    }
    if (currentLesson.id.startsWith('draft_')) {
      setCurriculumDrafts(prev => ({
        ...prev,
        [selectedSubjectId]: { ...(prev[selectedSubjectId] || {}), [currentLesson.id]: buildEditedLesson() }
      }));
    } else {
      setCurriculumDrafts(prev => updateLessonCollection(prev, currentLesson.id, buildEditedLesson()));
    }
    triggerToast(`حُفظت مسودة «${editTitle}» على هذا المتصفح فقط.`);
  };

  const handlePublishDraft = () => {
    const draft = curriculumDrafts[selectedSubjectId]?.[currentLesson?.id];
    if (!draft) {
      triggerToast('لا توجد مسودة لهذا الدرس.');
      return;
    }
    if (currentLesson.id.startsWith('draft_')) {
      setCurriculumData(prev => ({
        ...prev,
        [selectedSubjectId]: { ...prev[selectedSubjectId], lessons: [...prev[selectedSubjectId].lessons, draft] }
      }));
    } else {
      setCurriculumData(prev => updateLessonCollection(prev, currentLesson.id, draft));
    }
    setCurriculumDrafts(prev => {
      const subjectDrafts = { ...(prev[selectedSubjectId] || {}) };
      delete subjectDrafts[currentLesson.id];
      return { ...prev, [selectedSubjectId]: subjectDrafts };
    });
    triggerToast('نُقلت المسودة إلى مكتبة المحتوى المحلية. النشر للطلاب يتطلب خادمًا مشتركًا.');
  };

  const handleCreateLesson = () => {
    const lessonId = `draft_${Date.now()}`;
    const newLesson = {
      id: lessonId,
      title: 'درس جديد',
      objective: 'اكتب الهدف التعليمي لهذا الدرس.',
      duration: '10:00',
      question: '',
      pdfTitle: 'لا يوجد ملف مرفق',
      videoChapters: [],
      options: [],
      quizType: 'choice'
    };
    setCurriculumDrafts(prev => ({
      ...prev,
      [selectedSubjectId]: { ...(prev[selectedSubjectId] || {}), [lessonId]: newLesson }
    }));
    setSelectedLessonId(lessonId);
    setEditTitle(newLesson.title);
    setEditObjective(newLesson.objective);
    setEditDuration(newLesson.duration);
    setEditQuestion(newLesson.question);
    triggerToast('أُنشئت مسودة درس جديدة. عدّل بياناتها ثم انقلها إلى المكتبة المحلية.');
  };

  const handlePdfSelected = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !currentLesson) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      triggerToast('اختر ملف PDF فقط.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      triggerToast('حجم الملف أكبر من 15 ميغابايت؛ اختر ملفًا أصغر.');
      return;
    }
    setUploadingFile(true);
    const savePdf = async () => {
      const fileId = `${selectedSubjectId}:${currentLesson.id}`;
      try {
        const metadata = await saveAttachment(`pdf:${fileId}`, file);
        setLessonFiles(prev => ({ ...prev, [fileId]: { ...metadata, storage: 'indexeddb' } }));
        const updatePdfTitle = lesson => ({ ...lesson, pdfTitle: file.name });
        if (curriculumDrafts[selectedSubjectId]?.[currentLesson.id]) {
          setCurriculumDrafts(prev => updateLessonCollection(prev, currentLesson.id, updatePdfTitle(currentLesson)));
        } else {
          setCurriculumData(prev => updateLessonCollection(prev, currentLesson.id, updatePdfTitle(currentLesson)));
        }
        triggerToast(`أُرفق ${file.name} بهذا المتصفح وهذا الدرس.`);
      } catch (error) {
        triggerToast(error.message || 'تعذر حفظ ملف PDF.');
      } finally {
        setUploadingFile(false);
      }
    };
    savePdf();
  };

  const handleVideoSelected = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !currentLesson) return;
    if (!file.type.startsWith('video/')) {
      triggerToast('اختر ملف فيديو بصيغة مدعومة.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      triggerToast('حجم الفيديو أكبر من 50 ميغابايت؛ اختر مقطعًا أصغر.');
      return;
    }
    setUploadingVideo(true);
    const saveVideo = async () => {
      const videoId = `${selectedSubjectId}:${currentLesson.id}`;
      try {
        const metadata = await saveAttachment(`video:${videoId}`, file);
        setLessonVideos(prev => ({ ...prev, [videoId]: { ...metadata, storage: 'indexeddb' } }));
        triggerToast(`أُضيف مقطع ${file.name} إلى هذا الدرس على هذا المتصفح.`);
      } catch (error) {
        triggerToast(error.message || 'تعذر حفظ الفيديو.');
      } finally {
        setUploadingVideo(false);
      }
    };
    saveVideo();
  };

  // Staff & RBAC — بيانات حقيقية من Supabase user_roles
  const [staffMembers, setStaffMembers] = useState([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMember, setNewMember] = useState({ email: '', role: 'teacher', name: '', addType: 'invite' });
  const [addingMember, setAddingMember] = useState(false);
  const [pendingInvites, setPendingInvites] = useState([]);

  // جلب الدعوات المعلقة
  useEffect(() => {
    if (!supabase) return;
    supabase
      .from('staff_invites')
      .select('*')
      .eq('status', 'pending')
      .then(({ data }) => {
        if (data) setPendingInvites(data);
      });
  }, []);

  // دالة إضافة عضو جديد
  const handleAddMember = async () => {
    if (!newMember.email || !newMember.name) {
      triggerToast('يرجى إدخال الاسم والبريد الإلكتروني');
      return;
    }
    if (!supabase) {
      triggerToast('Supabase غير متصل');
      return;
    }
    
    setAddingMember(true);
    try {
      if (newMember.addType === 'invite') {
        // === إرسال دعوة جديدة ===
        const { data, error } = await supabase
          .from('staff_invites')
          .insert({
            email: newMember.email,
            name: newMember.name,
            role: newMember.role
          })
          .select()
          .single();

        if (error) throw error;

        setPendingInvites(prev => [...prev, data]);
        triggerToast(`✅ تم إرسال دعوة لـ ${newMember.name}`);
      } else {
        // === إضافة مستخدم موجود مباشرة ===
        // البحث عن المستخدم بالبريد
        const { data: users, error: searchError } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .eq('email', newMember.email)
          .single();

        if (searchError || !users) {
          triggerToast('❌ لم يتم العثور على مستخدم بهذا البريد');
          setAddingMember(false);
          return;
        }

        // إضافة الدور
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: users.id,
            role: newMember.role
          });

        if (roleError) throw roleError;

        // إضافة للقائمة المحلية
        setStaffMembers(prev => [...prev, {
          id: users.id,
          name: users.full_name || newMember.name,
          role: newMember.role === 'admin' ? 'مدير النظام' : newMember.role === 'teacher' ? 'معلم' : 'موظف',
          email: newMember.email,
          status: 'نشط',
          canEditCMS: newMember.role === 'admin',
          canAudit: ['admin', 'staff'].includes(newMember.role),
          canBilling: newMember.role === 'admin'
        }]);

        triggerToast(`✅ تمت إضافة ${newMember.name} بنجاح`);
      }

      setShowAddMemberModal(false);
      setNewMember({ email: '', role: 'teacher', name: '', addType: 'invite' });
    } catch (err) {
      console.error('Error adding member:', err);
      triggerToast(`❌ خطأ: ${err.message}`);
    } finally {
      setAddingMember(false);
    }
  };

  useEffect(() => {
    if (!supabase) { setStaffLoading(false); return; }
    supabase
      .from('user_roles')
      .select('id, user_id, role, created_at')
      .then(({ data, error }) => {
        if (!error && data) {
          setStaffMembers(data.map(r => ({
            id: r.id,
            name: r.role === 'admin' ? 'مدير' : r.role === 'teacher' ? 'معلم' : r.role,
            role: r.role === 'admin' ? 'مدير النظام' : r.role === 'teacher' ? 'معلم' : r.role,
            email: `${r.user_id.slice(0, 8)}...`,
            status: 'نشط',
            canEditCMS: r.role === 'admin',
            canAudit: ['admin', 'staff'].includes(r.role),
            canBilling: r.role === 'admin'
          })));
        }
        setStaffLoading(false);
      });
  }, []);

  // Audit Log items
  // لا يوجد نظام تدقيق متصل؛ لا نعرض سجلاً مختلقاً
  const auditLogs = [];

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
              <h1 style={{ fontSize: '22px', fontWeight: 800 }}>لوحة إدارة تجريبية محلية</h1>
              <span style={{ background: '#0284c7', color: 'white', fontSize: '11px', padding: '3px 10px', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
                ليست صلاحيات فعلية
              </span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '13.5px', marginTop: '4px' }}>
              إدارة محتوى محلي • نماذج واجهة للصلاحيات والتدقيق • لا يوجد مستخدمون أو خادم متصل
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            style={{
              background: '#38bdf8', color: '#0f172a', padding: '10px 18px',
              borderRadius: 'var(--radius-md)', fontWeight: 800, fontSize: '13px', border: 'none', cursor: 'pointer'
            }}
            onClick={() => triggerToast('ميزة النسخ الاحتياطي غير متصلة بقاعدة بيانات بعد.')}
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
            👁️ معاينة الفصل التجريبي
          </button>
        </div>
      </section>

      {/* Admin KPI Ribbon — بيانات حقيقية من Supabase */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px', marginBottom: '26px'
      }}>
        <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '18px', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>الأسر المسجلة</span>
          <h3 style={{ fontSize: '26px', color: 'var(--navy)' }}>{kpiLoading ? '...' : kpiStats.families}</h3>
          <small style={{ color: 'var(--green)', fontWeight: 700, fontSize: '11.5px' }}>{kpiStats.children} طفل مسجّل</small>
        </div>

        <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '18px', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>حجوزات الحصص التجريبية</span>
          <h3 style={{ fontSize: '26px', color: 'var(--blue)' }}>{kpiLoading ? '...' : kpiStats.bookings}</h3>
          <small style={{ color: kpiStats.newBookings > 0 ? '#dc2626' : 'var(--blue)', fontWeight: 700, fontSize: '11.5px' }}>
            {kpiStats.newBookings > 0 ? `🔴 ${kpiStats.newBookings} جديد` : 'لا يوجد جديد'}
          </small>
        </div>

        <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '18px', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>المواد والمسارات النشطة</span>
          <h3 style={{ fontSize: '26px', color: '#7c3aed' }}>{subjectsCount} مادة</h3>
          <small style={{ color: '#7c3aed', fontWeight: 700, fontSize: '11.5px' }}>شاملة Connect Plus والماث</small>
        </div>

        <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '18px', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>فريق العمل</span>
          <h3 style={{ fontSize: '26px', color: 'var(--navy)' }}>{staffLoading ? '...' : staffMembers.length}</h3>
          <small style={{ color: 'var(--muted)', fontWeight: 700, fontSize: '11.5px' }}>
            {staffMembers.length === 0 ? 'لا يوجد أعضاء بعد' : 'من user_roles'}
          </small>
        </div>
      </div>

      <section style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '14px', padding: '14px 18px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <span style={{ color: '#1e3a8a', fontSize: '13px' }}>
          {supabase ? 'متصل بـ Supabase — البيانات أعلاه حقيقية من قاعدة البيانات.' : 'غير متصل بـ Supabase — البيانات محلية فقط.'}
        </span>
      </section>

      {/* Admin Tabs */}
      <div style={{
        display: 'flex', gap: '8px', borderBottom: '2px solid var(--line)',
        marginBottom: '24px', overflowX: 'auto', paddingBottom: '2px'
      }}>
        {[
          { id: 'settings', label: '⚙️ إعدادات الموقع', icon: '⚙️' },
          { id: 'curriculum', label: '📚 إدارة المناهج (Supabase)', icon: '📚' },
          { id: 'cms', label: '📖 محرر المناهج المحلي (قديم)', icon: '📖' },
          { id: 'bookings', label: '📋 حجوزات الحصص التجريبية', icon: '📋' },
          { id: 'families', label: '👨‍👩‍👧‍👦 حسابات الأسر', icon: '👨‍👩‍👧‍👦' },
          { id: 'schedule', label: '🗓️ الجدول الأسبوعي', icon: '🗓️' },
          { id: 'rbac', label: '👥 المستخدمين والصلاحيات (RBAC)', icon: '👥' },
          { id: 'audit', label: '🛡️ سجل التدقيق والرقابة (Audit Trail)', icon: '🛡️' },
          { id: 'subscriptions', label: '💳 الاشتراكات وتوزيع المغتربين', icon: '💳' },
          { id: 'analytics', label: '📊 لوحة التحليلات', icon: '📊', link: '/analytics' }
        ].map(tab => (
          tab.link ? (
            <a
              key={tab.id}
              href={tab.link}
              style={{
                padding: '12px 20px', borderRadius: '12px 12px 0 0', fontWeight: 800, fontSize: '13.5px',
                border: 'none', cursor: 'pointer', transition: 'all 0.2s', textDecoration: 'none',
                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                color: 'white', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              📊 لوحة التحليلات ↗
            </a>
          ) : (
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
          )
        ))}
      </div>

      {/* TAB: SITE SETTINGS */}
      {activeAdminTab === 'settings' && <SiteSettingsPanel />}

      {/* TAB: CURRICULUM CMS (Supabase) */}
      {activeAdminTab === 'curriculum' && (
        <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '26px', boxShadow: 'var(--shadow-sm)' }}>
          <Routes>
            <Route index element={<GradesPanel />} />
            <Route path="grades" element={<GradesPanel />} />
            <Route path="subjects" element={<SubjectsPanel />} />
            <Route path="lessons" element={<LessonsPanel />} />
            <Route path="lesson/:id" element={<LessonEditor />} />
          </Routes>
        </div>
      )}

      {/* TAB 1: CURRICULUM CMS (محلي — قديم) */}
      {activeAdminTab === 'cms' && (
        <>
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '12px', padding: '12px 18px', marginBottom: '18px', fontSize: '13px', color: '#92400e', fontWeight: 700 }}>
          ⚠️ هذا محرر <strong>محلي</strong> يعمل على متصفحك فقط (localStorage) ولا يُنشر للطلاب.
          المصدر المعتمد للمناهج المنشورة هو تبويب «📚 إدارة المناهج (Supabase)». استخدم هذا المحرر للتجربة والمعاينة فقط.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
          {/* Subject & Lesson Navigator */}
          <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '16px', color: 'var(--navy)', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>قائمة المواد والدروس</span>
              <button
                style={{ background: 'none', color: 'var(--blue)', fontSize: '12px', fontWeight: 800, border: 'none', cursor: 'pointer' }}
                onClick={handleCreateLesson}
              >
                + درس جديد
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
              {[
                ...(currentSubject.lessons || []).map(lesson => ({ ...lesson, status: 'published' })),
                ...Object.values(curriculumDrafts[selectedSubjectId] || {}).map(lesson => ({ ...lesson, status: 'draft' }))
              ].map((les, idx) => (
                <button
                  key={les.id}
                  style={{
                    textAlign: 'right', padding: '8px 10px', borderRadius: '8px',
                    border: selectedLessonId === les.id ? '1.5px solid #2563eb' : '1px solid var(--line)',
                    background: selectedLessonId === les.id ? '#eff6ff' : '#fafafa',
                    fontSize: '12px', fontWeight: selectedLessonId === les.id ? 700 : 500, cursor: 'pointer'
                  }}
                  onClick={() => {
                    setSelectedLessonId(les.id);
                    setEditTitle(les.title || '');
                    setEditObjective(les.objective || '');
                    setEditDuration(les.duration || '');
                    setEditQuestion(les.question || '');
                  }}
                >
                  {les.status === 'draft' ? '📝 ' : ''}{les.letter ? `[${les.letter}] ` : ''}{les.title}
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
                  onClick={handleSaveDraft}
                >
                  حفظ كمسودة محلية 📝
                </button>
                <button
                  className="btn-accent"
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                  onClick={curriculumDrafts[selectedSubjectId]?.[currentLesson?.id] ? handlePublishDraft : handleSaveLesson}
                >
                  {curriculumDrafts[selectedSubjectId]?.[currentLesson?.id] ? 'إضافة إلى المكتبة المحلية' : 'حفظ التعديل محليًا'}
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

              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '14px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <strong style={{ color: '#1e40af', fontSize: '13px', display: 'block' }}>فيديو الدرس المحفوظ محليًا</strong>
                  <span style={{ fontSize: '12.5px', color: '#1d4ed8' }}>{lessonVideos[`${selectedSubjectId}:${currentLesson?.id}`]?.name || 'لا يوجد فيديو مرفق'}</span>
                </div>
                <input id="lesson-video-file" type="file" accept="video/*" onChange={handleVideoSelected} style={{ display: 'none' }} />
                <label htmlFor="lesson-video-file" style={{ background: '#1d4ed8', color: 'white', padding: '7px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                  {uploadingVideo ? 'جاري القراءة…' : 'اختيار فيديو قصير'}
                </label>
              </div>

              {/* PDF Worksheet info */}
              {(() => {
                const attachedFile = lessonFiles[`${selectedSubjectId}:${currentLesson?.id}`];
                return (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: '#166534', fontSize: '13px', display: 'block' }}>ملف ورقة العمل المرتبط بهذا المتصفح:</strong>
                  <span style={{ fontSize: '12.5px', color: '#15803d' }}>{attachedFile?.name || currentLesson?.pdfTitle || 'لا يوجد ملف PDF'}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input id="lesson-pdf-file" type="file" accept="application/pdf,.pdf" onChange={handlePdfSelected} style={{ display: 'none' }} />
                  <label htmlFor="lesson-pdf-file" style={{ background: '#166534', color: 'white', padding: '7px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                    {uploadingFile ? 'جاري القراءة…' : 'اختيار PDF'}
                  </label>
                  {attachedFile && <a href={attachedFile.dataUrl} target="_blank" rel="noreferrer" style={{ color: '#166534', fontSize: '12px' }}>معاينة</a>}
                </div>
              </div>
                );
              })()}
            </form>
          </div>
        </div>
        </>
      )}

      {/* TAB: TRIAL BOOKINGS (real data) */}
      {activeAdminTab === 'bookings' && (
        <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '26px', boxShadow: 'var(--shadow-sm)' }}>
          <BookingsPanel />
        </div>
      )}

      {/* TAB: FAMILIES (real data) */}
      {activeAdminTab === 'families' && (
        <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '26px', boxShadow: 'var(--shadow-sm)' }}>
          <FamiliesPanel />
        </div>
      )}

      {/* TAB: WEEKLY SCHEDULE */}
      {activeAdminTab === 'schedule' && (
        <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '26px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '18px', color: 'var(--navy)' }}>🗓️ الجدول الأسبوعي لمساحة الطفل</h3>
              <p style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '4px' }}>
                خيار «تلقائي» يعرض للطفل أول درس غير مُتقن في المادة حسب الترتيب. يُحفظ محلياً فوراً، وزر الحفظ السحابي يرفعه إلى Supabase.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                style={{ background: '#eef2ff', color: '#4338ca', padding: '10px 18px', borderRadius: 'var(--radius-md)', fontWeight: 800, fontSize: '13px', border: '1px solid #c7d2fe', cursor: 'pointer' }}
                onClick={addSlot}
              >+ إضافة خانة</button>
              <button
                style={{ background: 'var(--blue)', color: 'white', padding: '10px 18px', borderRadius: 'var(--radius-md)', fontWeight: 800, fontSize: '13px', border: 'none', cursor: syncingSchedule ? 'wait' : 'pointer', opacity: syncingSchedule ? 0.6 : 1 }}
                disabled={syncingSchedule}
                onClick={syncSchedule}
              >{syncingSchedule ? '... جارٍ الحفظ' : '☁️ حفظ على Supabase'}</button>
            </div>
          </div>

          {scheduleData.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--muted)', border: '2px dashed var(--line)', borderRadius: '14px', marginTop: '14px' }}>
              لا توجد خانات بعد — أضف أول خانة لبناء الجدول.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', marginTop: '14px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', color: '#475569' }}>
                    {['اليوم', 'الوقت', 'المادة', 'الدرس', 'النوع', 'المعلم', ''].map(h => (
                      <th key={h} style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid var(--line)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...scheduleData].sort((a, b) => a.day - b.day || String(a.time).localeCompare(String(b.time))).map(slot => {
                    const subjLessons = curriculumData[slot.subjectId]?.lessons || [];
                    return (
                      <tr key={slot.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px' }}>
                          <select value={slot.day} onChange={e => updateSlot(slot.id, 'day', e.target.value)} style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                            {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '8px' }}>
                          <input type="time" value={slot.time} onChange={e => updateSlot(slot.id, 'time', e.target.value)} style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--line)' }} />
                        </td>
                        <td style={{ padding: '8px' }}>
                          <select value={slot.subjectId} onChange={e => { updateSlot(slot.id, 'subjectId', e.target.value); updateSlot(slot.id, 'lessonRef', 'next'); }} style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--line)', maxWidth: '170px' }}>
                            {Object.entries(curriculumData).map(([id, s]) => <option key={id} value={id}>{s.icon} {s.title}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '8px' }}>
                          <select value={slot.lessonRef || 'next'} onChange={e => updateSlot(slot.id, 'lessonRef', e.target.value)} style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--line)', maxWidth: '200px' }}>
                            <option value="next">تلقائي (أول درس غير مُتقن)</option>
                            {subjLessons.map(l => <option key={l.id} value={l.id}>{l.order}. {l.title}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '8px' }}>
                          <select value={slot.type || 'lesson'} onChange={e => updateSlot(slot.id, 'type', e.target.value)} style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                            {Object.entries(SLOT_TYPES).map(([id, t]) => <option key={id} value={id}>{t.icon} {t.label}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '8px' }}>
                          <select aria-label="المعلم" value={slot.teacherId || ''} onChange={e => updateSlot(slot.id, 'teacherId', e.target.value || null)} style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--line)', maxWidth: '150px' }}>
                            <option value="">— بدون —</option>
                            {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name || t.id.slice(0, 8)}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '8px' }}>
                          <button onClick={() => removeSlot(slot.id)} title="حذف الخانة" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontWeight: 800 }}>🗑</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
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
              onClick={() => setShowAddMemberModal(true)}
            >
              + إضافة عضو أو معلم جديد
            </button>
          </div>

          {staffLoading && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 700 }}>
              جارٍ تحميل فريق العمل من Supabase…
            </div>
          )}

          {!staffLoading && staffMembers.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', background: '#f8fafc', borderRadius: '14px', border: '1px dashed var(--line)' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>👥</div>
              <div style={{ fontWeight: 800, color: '#334155' }}>لا يوجد أعضاء فريق بعد</div>
              <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '4px' }}>
                الصلاحيات تُدار عبر جدول user_roles في Supabase.<br/>
                أضف صفوفاً هناك لتظهر هنا تلقائياً.
              </div>
            </div>
          )}

          {!staffLoading && staffMembers.length > 0 && (
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
          )}
        </div>
      )}

      {/* Modal: إضافة عضو جديد */}
      {showAddMemberModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }} onClick={() => setShowAddMemberModal(false)}>
          <div style={{
            background: 'white', borderRadius: '16px', padding: '28px', width: '90%', maxWidth: '420px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', color: 'var(--navy)', marginBottom: '20px', textAlign: 'center' }}>
              👤 إضافة عضو أو معلم جديد
            </h3>

            {/* نوع الإضافة */}
            <div style={{ marginBottom: '20px', display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setNewMember(prev => ({ ...prev, addType: 'invite' }))}
                style={{
                  flex: 1, padding: '10px', border: newMember.addType === 'invite' ? '2px solid #f59e0b' : '1px solid #d1d5db',
                  borderRadius: '8px', background: newMember.addType === 'invite' ? '#fef3c7' : 'white',
                  fontWeight: 600, fontSize: '13px', cursor: 'pointer', color: '#374151'
                }}
              >
                ✉️ دعوة جديدة
              </button>
              <button
                onClick={() => setNewMember(prev => ({ ...prev, addType: 'existing' }))}
                style={{
                  flex: 1, padding: '10px', border: newMember.addType === 'existing' ? '2px solid #f59e0b' : '1px solid #d1d5db',
                  borderRadius: '8px', background: newMember.addType === 'existing' ? '#fef3c7' : 'white',
                  fontWeight: 600, fontSize: '13px', cursor: 'pointer', color: '#374151'
                }}
              >
                👤 مستخدم موجود
              </button>
            </div>

            {newMember.addType === 'invite' && (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '10px', marginBottom: '16px', fontSize: '12px', color: '#166534' }}>
                💡 سيتم إرسال دعوة للبريد المحدد. عند تسجيل المستخدم، سيُضاف تلقائياً بالدور المحدد.
              </div>
            )}

            {newMember.addType === 'existing' && (
              <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '8px', padding: '10px', marginBottom: '16px', fontSize: '12px', color: '#1e40af' }}>
                🔍 أدخل بريد مستخدم مسجّل مسبقاً لإضافته للفريق مباشرة.
              </div>
            )}
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#374151' }}>الاسم الكامل</label>
              <input
                type="text"
                value={newMember.name}
                onChange={e => setNewMember(prev => ({ ...prev, name: e.target.value }))}
                placeholder="مثال: أحمد محمد"
                style={{
                  width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px',
                  fontSize: '14px', direction: 'rtl'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#374151' }}>البريد الإلكتروني</label>
              <input
                type="email"
                value={newMember.email}
                onChange={e => setNewMember(prev => ({ ...prev, email: e.target.value }))}
                placeholder="example@email.com"
                style={{
                  width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px',
                  fontSize: '14px', direction: 'ltr', textAlign: 'left'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#374151' }}>الدور</label>
              <select
                value={newMember.role}
                onChange={e => setNewMember(prev => ({ ...prev, role: e.target.value }))}
                style={{
                  width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px',
                  fontSize: '14px', background: 'white', cursor: 'pointer'
                }}
              >
                <option value="teacher">👩‍🏫 معلم</option>
                <option value="staff">👤 موظف دعم</option>
                <option value="admin">🔐 مدير النظام</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleAddMember}
                disabled={addingMember}
                style={{
                  flex: 1, padding: '12px', background: '#f59e0b', color: 'white', border: 'none',
                  borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: addingMember ? 'wait' : 'pointer',
                  opacity: addingMember ? 0.7 : 1
                }}
              >
                {addingMember ? 'جارٍ الإضافة...' : newMember.addType === 'invite' ? '✉️ إرسال الدعوة' : '✅ إضافة العضو'}
              </button>
              <button
                onClick={() => setShowAddMemberModal(false)}
                style={{
                  padding: '12px 20px', background: '#f1f5f9', color: '#64748b', border: 'none',
                  borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer'
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT TRAIL & QUALITY */}
      {activeAdminTab === 'audit' && (
        <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '26px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '18px', color: 'var(--navy)' }}>سجل التدقيق التاريخي والرقابة التربوية (Audit Trail)</h3>
              <p style={{ fontSize: '13px', color: 'var(--muted)' }}>لا يوجد نظام تدقيق متصل بعد.</p>
            </div>
            <button
              style={{ background: '#0284c7', color: 'white', padding: '8px 16px', borderRadius: 'var(--radius-md)', border: 'none', fontWeight: 700, fontSize: '12.5px', cursor: 'pointer' }}
              onClick={() => triggerToast('تصدير سجل التدقيق غير متاح؛ لا يوجد سجل تدقيق ليُصدَّر.')}
            >
              تصدير السجل (غير متاح) 📊
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {auditLogs.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', border: '2px dashed var(--line)', borderRadius: '14px' }}>لا توجد سجلات تدقيق — لم يُربط نظام تدقيق بعد.</div>
            )}
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
            <div style={{ padding: '24px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed var(--line)', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', marginBottom: '6px' }}>🗺️</div>
              <p style={{ fontSize: '13.5px', color: 'var(--muted)', margin: 0 }}>
                لا توجد أسر مسجلة بعد — سيُبنى التوزيع الجغرافي تلقائياً من بيانات التسجيل الفعلية.
              </p>
            </div>
          </div>

          <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '17px', color: 'var(--navy)', marginBottom: '14px' }}>
              💳 مؤشرات الاشتراكات والإيرادات الشهرية
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '14px', background: '#ecfdf5', borderRadius: '10px', border: '1px solid #86efac' }}>
                <span style={{ fontSize: '12px', color: '#166534', fontWeight: 600 }}>الإيرادات:</span>
                <h4 style={{ fontSize: '20px', color: '#166534', margin: '4px 0 0' }}>غير متاحة — الدفع غير مفعّل</h4>
              </div>
              <div style={{ padding: '14px', background: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                <span style={{ fontSize: '12px', color: '#1e40af', fontWeight: 600 }}>خطط الاشتراك:</span>
                <h4 style={{ fontSize: '18px', color: '#1e40af', margin: '4px 0 0' }}>قيد الدراسة — لا توجد اشتراكات فعلية</h4>
              </div>
              <div style={{ padding: '14px', background: '#fefce8', borderRadius: '10px', border: '1px solid #fde047' }}>
                <span style={{ fontSize: '12px', color: '#854d0e', fontWeight: 600 }}>معدل التجديد:</span>
                <h4 style={{ fontSize: '18px', color: '#854d0e', margin: '4px 0 0' }}>غير متاح — لا توجد بيانات تشغيلية</h4>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
