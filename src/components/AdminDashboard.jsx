import RecordingsReview from './admin/RecordingsReview';
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
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
    triggerToast,
    allSlots,
    slotsLoaded,
    saveScheduleToCloud
  } = useApp();

  const [activeAdminTab, setActiveAdminTab] = useState('curriculum');
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
  // الجدول لكل ابن: الإدارة تختار الطفل ثم تعدّل مسودته وتحفظها
  const [allKids, setAllKids] = useState([]);
  const [scheduleChildId, setScheduleChildId] = useState('');
  const [scheduleData, setScheduleData] = useState([]);
  useEffect(() => {
    if (!supabase) return;
    supabase.from('children').select('id, name, grade').order('name')
      .then(({ data }) => setAllKids(data || []));
  }, []);
  useEffect(() => {
    setScheduleData(scheduleChildId ? (allSlots || []).filter(x => x.childId === scheduleChildId) : []);
  }, [scheduleChildId, allSlots]);
  const updateSlot = (id, field, value) =>
    setScheduleData(prev => prev.map(s => s.id === id ? { ...s, [field]: field === 'day' ? Number(value) : value } : s));
  const removeSlot = (id) => setScheduleData(prev => prev.filter(s => s.id !== id));
  const addSlot = () => setScheduleData(prev => ([...prev, {
    id: `slot_${Date.now()}`, childId: scheduleChildId, day: 0, time: '16:00',
    subjectId: Object.keys(curriculumData)[0] || 'arabic', lessonRef: 'next', type: 'lesson'
  }]));
  const syncSchedule = async () => {
    setSyncingSchedule(true);
    const res = await saveScheduleToCloud(scheduleChildId, scheduleData);
    setSyncingSchedule(false);
    triggerToast(res.ok ? 'تم حفظ جدول الطفل ✓' : `تعذر الحفظ: ${res.reason}`);
  };
  // المعلمون المتاحون لإسناد الحصص (الإدارة فقط تقرأ profiles)
  const [teachers, setTeachers] = useState([]);
  useEffect(() => {
    if (!supabase) return;
    supabase.from('profiles').select('id, full_name').eq('role', 'teacher')
      .then(({ data }) => setTeachers(data || []));
  }, []);
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
              background: '#38bdf8', color: 'var(--navy)', padding: '10px 18px',
              borderRadius: 'var(--radius-md)', fontWeight: 800, fontSize: '13px', border: 'none', cursor: 'pointer'
            }}
            onClick={() => triggerToast('ميزة النسخ الاحتياطي غير متصلة بقاعدة بيانات بعد.')}
          >
            💾 حفظ نسخة احتياطية
          </button>
        </div>
      </section>

      {/* Admin KPI Ribbon — بيانات حقيقية من Supabase */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px', marginBottom: '26px'
      }}>
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '18px', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>الأسر المسجلة</span>
          <h3 style={{ fontSize: '26px', color: 'var(--navy)' }}>{kpiLoading ? '...' : kpiStats.families}</h3>
          <small style={{ color: 'var(--green)', fontWeight: 700, fontSize: '11.5px' }}>{kpiStats.children} طفل مسجّل</small>
        </div>

        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '18px', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>حجوزات الحصص التجريبية</span>
          <h3 style={{ fontSize: '26px', color: 'var(--blue)' }}>{kpiLoading ? '...' : kpiStats.bookings}</h3>
          <small style={{ color: kpiStats.newBookings > 0 ? '#dc2626' : 'var(--blue)', fontWeight: 700, fontSize: '11.5px' }}>
            {kpiStats.newBookings > 0 ? `🔴 ${kpiStats.newBookings} جديد` : 'لا يوجد جديد'}
          </small>
        </div>

        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '18px', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>المواد والمسارات النشطة</span>
          <h3 style={{ fontSize: '26px', color: '#7c3aed' }}>{subjectsCount} مادة</h3>
          <small style={{ color: '#7c3aed', fontWeight: 700, fontSize: '11.5px' }}>شاملة Connect Plus والماث</small>
        </div>

        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '18px', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>فريق العمل</span>
          <h3 style={{ fontSize: '26px', color: 'var(--navy)' }}>{staffLoading ? '...' : staffMembers.length}</h3>
          <small style={{ color: 'var(--muted)', fontWeight: 700, fontSize: '11.5px' }}>
            {staffMembers.length === 0 ? 'لا يوجد أعضاء بعد' : 'من user_roles'}
          </small>
        </div>
      </div>

      <section style={{ background: 'var(--blue-light)', border: '1px solid var(--line)', borderRadius: '14px', padding: '14px 18px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
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
          { id: 'recordings', label: '🎥 مراجعة تسجيلات الحصص', icon: '🎥' },
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
              color: activeAdminTab === tab.id ? 'white' : 'var(--muted)'
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
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '26px', boxShadow: 'var(--shadow-sm)' }}>
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
      {activeAdminTab === 'recordings' && <RecordingsReview />}

      {activeAdminTab === 'bookings' && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '26px', boxShadow: 'var(--shadow-sm)' }}>
          <BookingsPanel />
        </div>
      )}

      {/* TAB: FAMILIES (real data) */}
      {activeAdminTab === 'families' && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '26px', boxShadow: 'var(--shadow-sm)' }}>
          <FamiliesPanel />
        </div>
      )}

      {/* TAB: WEEKLY SCHEDULE */}
      {activeAdminTab === 'schedule' && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '26px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '18px', color: 'var(--navy)' }}>🗓️ الجدول الأسبوعي لمساحة الطفل</h3>
              <p style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '4px' }}>
                كل طفل له جدوله الخاص. اختر الطفل ثم عدّل خاناته واحفظ. خيار «تلقائي» يعرض أول درس غير مُتقن. الحصة المباشرة: يضع المعلم المُسنَد رابط الاجتماع من «مساحتي ← حصصي».
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                style={{ background: '#eef2ff', color: '#4338ca', padding: '10px 18px', borderRadius: 'var(--radius-md)', fontWeight: 800, fontSize: '13px', border: '1px solid #c7d2fe', cursor: 'pointer' }}
                disabled={!scheduleChildId}
                onClick={addSlot}
              >+ إضافة خانة</button>
              <button
                style={{ background: 'var(--blue)', color: 'white', padding: '10px 18px', borderRadius: 'var(--radius-md)', fontWeight: 800, fontSize: '13px', border: 'none', cursor: syncingSchedule ? 'wait' : 'pointer', opacity: syncingSchedule ? 0.6 : 1 }}
                disabled={syncingSchedule || !scheduleChildId}
                onClick={syncSchedule}
              >{syncingSchedule ? '... جارٍ الحفظ' : '☁️ حفظ على Supabase'}</button>
            </div>
          </div>

          <select
            value={scheduleChildId} onChange={e => setScheduleChildId(e.target.value)} aria-label="اختر الطفل"
            style={{ marginTop: '12px', padding: '9px 12px', borderRadius: '10px', border: '1px solid var(--line)', minWidth: '240px', font: 'inherit' }}
          >
            <option value="">— اختر الطفل —</option>
            {allKids.map(k => <option key={k.id} value={k.id}>{k.name}{k.grade ? ` (${k.grade})` : ''}</option>)}
          </select>
          {!scheduleChildId ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--muted)', border: '2px dashed var(--line)', borderRadius: '14px', marginTop: '14px' }}>
              اختر طفلاً لعرض جدوله وتعديله.
            </div>
          ) : scheduleData.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--muted)', border: '2px dashed var(--line)', borderRadius: '14px', marginTop: '14px' }}>
              لا توجد خانات بعد — أضف أول خانة لبناء الجدول.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', marginTop: '14px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg)', color: 'var(--muted)' }}>
                    {['اليوم', 'الوقت', 'المادة', 'الدرس', 'النوع', 'المعلم', ''].map(h => (
                      <th key={h} style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid var(--line)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...scheduleData].sort((a, b) => a.day - b.day || String(a.time).localeCompare(String(b.time))).map(slot => {
                    const subjLessons = curriculumData[slot.subjectId]?.lessons || [];
                    return (
                      <tr key={slot.id} style={{ borderBottom: '1px solid var(--line)' }}>
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
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '26px', boxShadow: 'var(--shadow-sm)' }}>
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
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)', fontWeight: 700 }}>
              جارٍ تحميل فريق العمل من Supabase…
            </div>
          )}

          {!staffLoading && staffMembers.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg)', borderRadius: '14px', border: '1px dashed var(--line)' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>👥</div>
              <div style={{ fontWeight: 800, color: 'var(--navy)' }}>لا يوجد أعضاء فريق بعد</div>
              <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '4px' }}>
                الصلاحيات تُدار عبر جدول user_roles في Supabase.<br/>
                أضف صفوفاً هناك لتظهر هنا تلقائياً.
              </div>
            </div>
          )}

          {!staffLoading && staffMembers.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '13.5px' }}>
            <thead>
              <tr style={{ background: 'var(--bg)', borderBottom: '2px solid var(--line)' }}>
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
                      style={{ background: 'var(--bg)', border: '1px solid var(--line)', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
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
            background: 'var(--card-bg)', borderRadius: '16px', padding: '28px', width: '90%', maxWidth: '420px',
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
                  borderRadius: '8px', background: newMember.addType === 'invite' ? 'var(--yellow-light)' : 'var(--card-bg)',
                  fontWeight: 600, fontSize: '13px', cursor: 'pointer', color: '#374151'
                }}
              >
                ✉️ دعوة جديدة
              </button>
              <button
                onClick={() => setNewMember(prev => ({ ...prev, addType: 'existing' }))}
                style={{
                  flex: 1, padding: '10px', border: newMember.addType === 'existing' ? '2px solid #f59e0b' : '1px solid #d1d5db',
                  borderRadius: '8px', background: newMember.addType === 'existing' ? 'var(--yellow-light)' : 'var(--card-bg)',
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
              <div style={{ background: 'var(--blue-light)', border: '1px solid #93c5fd', borderRadius: '8px', padding: '10px', marginBottom: '16px', fontSize: '12px', color: '#1e40af' }}>
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
                  fontSize: '14px', background: 'var(--card-bg)', cursor: 'pointer'
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
                  padding: '12px 20px', background: 'var(--bg)', color: 'var(--muted)', border: 'none',
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
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '26px', boxShadow: 'var(--shadow-sm)' }}>
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
                  background: 'var(--bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <strong style={{ color: 'var(--navy)', fontSize: '14px' }}>{log.user}</strong>
                    <span className="tag-badge info" style={{ fontSize: '10.5px' }}>{log.badge}</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--navy)', margin: 0 }}>{log.action}</p>
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
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '17px', color: 'var(--navy)', marginBottom: '14px' }}>
              🌍 التوزيع الجغرافي لأسر المغتربين النشطة
            </h3>
            <div style={{ padding: '24px', background: 'var(--bg)', borderRadius: '10px', border: '1px dashed var(--line)', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', marginBottom: '6px' }}>🗺️</div>
              <p style={{ fontSize: '13.5px', color: 'var(--muted)', margin: 0 }}>
                لا توجد أسر مسجلة بعد — سيُبنى التوزيع الجغرافي تلقائياً من بيانات التسجيل الفعلية.
              </p>
            </div>
          </div>

          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '17px', color: 'var(--navy)', marginBottom: '14px' }}>
              💳 مؤشرات الاشتراكات والإيرادات الشهرية
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '14px', background: '#ecfdf5', borderRadius: '10px', border: '1px solid #86efac' }}>
                <span style={{ fontSize: '12px', color: '#166534', fontWeight: 600 }}>الإيرادات:</span>
                <h4 style={{ fontSize: '20px', color: '#166534', margin: '4px 0 0' }}>غير متاحة — الدفع غير مفعّل</h4>
              </div>
              <div style={{ padding: '14px', background: 'var(--blue-light)', borderRadius: '10px', border: '1px solid var(--line)' }}>
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
