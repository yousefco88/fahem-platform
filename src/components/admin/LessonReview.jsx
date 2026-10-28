/**
 * LessonReview — مراجعة دروس المعلمين وإسناد المواد (الإدارة)
 * الاعتماد/الرفض عبر دالة review_lesson (تفرض الصلاحية على الخادم).
 * الإسناد (teacher_subjects) للمدير فقط بحسب RLS.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { resolveLessonReviewLoad } from '../../lib/lessonReviewLoadState';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { buildTeacherAssignmentRows, filterTeacherAssignmentRows } from '../../lib/teacherSubjectAssignments';
import './curriculum/CurriculumAdmin.css';
import './LessonReview.css';

export default function LessonReview() {
  const { role } = useAuth();
  const { triggerToast } = useApp();
  const isAdmin = role === 'admin';
  const [queue, setQueue] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assigned, setAssigned] = useState(new Set());
  const [loadState, setLoadState] = useState({ status: 'loading', error: null });
  const [busy, setBusy] = useState('');
  const [teacherQuery, setTeacherQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState('all');

  const load = useCallback(async () => {
    setLoadState({ status: 'loading', error: null });
    if (!supabase) {
      setLoadState({ status: 'error', error: new Error('الخدمة غير مهيأة') });
      return;
    }

    try {
      const results = await Promise.all([
        supabase.from('curriculum_lessons').select('id, title, subject_key, created_by, updated_at')
          .eq('review_status', 'submitted').order('updated_at'),
        supabase.from('curriculum_subjects').select('key, title, icon').order('sort_order'),
        isAdmin ? supabase.from('teacher_subjects').select('teacher_id, subject_key') : { data: [], error: null },
        isAdmin ? supabase.from('profiles').select('id, full_name').eq('role', 'teacher') : { data: [], error: null },
      ]);
      const result = resolveLessonReviewLoad(results);
      setLoadState({ status: result.status, error: result.error });
      if (result.status === 'error') return;

      setQueue(result.queue);
      setSubjects(result.subjects);
      setAssigned(new Set(result.assignments.map(r => `${r.teacher_id}|${r.subject_key}`)));
      setTeachers(result.teachers);
    } catch (error) {
      setLoadState({ status: 'error', error });
    }
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);

  const assignmentRows = useMemo(
    () => buildTeacherAssignmentRows({ teachers, subjects, assigned }),
    [teachers, subjects, assigned],
  );
  const visibleTeachers = useMemo(
    () => filterTeacherAssignmentRows(assignmentRows, {
      query: teacherQuery,
      subjectKey: subjectFilter,
      status: assignmentFilter,
    }),
    [assignmentRows, teacherQuery, subjectFilter, assignmentFilter],
  );
  const assignedSubjectsCount = assignmentRows.reduce((total, teacher) => total + teacher.assignedCount, 0);
  const assignmentCellsCount = teachers.length * subjects.length;

  const teacherName = id => teachers.find(t => t.id === id)?.full_name || 'معلم';

  async function review(l, approve) {
    let note = null;
    if (!approve) {
      note = prompt('سبب الرفض (يظهر للمعلم):');
      if (!note || !note.trim()) return;
    }
    setBusy(l.id);
    const { error } = await supabase.rpc('review_lesson', { p_id: l.id, p_approve: approve, p_note: note });
    setBusy('');
    if (error) { triggerToast(`تعذر: ${error.message}`); return; }
    triggerToast(approve ? 'اعتُمد الدرس ونُشر ✓' : 'رُفض الدرس وأُعيد للمعلم');
    load();
  }

  async function toggleSubject(teacherId, key) {
    const k = `${teacherId}|${key}`;
    setBusy(k);
    const on = assigned.has(k);
    const { error } = on
      ? await supabase.from('teacher_subjects').delete().eq('teacher_id', teacherId).eq('subject_key', key)
      : await supabase.from('teacher_subjects').insert([{ teacher_id: teacherId, subject_key: key }]);
    setBusy('');
    if (error) { triggerToast(`تعذر: ${error.message}`); return; }
    setAssigned(prev => { const n = new Set(prev); on ? n.delete(k) : n.add(k); return n; });
  }

  if (loadState.status === 'loading') return <div className="curriculum-loading">جارٍ التحميل...</div>;
  if (loadState.status === 'error') {
    return (
      <div className="curriculum-panel">
        <p className="empty-state" role="alert">
          تعذر تحميل بيانات مراجعة الدروس والإسناد. أعد المحاولة، وإذا استمر الخطأ تواصل مع الإدارة التقنية.
        </p>
        <button className="btn-secondary" onClick={load}>إعادة المحاولة</button>
      </div>
    );
  }

  return (
    <div className="curriculum-panel">
      <div className="curriculum-header"><h2>🧾 دروس بانتظار الاعتماد ({queue.length})</h2></div>
      {queue.length === 0 ? (
        <p className="empty-state">لا توجد دروس مُرسلة للمراجعة.</p>
      ) : (
        <div className="curriculum-table-wrapper">
          <table className="curriculum-table">
            <thead><tr><th>الدرس</th><th>المادة</th><th>المعلم</th><th>الإجراءات</th></tr></thead>
            <tbody>
              {queue.map(l => (
                <tr key={l.id}>
                  <td><Link to={`/admin/lesson/${l.id}`} className="lesson-title-link">{l.title || l.id}</Link></td>
                  <td>{subjects.find(s => s.key === l.subject_key)?.title || l.subject_key}</td>
                  <td>{isAdmin ? teacherName(l.created_by) : '—'}</td>
                  <td>
                    <button className="btn-success btn-sm" disabled={busy === l.id} onClick={() => review(l, true)}>✓ اعتماد ونشر</button>
                    <button className="btn-muted btn-sm" disabled={busy === l.id} onClick={() => review(l, false)}>✕ رفض</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isAdmin && (
        <section className="lsa-section" aria-labelledby="lsa-title">
          <div className="lsa-heading">
            <div>
              <h2 id="lsa-title">🎓 إسناد المواد للمعلمين</h2>
              <p>اختر المعلم، ثم فعّل المواد التي يدرّسها. يُحفظ كل تغيير مباشرة.</p>
            </div>
            <div className="lsa-summary" aria-label="ملخص الإسناد">
              <span><strong>{teachers.length}</strong> معلم</span>
              <span><strong>{subjects.length}</strong> مادة</span>
              <span><strong>{assignedSubjectsCount}</strong> إسناد من {assignmentCellsCount}</span>
            </div>
          </div>

          {teachers.length === 0 ? (
            <div className="lsa-empty">
              <span aria-hidden="true">👩‍🏫</span>
              <strong>لا يوجد معلمون بعد</strong>
              <p>فعّل حساب المعلم من قسم «المستخدمون والصلاحيات»، ثم ارجع لتحديد مواده.</p>
            </div>
          ) : subjects.length === 0 ? (
            <div className="lsa-empty">
              <span aria-hidden="true">📚</span>
              <strong>لا توجد مواد متاحة للإسناد</strong>
              <p>أضف المواد من إدارة المناهج أولاً.</p>
            </div>
          ) : (
            <>
              <div className="lsa-filters">
                <label className="lsa-search">
                  <span>البحث عن معلم</span>
                  <input
                    type="search"
                    value={teacherQuery}
                    onChange={event => setTeacherQuery(event.target.value)}
                    placeholder="اكتب اسم المعلم…"
                  />
                </label>
                <label className="lsa-filter">
                  <span>المادة</span>
                  <select value={subjectFilter} onChange={event => setSubjectFilter(event.target.value)}>
                    <option value="">كل المواد</option>
                    {subjects.map(subject => <option key={subject.key} value={subject.key}>{subject.title}</option>)}
                  </select>
                </label>
                <label className="lsa-filter">
                  <span>حالة الإسناد</span>
                  <select value={assignmentFilter} onChange={event => setAssignmentFilter(event.target.value)}>
                    <option value="all">الكل</option>
                    <option value="assigned">لديه مواد مسندة</option>
                    <option value="unassigned">بلا مواد مسندة</option>
                  </select>
                </label>
                {(teacherQuery || subjectFilter || assignmentFilter !== 'all') && (
                  <button type="button" className="lsa-reset" onClick={() => {
                    setTeacherQuery('');
                    setSubjectFilter('');
                    setAssignmentFilter('all');
                  }}>مسح التصفية</button>
                )}
              </div>

              {visibleTeachers.length === 0 ? (
                <div className="lsa-filter-empty" role="status">لا يوجد معلمون يطابقون خيارات البحث والتصفية.</div>
              ) : (
                <div className="lsa-teachers">
                  {visibleTeachers.map(teacher => (
                    <article className="lsa-teacher" key={teacher.id}>
                      <header className="lsa-teacher-head">
                        <div className="lsa-teacher-identity">
                          <span className="lsa-avatar" aria-hidden="true">{teacher.name.trim().charAt(0)}</span>
                          <div>
                            <h3>{teacher.name}</h3>
                            <p>{teacher.assignedCount} من {subjects.length} مادة مسندة</p>
                          </div>
                        </div>
                        <span className={`lsa-count${teacher.assignedCount ? ' is-assigned' : ''}`}>
                          {teacher.assignedCount ? 'لديه إسناد' : 'لم تُسند مواد'}
                        </span>
                      </header>
                      <div className="lsa-subject-grid" aria-label={`مواد ${teacher.name}`}>
                        {teacher.subjects.map(subject => {
                          const key = `${teacher.id}|${subject.key}`;
                          const pending = busy === key;
                          return (
                            <label className={`lsa-subject${subject.assigned ? ' is-selected' : ''}${pending ? ' is-busy' : ''}`} key={subject.key}>
                              <input
                                type="checkbox"
                                aria-label={`${teacher.name} — ${subject.title}`}
                                checked={subject.assigned}
                                disabled={Boolean(busy)}
                                onChange={() => toggleSubject(teacher.id, subject.key)}
                              />
                              <span className="lsa-subject-icon" aria-hidden="true">{subject.icon || '📘'}</span>
                              <span className="lsa-subject-title">{subject.title}</span>
                              <span className="lsa-checkmark" aria-hidden="true">{pending ? '…' : subject.assigned ? '✓' : '+'}</span>
                            </label>
                          );
                        })}
                      </div>
                    </article>
                  ))}
                </div>
              )}
              <p className="lsa-footnote">التغييرات تُحفظ فوراً على النظام. صلاحيات الإسناد محصورة بالإدارة.</p>
            </>
          )}
        </section>
      )}
    </div>
  );
}
