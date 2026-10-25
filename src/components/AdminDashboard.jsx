import RecordingsReview from './admin/RecordingsReview';
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Routes, Route, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminSectionsForRole, adminSectionPath } from '../navigation/navConfig';
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

  // القسم النشط مشتق من الـ URL (لا حالة محلية): /admin/* = المناهج، وإلا ?tab=
  const { role, user } = useAuth();
  const [searchParams] = useSearchParams();
  const adminLocation = useLocation();
  const adminNavigate = useNavigate();
  const sections = adminSectionsForRole(role).filter(x => !x.path);
  const subPath = adminLocation.pathname.replace(/^\/admin\/?/, '');
  const wanted = subPath ? 'curriculum' : (searchParams.get('tab') || 'curriculum');
  const activeAdminTab = sections.some(x => x.id === wanted) ? wanted : (sections[0]?.id || 'curriculum');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
  // المستخدمون والأدوار — من profiles عبر دوال الخادم (الإدارة فقط؛ تغيير الدور لا يتم من العميل مباشرة)
  const ROLE_OPTIONS = [
    { id: 'parent', label: 'ولي أمر', note: 'يرى أبناءه ويحجز ويتابع حصصهم' },
    { id: 'teacher', label: 'معلم', note: 'يرى طلابه المُسنَدين وحصصه ويرفع تسجيلاتها' },
    { id: 'content_editor', label: 'محرر محتوى', note: 'يدير المناهج والدروس فقط' },
    { id: 'admin', label: 'مدير النظام', note: 'كل الأقسام والصلاحيات' }
  ];
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [savingUser, setSavingUser] = useState(null);
  const loadUsers = async () => {
    if (!supabase) { setUsersLoading(false); return; }
    const { data, error } = await supabase.rpc('admin_list_users');
    if (error) setUsersError(error.message); else { setUsers(data || []); setUsersError(''); }
    setUsersLoading(false);
  };
  useEffect(() => { loadUsers(); }, []);
  const changeRole = async (u, role) => {
    if (role === u.role) return;
    setSavingUser(u.id);
    const { error } = await supabase.rpc('admin_set_user_role', { p_user: u.id, p_role: role });
    setSavingUser(null);
    if (error) { triggerToast(`تعذر تغيير الدور: ${error.message}`); return; }
    setUsers(list => list.map(x => x.id === u.id ? { ...x, role } : x));
    triggerToast(`تم تغيير دور ${u.full_name || u.email} ✓`);
  };

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
            <p style={{ color: 'var(--muted)', fontSize: '13.5px', marginTop: '4px' }}>
              المنهج والأسر والمعلمون والجدول ومراجعة التسجيلات • الصلاحيات مفروضة من الخادم
            </p>
          </div>
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
          <h3 style={{ fontSize: '26px', color: 'var(--navy)' }}>{usersLoading ? '...' : usersError ? '—' : users.length}</h3>
          <small style={{ color: 'var(--muted)', fontWeight: 700, fontSize: '11.5px' }}>
            {usersError ? 'متاح للمدير فقط' : 'مستخدم مسجّل'}
          </small>
        </div>
      </div>

      <section style={{ background: 'var(--blue-light)', border: '1px solid var(--line)', borderRadius: '14px', padding: '14px 18px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <span style={{ color: '#1e3a8a', fontSize: '13px' }}>
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
            {adminSectionsForRole(role).map(x => (
              <button key={x.id}
                onClick={() => { setMobileMenuOpen(false); adminNavigate(adminSectionPath(x)); }}
                style={{ display: 'block', width: '100%', padding: '12px 16px', border: 'none', borderBottom: '1px solid var(--line)', background: x.id === activeAdminTab ? 'var(--blue-light)' : 'transparent', textAlign: 'right', cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: 'var(--navy)' }}>
                {x.icon} {x.label}
              </button>
            ))}
          </div>
        )}
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

      {/* TAB 2: المستخدمون والصلاحيات */}
      {activeAdminTab === 'rbac' && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '26px', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: '18px', color: 'var(--navy)' }}>المستخدمون والصلاحيات</h3>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '18px' }}>
            كل من سجّل في المنصة يظهر هنا. غيّر دوره ليرى ما يخصه فقط. لا يمكنك تغيير دورك بنفسك، ولا إزالة آخر مدير.
          </p>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
            {ROLE_OPTIONS.map(r => (
              <span key={r.id} style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '10px', padding: '6px 10px', fontSize: '12px' }}>
                <strong>{r.label}</strong> — {r.note}
              </span>
            ))}
          </div>

          {usersLoading && <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)', fontWeight: 700 }}>جارٍ تحميل المستخدمين…</div>}
          {!usersLoading && usersError && (
            <div style={{ padding: '16px', background: 'var(--red-light)', color: 'var(--red-text)', borderRadius: '10px', fontSize: '13px' }}>تعذر تحميل المستخدمين: {usersError}</div>
          )}
          {!usersLoading && !usersError && users.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg)', borderRadius: '14px', border: '1px dashed var(--line)', fontWeight: 800, color: 'var(--navy)' }}>لا يوجد مستخدمون بعد</div>
          )}
          {!usersLoading && users.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '13.5px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg)', borderBottom: '2px solid var(--line)' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 700 }}>الاسم والبريد</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700 }}>الدور</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700 }}>آخر دخول</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <strong style={{ display: 'block', color: 'var(--navy)' }}>{u.full_name || '—'}</strong>
                        <span style={{ fontSize: '12px', color: 'var(--muted)', direction: 'ltr', display: 'inline-block' }}>{u.email}</span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <select
                          aria-label={`دور ${u.full_name || u.email}`}
                          value={u.role}
                          disabled={u.id === user?.id || savingUser === u.id}
                          title={u.id === user?.id ? 'لا يمكنك تغيير دورك بنفسك' : undefined}
                          onChange={e => changeRole(u, e.target.value)}
                          style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--card-bg)', fontSize: '13px' }}
                        >
                          {ROLE_OPTIONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--muted)' }}>
                        {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString('ar-EG') : 'لم يدخل بعد'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
