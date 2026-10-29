import React, { useEffect, useState } from 'react';
import { DAY_NAMES } from '../../data/scheduleData';
import { GRADES } from '../account/AuthCard';
import { gradeLabel } from '../../utils/gradeLabel';
import { sortFamilySchedule, summarizeFamilyActivity } from '../../lib/familyManagement';

const TABS = [
  { id: 'overview', label: 'نظرة عامة' },
  { id: 'account', label: 'بيانات ولي الأمر' },
  { id: 'children', label: 'الأطفال' },
  { id: 'schedule', label: 'الجداول والحصص' },
  { id: 'progress', label: 'التقدم الدراسي' },
  { id: 'bookings', label: 'الحجوزات' },
  { id: 'subscription', label: 'الاشتراك' },
];

const BOOKING_STATUS = {
  new: 'جديد', contacted: 'تم التواصل', scheduled: 'حصة مجدولة',
  completed: 'مكتمل', cancelled: 'ملغي',
};

const localDate = value => value
  ? new Date(value).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })
  : '—';

function lessonLabel(record, curriculumData) {
  for (const subject of Object.values(curriculumData || {})) {
    const lesson = subject.lessons?.find(item => item.id === record.lesson_id);
    if (lesson) return `${subject.title} · ${lesson.title}`;
  }
  return record.lesson_id || 'درس غير معروف';
}

export default function FamilyDetailsModal({
  family, details, curriculumData, onClose, onManageSchedule, onSaveParent, onSaveChild,
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [editingParent, setEditingParent] = useState(false);
  const [parentForm, setParentForm] = useState({ full_name: '', whatsapp: '', country_code: '' });
  const [editingChildId, setEditingChildId] = useState(null);
  const [childForm, setChildForm] = useState({ name: '', grade: '' });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    setParentForm({
      full_name: family.full_name || '',
      whatsapp: family.whatsapp || '',
      country_code: family.country_code || '',
    });
  }, [family.id, family.full_name, family.whatsapp, family.country_code]);

  useEffect(() => {
    const onKeyDown = event => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const activity = summarizeFamilyActivity({
    children: family.children,
    slots: details.slots,
    learningRecords: details.learningRecords,
  });

  const saveParent = async event => {
    event.preventDefault();
    setSaving(true);
    setFeedback('');
    try {
      const result = await onSaveParent(family.id, parentForm);
      setFeedback(result.message);
      if (result.ok) setEditingParent(false);
    } catch (error) {
      setFeedback(`تعذر حفظ بيانات ولي الأمر: ${error?.message || 'حدث خطأ غير متوقع.'}`);
    } finally {
      setSaving(false);
    }
  };

  const saveChild = async event => {
    event.preventDefault();
    setSaving(true);
    setFeedback('');
    try {
      const result = await onSaveChild(editingChildId, childForm);
      setFeedback(result.message);
      if (result.ok) setEditingChildId(null);
    } catch (error) {
      setFeedback(`تعذر حفظ ملف الطفل: ${error?.message || 'حدث خطأ غير متوقع.'}`);
    } finally {
      setSaving(false);
    }
  };

  const startEditChild = child => {
    setFeedback('');
    setEditingChildId(child.id);
    setChildForm({ name: child.name || '', grade: child.grade || GRADES[0] });
  };

  const schedule = sortFamilySchedule(details.slots);
  const records = [...details.learningRecords].sort((a, b) =>
    String(b.updated_at || '').localeCompare(String(a.updated_at || ''))
  );

  return (
    <div className="family-modal-backdrop">
      <section className="family-modal" role="dialog" aria-modal="true" aria-labelledby="family-modal-title" dir="rtl">
        <header className="family-modal-header">
          <div>
            <p className="family-modal-kicker">ملف الأسرة</p>
            <h2 id="family-modal-title">{family.full_name || 'أسرة بدون اسم'}</h2>
            <p className="family-modal-subtitle" dir="ltr">{family.email || 'البريد غير متاح'}</p>
          </div>
          <button type="button" className="family-close-button" onClick={onClose} aria-label="إغلاق تفاصيل الأسرة">✕</button>
        </header>

        <nav className="family-tabs" aria-label="أقسام ملف الأسرة">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={activeTab === tab.id ? 'is-active' : ''}
              onClick={() => { setActiveTab(tab.id); setFeedback(''); }}
            >{tab.label}</button>
          ))}
        </nav>

        {details.status === 'loading' ? (
          <div className="family-detail-state" role="status">جارٍ تحميل بيانات الأسرة والأطفال…</div>
        ) : (
          <div className="family-modal-content">
            {feedback && <div className="family-feedback" role="status">{feedback}</div>}

            {activeTab === 'overview' && (
              <>
                <div className="family-stat-grid">
                  <article><span>الأطفال</span><strong>{activity.childCount}</strong></article>
                  <article><span>خانات الجدول</span><strong>{details.errors.slots ? '—' : activity.scheduledCount}</strong></article>
                  <article><span>حصص مباشرة مجدولة</span><strong>{details.errors.slots ? '—' : activity.liveCount}</strong></article>
                  <article><span>دروس مكتملة</span><strong>{details.errors.learningRecords ? '—' : activity.completedLessons}</strong></article>
                </div>
                <div className="family-info-grid">
                  <div><span>رقم التواصل</span><strong dir="ltr">{family.whatsapp || 'غير مسجل'}</strong></div>
                  <div><span>رمز الدولة</span><strong>{family.country_code || '—'}</strong></div>
                  <div><span>تاريخ إنشاء الملف</span><strong>{localDate(family.created_at)}</strong></div>
                  <div><span>آخر دخول للحساب</span><strong>{localDate(family.lastSignInAt)}</strong></div>
                </div>
                <p className="family-note">التقدم والحصص المعروضة مبنية على السجلات المرتبطة فعلياً بمعرّفات أطفال هذه الأسرة.</p>
              </>
            )}

            {activeTab === 'account' && (
              <section className="family-section-card">
                <div className="family-section-heading">
                  <div><h3>بيانات ولي الأمر</h3><p>تعديل الاسم ووسائل التواصل فقط.</p></div>
                  {!editingParent && <button type="button" className="family-button secondary" onClick={() => { setFeedback(''); setEditingParent(true); }}>تعديل البيانات</button>}
                </div>
                {editingParent ? (
                  <form className="family-form" onSubmit={saveParent}>
                    <label>الاسم الكامل<input required minLength="2" maxLength="100" value={parentForm.full_name} onChange={e => setParentForm(form => ({ ...form, full_name: e.target.value }))} /></label>
                    <label>رقم واتساب<input dir="ltr" maxLength="40" value={parentForm.whatsapp} onChange={e => setParentForm(form => ({ ...form, whatsapp: e.target.value }))} /></label>
                    <label>رمز الدولة<input maxLength="40" value={parentForm.country_code} onChange={e => setParentForm(form => ({ ...form, country_code: e.target.value }))} placeholder="مثال: +966" /></label>
                    <div className="family-form-actions">
                      <button className="family-button primary" disabled={saving}>{saving ? 'جارٍ الحفظ…' : 'حفظ بيانات ولي الأمر'}</button>
                      <button type="button" className="family-button secondary" onClick={() => { setEditingParent(false); setParentForm({ full_name: family.full_name || '', whatsapp: family.whatsapp || '', country_code: family.country_code || '' }); }}>إلغاء</button>
                    </div>
                  </form>
                ) : (
                  <dl className="family-info-grid">
                    <div><dt>الاسم</dt><dd>{family.full_name || '—'}</dd></div>
                    <div><dt>البريد الإلكتروني</dt><dd dir="ltr">{family.email || 'غير متاح'}</dd></div>
                    <div><dt>واتساب</dt><dd dir="ltr">{family.whatsapp || '—'}</dd></div>
                    <div><dt>رمز الدولة</dt><dd>{family.country_code || '—'}</dd></div>
                  </dl>
                )}
                <p className="family-note">البريد الإلكتروني وكلمة المرور لا يُعدّلان من هذه الشاشة؛ لا يتم عرض أو تخزين كلمات المرور.</p>
              </section>
            )}

            {activeTab === 'children' && (
              <div className="family-child-list">
                {family.children.length === 0 && <div className="family-detail-state">لا توجد ملفات أطفال مرتبطة بهذه الأسرة.</div>}
                {family.children.map(child => (
                  <article className="family-child-card" key={child.id}>
                    <div className="family-section-heading">
                      <div><h3>{child.name || 'طفل بدون اسم'}</h3><p>{gradeLabel(child.grade) || child.grade || 'الصف غير محدد'}</p></div>
                      <div className="family-child-actions">
                        <button type="button" className="family-button secondary" onClick={() => onManageSchedule(child)}>إدارة الجدول والحصص</button>
                        {editingChildId !== child.id && <button type="button" className="family-button secondary" onClick={() => startEditChild(child)}>تعديل الملف</button>}
                      </div>
                    </div>
                    {editingChildId === child.id && (
                      <form className="family-form child-edit-form" onSubmit={saveChild}>
                        <label>اسم الطفل<input required minLength="2" maxLength="80" value={childForm.name} onChange={e => setChildForm(form => ({ ...form, name: e.target.value }))} /></label>
                        <label>الصف الدراسي<select required value={childForm.grade} onChange={e => setChildForm(form => ({ ...form, grade: e.target.value }))}>
                          {[...new Set([childForm.grade, ...GRADES].filter(Boolean))].map(grade => <option key={grade} value={grade}>{gradeLabel(grade) || grade}</option>)}
                        </select></label>
                        <div className="family-form-actions">
                          <button className="family-button primary" disabled={saving}>{saving ? 'جارٍ الحفظ…' : 'حفظ بيانات الطفل'}</button>
                          <button type="button" className="family-button secondary" onClick={() => setEditingChildId(null)}>إلغاء</button>
                        </div>
                      </form>
                    )}
                  </article>
                ))}
              </div>
            )}

            {activeTab === 'schedule' && (
              <section className="family-section-card">
                <div className="family-section-heading"><div><h3>الجداول والحصص المجدولة</h3><p>عرض من schedule_slots؛ التعديل يتم عبر محرر الجدول المعتمد.</p></div></div>
                {details.errors.slots ? <div className="family-inline-error">تعذر تحميل الجدول: {details.errors.slots}</div> : schedule.length === 0 ? (
                  <div className="family-detail-state">لا توجد خانات جدول مسجلة لأطفال هذه الأسرة.</div>
                ) : (
                  <div className="family-table-wrap"><table className="family-table"><thead><tr><th>الطفل</th><th>اليوم والوقت</th><th>المادة والدرس</th><th>النوع والمدة</th><th>المعلم</th><th /></tr></thead><tbody>
                    {schedule.map(slot => {
                      const child = family.children.find(item => item.id === (slot.child_id || slot.childId));
                      const subject = curriculumData?.[slot.subject_id || slot.subjectId];
                      const lesson = subject?.lessons?.find(item => item.id === slot.lesson_ref);
                      const type = slot.slot_type || slot.type || 'lesson';
                      return <tr key={slot.id}>
                        <td>{child?.name || 'طفل غير معروف'}</td>
                        <td>{DAY_NAMES[Number(slot.day)] || '—'} · {String(slot.time || '').slice(0, 5) || '—'}</td>
                        <td>{subject?.title || slot.subject_id || slot.subjectId || '—'}<small>{slot.lesson_ref === 'next' || !slot.lesson_ref ? 'تلقائي' : lesson?.title || slot.lesson_ref}</small></td>
                        <td>{type === 'live' ? 'حصة مباشرة' : type === 'review' ? 'مراجعة' : 'درس'}<small>{slot.duration_min || slot.durationMin || 60} دقيقة</small></td>
                        <td>{slot.profiles?.full_name || slot.teacherName || 'غير مسند'}</td>
                        <td>{child && <button type="button" className="family-link-button" onClick={() => onManageSchedule(child)}>فتح المحرر</button>}</td>
                      </tr>;
                    })}
                  </tbody></table></div>
                )}
                {details.errors.recordings ? <div className="family-inline-error">تعذر تحميل تسجيلات الحصص: {details.errors.recordings}</div> : (
                  <div className="family-recording-list">
                    <h4>تسجيلات الحصص المرتبطة بالجدول</h4>
                    {details.recordings.length === 0 && <p className="family-note">لا توجد تسجيلات مرتبطة بخانات هذا الجدول.</p>}
                    {details.recordings.map(recording => {
                      const slot = details.slots.find(item => item.id === recording.slot_id);
                      const child = family.children.find(item => item.id === (slot?.child_id || slot?.childId));
                      const lessonTitle = Object.values(curriculumData || {}).flatMap(subject => subject.lessons || []).find(lesson => lesson.id === recording.lesson_id)?.title;
                      const status = { review: 'بانتظار المراجعة', accepted: 'معتمد', rejected: 'مرفوض' }[recording.status] || recording.status;
                      return <article key={recording.id}>
                        <div><strong>{child?.name || 'طفل غير معروف'} · {lessonTitle || recording.lesson_id}</strong><span>{localDate(recording.created_at)}{recording.duration_sec ? ` · ${Math.round(recording.duration_sec / 60)} دقيقة` : ''}</span></div>
                        <span className={`family-status ${recording.status === 'accepted' ? 'completed' : recording.status === 'review' ? 'started' : ''}`}>{status}</span>
                      </article>;
                    })}
                  </div>
                )}
                {family.children.length > 0 && <div className="family-child-actions schedule-child-links">{family.children.map(child => <button type="button" className="family-button secondary" key={child.id} onClick={() => onManageSchedule(child)}>تعديل جدول {child.name}</button>)}</div>}
              </section>
            )}

            {activeTab === 'progress' && (
              <section className="family-section-card">
                <div className="family-section-heading"><div><h3>التقدم الدراسي</h3><p>{activity.completedLessons} مكتمل · {activity.startedLessons} قيد التقدم</p></div></div>
                {details.errors.learningRecords ? <div className="family-inline-error">تعذر تحميل التقدم: {details.errors.learningRecords}</div> : records.length === 0 ? (
                  <div className="family-detail-state">لا توجد سجلات تقدم دراسي مرتبطة بأطفال الأسرة.</div>
                ) : (
                  <div className="family-table-wrap"><table className="family-table"><thead><tr><th>الطفل</th><th>الدرس</th><th>الحالة</th><th>النتيجة</th><th>آخر تحديث</th></tr></thead><tbody>
                    {records.map(record => <tr key={record.id || `${record.child_id}-${record.lesson_id}`}>
                      <td>{family.children.find(child => child.id === record.child_id)?.name || 'طفل غير معروف'}</td>
                      <td>{lessonLabel(record, curriculumData)}</td>
                      <td><span className={`family-status ${record.status === 'completed' ? 'completed' : 'started'}`}>{record.status === 'completed' ? 'مكتمل' : 'قيد التقدم'}</span></td>
                      <td>{record.score == null ? '—' : `${record.score}%`}</td>
                      <td>{localDate(record.updated_at)}</td>
                    </tr>)}
                  </tbody></table></div>
                )}
              </section>
            )}

            {activeTab === 'bookings' && (
              <section className="family-section-card">
                <div className="family-section-heading"><div><h3>حجوزات الأسرة</h3><p>سجلات مرتبطة بمعرّف الأسرة نفسه، لا بمجرد تشابه الاسم أو الهاتف.</p></div></div>
                {details.errors.bookings ? <div className="family-inline-error">تعذر تحميل الحجوزات: {details.errors.bookings}</div> : details.bookings.length === 0 ? (
                  <div className="family-detail-state">لا توجد حجوزات مرتبطة مباشرة بحساب هذه الأسرة.</div>
                ) : <div className="family-booking-list">{details.bookings.map(booking => (
                  <article key={booking.id}><div><strong>{booking.child_name}</strong><span>{gradeLabel(booking.grade) || booking.grade || '—'}</span></div><span className="family-status">{BOOKING_STATUS[booking.status] || booking.status || 'غير محدد'}</span><time>{localDate(booking.created_at)}</time></article>
                ))}</div>}
              </section>
            )}

            {activeTab === 'subscription' && (
              <section className="family-section-card family-subscription-notice">
                <h3>إدارة الاشتراك</h3>
                <p>لا يوجد في قاعدة المشروع الحالية جدول اشتراكات أو سجل دفع مرتبط بالأسرة؛ لذلك لا أعرض باقة أو حالة اشتراك مفترضة ولا أتيح تعديلها.</p>
                <small>تظهر باقات الموقع كتعريفات/محتوى، بينما ربط الاشتراك والفوترة مؤجل. يلزم اعتماد مصدر الاشتراك وقواعده قبل إنشاء إدارة مالية.</small>
              </section>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
