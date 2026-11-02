import { gradeLabel } from '../utils/gradeLabel';
import AiTutorSettings from './admin/AiTutorSettings';
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminSectionsForRole, adminSectionPath, resolveAdminLocation } from '../navigation/navConfig';
import { useApp } from '../context/AppContext';
import { loadAdminKpiStats } from '../lib/adminKpiStats';
import { loadAdminSummaryStats } from '../lib/adminSummaryStats';
import { DAY_NAMES, SLOT_TYPES } from '../data/scheduleData';
import BookingsPanel from './admin/BookingsPanel';
import FamiliesPanel from './admin/FamiliesPanel';
import SiteSettingsPanel from './admin/SiteSettingsPanel';
import SubscriptionPlansPanel from './admin/SubscriptionPlansPanel';
import SubscriptionContractsPanel from './admin/SubscriptionContractsPanel';
import ContentHub from './admin/ContentHub';
import AdminHub from './admin/AdminHub';
import UsersPanel from './admin/UsersPanel';
import StaffPermissionsPanel from './admin/StaffPermissionsPanel';
import './admin/curriculum/CurriculumAdmin.css';
import './admin/AdminSummary.css';
import Emoji from '../ui/Emoji';

export default function AdminDashboard() {
  const {
    curriculumData,
    triggerToast,
    allSlots,
    slotsLoaded,
    saveScheduleToCloud
  } = useApp();

  // القسم النشط مشتق من الـ URL (لا حالة محلية): /admin/* = المناهج داخل مركز المحتوى، وإلا ?tab=
  const { role, caps } = useAuth();
  const [searchParams] = useSearchParams();
  const adminLocation = useLocation();
  const adminNavigate = useNavigate();
  const sections = adminSectionsForRole(role, caps).filter(x => !x.path);
  const canOpen = (id) => sections.some(x => x.id === id);
  const { section: activeAdminTab, view: hubView } = resolveAdminLocation(role, adminLocation.pathname, searchParams.get('tab'), caps);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [syncingSchedule, setSyncingSchedule] = useState(false);

  // ===== KPI ديناميكي من Supabase =====
  const [kpiStats, setKpiStats] = useState(null);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [kpiError, setKpiError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loadAdminKpiStats(supabase).then(result => {
      if (cancelled) return;
      if (result.status === 'error') {
        setKpiError(result.message);
        setKpiStats(null);
      } else {
        setKpiStats(result.counts);
        setKpiError(null);
      }
      setKpiLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const [summaryStats, setSummaryStats] = useState(null);
  useEffect(() => {
    let cancelled = false;
    loadAdminSummaryStats(supabase).then(r => { if (!cancelled) setSummaryStats(r); });
    return () => { cancelled = true; };
  }, [activeAdminTab]);

  // عدد المواد الفعلي
  const subjectsCount = Object.keys(curriculumData).filter(k => k !== 'expatExamCalendar').length;
  const kpiValue = key => kpiLoading ? '...' : kpiError ? '—' : (kpiStats?.[key] ?? '—');

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
  // معلم الطفل المُسنَد (إن كان واحداً) يُملأ تلقائياً في الخانة الجديدة كي لا تبقى بلا teacher_id
  const [childTeacherIds, setChildTeacherIds] = useState([]);
  useEffect(() => {
    setChildTeacherIds([]);
    if (!supabase || !scheduleChildId) return;
    supabase.from('teacher_students').select('teacher_id').eq('child_id', scheduleChildId)
      .then(({ data }) => setChildTeacherIds((data || []).map(r => r.teacher_id)));
  }, [scheduleChildId]);
  const addSlot = () => setScheduleData(prev => ([...prev, {
    id: `slot_${Date.now()}`, childId: scheduleChildId, day: 0, time: '16:00', durationMin: 60,
    teacherId: childTeacherIds.length === 1 ? childTeacherIds[0] : null,
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
  // المستخدمون — يُحمَّلون هنا لعدّاد اللوحة، وتُدار في UsersPanel (الأدوار والإجراءات تفرضها دوال الخادم)
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [banned, setBanned] = useState({});
  const loadUsers = async () => {
    if (!supabase) { setUsersLoading(false); return; }
    const { data, error } = await supabase.rpc('admin_list_users');
    if (error) setUsersError(error.message); else { setUsers(data || []); setUsersError(''); }
    const st = await supabase.rpc('admin_user_status');
    if (!st.error) setBanned(Object.fromEntries((st.data || []).map(r => [r.id, r.banned_until])));
    setUsersLoading(false);
  };
  useEffect(() => { loadUsers(); }, []);

  const sv = key => summaryStats === null ? '...' : (summaryStats[key] ?? '—');
  const kpiHint = fn => kpiLoading ? 'جارٍ التحميل…' : kpiError ? 'تعذر تحميل البيانات' : fn();
  const pendingContent = summaryStats && [summaryStats.pendingLessons, summaryStats.pendingRecordings].every(Number.isInteger)
    ? summaryStats.pendingLessons + summaryStats.pendingRecordings : null;
  const summaryCards = [
    { id: 'families', tab: 'people', to: '/admin?tab=families', icon: '👨‍👩‍👧‍👦', label: 'الأسر المسجلة', color: 'var(--navy)', roles: ['admin'],
      value: kpiValue('families'), hint: kpiHint(() => `${kpiStats.children} طفل مسجّل`) },
    { id: 'bookings', tab: 'people', to: '/admin?tab=bookings', icon: '📋', label: 'الحصص التجريبية', color: 'var(--blue-text)', roles: ['admin'],
      value: kpiValue('bookings'), alert: kpiStats?.newBookings > 0,
      hint: kpiHint(() => kpiStats.newBookings > 0 ? `🔴 ${kpiStats.newBookings} بانتظار الرد` : 'لا يوجد جديد') },
    { id: 'content', tab: 'content', to: '/admin', icon: '📚', label: 'مركز المحتوى', color: 'var(--purple-text)',
      value: `${subjectsCount} مادة`, alert: pendingContent > 0,
      hint: summaryStats === null ? 'جارٍ التحميل…' : pendingContent === null ? 'تعذر تحميل المراجعات'
        : pendingContent > 0 ? `🔴 ${summaryStats.pendingLessons} درس و${summaryStats.pendingRecordings} تسجيل للمراجعة` : 'لا مراجعات معلّقة' },
    { id: 'subscriptions', tab: 'subscriptions', to: '/admin?tab=subscriptions', icon: '📦', label: 'الاشتراكات', color: 'var(--green-text)', roles: ['admin'],
      value: `${sv('activeContracts')} عقد`, hint: `${sv('activePlans')} خطة منشورة • العقود السارية` },
    { id: 'rbac', tab: 'rbac', to: '/admin?tab=rbac', icon: '👥', label: 'المستخدمون والصلاحيات', color: 'var(--navy)', roles: ['admin'],
      value: usersLoading ? '...' : usersError ? '—' : users.length, hint: usersError ? 'متاح للمدير فقط' : 'مستخدم مسجّل' },
  ];

  // Audit Log items
  // لا يوجد نظام تدقيق متصل؛ لا نعرض سجلاً مختلقاً

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
              <h1 style={{ fontSize: '22px', fontWeight: 800 }}>لوحة الإدارة</h1>
            </div>
            <p style={{ color: 'var(--on-inverse)', fontSize: '13.5px', marginTop: '4px' }}>
              المنهج والأسر والمعلمون والجدول ومراجعة التسجيلات • الصلاحيات مفروضة من الخادم
            </p>
          </div>
        </div>

      </section>

      {/* ملخص كل أقسام الإدارة — بيانات حقيقية من Supabase، والبطاقة تنقل لقسمها */}
      <div className="admin-summary" style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
        gap: '14px', marginBottom: '26px'
      }}>
        {summaryCards.filter(c => canOpen(c.tab)).map(c => (
          <button key={c.id} type="button" className="u-1"
            onClick={() => adminNavigate(c.to)}
            aria-current={c.tab === activeAdminTab ? 'page' : undefined}
            style={{ textAlign: 'right', cursor: 'pointer', font: 'inherit', outline: c.tab === activeAdminTab ? '2px solid var(--blue-text)' : 'none' }}>
            <span className="u-2"><Emoji>{c.icon}</Emoji> {c.label}</span>
            <h3 style={{ fontSize: '26px', color: c.color }}>{c.value}</h3>
            <small style={{ color: c.alert ? 'var(--red-text)' : 'var(--muted)', fontWeight: 700, fontSize: '11.5px' }}>{c.hint}</small>
          </button>
        ))}
      </div>

      <section style={{ background: 'var(--blue-light)', border: '1px solid var(--line)', borderRadius: '14px', padding: '14px 18px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--blue-text)', fontSize: '13px' }}>
          {supabase ? 'متصل بـ Supabase — البيانات أعلاه حقيقية من قاعدة البيانات.' : 'غير متصل بـ Supabase — البيانات محلية فقط.'}
        </span>
      </section>

      {/* قائمة الأقسام للجوال فقط — على الويب تظهر منبثقة من «الإدارة» في القائمة الجانبية */}
      <div className="admin-mobile-menu" style={{ marginBottom: '20px', position: 'relative' }}>
        <button
          onClick={() => setMobileMenuOpen(o => !o)}
          aria-expanded={mobileMenuOpen}
          style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--card-bg)', fontWeight: 800, fontSize: '14px', cursor: 'pointer', textAlign: 'right', color: 'var(--navy)' }}
        >
          {(sections.find(x => x.id === activeAdminTab)?.icon || '⚙️')} {sections.find(x => x.id === activeAdminTab)?.label || 'الأقسام'} {mobileMenuOpen ? '▴' : '▾'}
        </button>
        {mobileMenuOpen && (
          <div style={{ position: 'absolute', insetInline: 0, top: '100%', marginTop: '6px', background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', zIndex: 20, overflow: 'hidden' }}>
            {adminSectionsForRole(role, caps).map(x => (
              <button key={x.id}
                onClick={() => { setMobileMenuOpen(false); adminNavigate(adminSectionPath(x)); }}
                style={{ display: 'block', width: '100%', padding: '12px 16px', border: 'none', borderBottom: '1px solid var(--line)', background: x.id === activeAdminTab ? 'var(--blue-light)' : 'transparent', textAlign: 'right', cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: 'var(--navy)' }}>
                <Emoji>{x.icon}</Emoji> {x.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {activeAdminTab === 'content' && <ContentHub role={role} view={hubView} />}
      {activeAdminTab === 'aiTutor' && role === 'admin' && <AiTutorSettings />}

      {/* TAB: SITE SETTINGS */}
      {activeAdminTab === 'settings' && <SiteSettingsPanel />}

      {/* TAB: SUBSCRIPTION CATALOG (internal settings; no sale or entitlement) */}
      {activeAdminTab === 'subscriptions' && canOpen('subscriptions') && (
        <>
          {role !== 'admin' && <div className="acct-alert" role="note">عرض فقط — تعديل الاشتراكات والأسعار لمدير النظام.</div>}
          <SubscriptionPlansPanel /><SubscriptionContractsPanel />
        </>
      )}

      {/* مركز الطلاب والأسر: الحجوزات ← حسابات الأسر ← الجدول الأسبوعي */}
      {activeAdminTab === 'people' && canOpen('people') && (
        <AdminHub hubId="people" role={role} view={hubView} renderView={peopleView => (
          <>
          {peopleView === 'bookings' && (
            <div className="u-3">
              <BookingsPanel />
            </div>
          )}

          {/* TAB: FAMILIES (real data) */}
          {peopleView === 'families' && (
            <div className="u-3">
              <FamiliesPanel onManageSchedule={child => {
                setScheduleChildId(child.id);
                adminNavigate('/admin?tab=schedule');
              }} />
            </div>
          )}

          {/* TAB: WEEKLY SCHEDULE */}
          {peopleView === 'schedule' && (
            <div className="u-3">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', color: 'var(--navy)' }}><Emoji>🗓️</Emoji> الجدول الأسبوعي لمساحة الطفل</h3>
                  <p className="u-4">
                    كل طفل له جدوله الخاص. اختر الطفل ثم عدّل خاناته واحفظ. خيار «تلقائي» يعرض أول درس غير مُتقن. الحصة المباشرة: يضع المعلم المُسنَد رابط الاجتماع من «مساحتي ← حصصي».
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    style={{ background: 'var(--blue-light)', color: 'var(--blue-text)', padding: '10px 18px', borderRadius: 'var(--radius-md)', fontWeight: 800, fontSize: '13px', border: '1px solid #c7d2fe', cursor: 'pointer' }}
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
                {allKids.map(k => <option key={k.id} value={k.id}>{k.name}{k.grade ? ` (${gradeLabel(k.grade)})` : ''}</option>)}
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
                        {['اليوم', 'الوقت', 'المادة', 'الدرس', 'النوع', 'المدة', 'المعلم', ''].map(h => (
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
                              <select aria-label="مدة الحصة" value={slot.durationMin || 60} onChange={e => updateSlot(slot.id, 'durationMin', Number(e.target.value))} style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                                {[30, 45, 60, 90, 120].map(m => <option key={m} value={m}>{m} د</option>)}
                              </select>
                            </td>
                            <td style={{ padding: '8px' }}>
                              <select aria-label="المعلم" value={slot.teacherId || ''} onChange={e => updateSlot(slot.id, 'teacherId', e.target.value || null)} style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--line)', maxWidth: '150px' }}>
                                <option value="">— بدون —</option>
                                {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name || t.id.slice(0, 8)}</option>)}
                              </select>
                            </td>
                            <td style={{ padding: '8px' }}>
                              <button onClick={() => removeSlot(slot.id)} title="حذف الخانة" style={{ background: 'var(--red-light)', color: 'var(--red-text)', border: '1px solid var(--line)', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontWeight: 800 }}>🗑</button>
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
          </>
        )} />
      )}

      {activeAdminTab === 'staffPerms' && canOpen('staffPerms') && <StaffPermissionsPanel />}

      {/* TAB 2: المستخدمون والصلاحيات */}
      {activeAdminTab === 'rbac' && (
        <UsersPanel users={users} setUsers={setUsers} usersLoading={usersLoading} usersError={usersError}
          banned={banned} loadUsers={loadUsers} />
      )}
    </div>
  );
}
