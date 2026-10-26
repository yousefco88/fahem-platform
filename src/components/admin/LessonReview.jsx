/**
 * LessonReview — مراجعة دروس المعلمين وإسناد المواد (الإدارة)
 * الاعتماد/الرفض عبر دالة review_lesson (تفرض الصلاحية على الخادم).
 * الإسناد (teacher_subjects) للمدير فقط بحسب RLS.
 */
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import './curriculum/CurriculumAdmin.css';

export default function LessonReview() {
  const { role } = useAuth();
  const { triggerToast } = useApp();
  const isAdmin = role === 'admin';
  const [queue, setQueue] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assigned, setAssigned] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const [q, subs, ts, tch] = await Promise.all([
      supabase.from('curriculum_lessons').select('id, title, subject_key, created_by, updated_at')
        .eq('review_status', 'submitted').order('updated_at'),
      supabase.from('curriculum_subjects').select('key, title, icon').order('sort_order'),
      isAdmin ? supabase.from('teacher_subjects').select('teacher_id, subject_key') : { data: [] },
      isAdmin ? supabase.from('profiles').select('id, full_name').eq('role', 'teacher') : { data: [] },
    ]);
    setQueue(q.data || []);
    setSubjects(subs.data || []);
    setAssigned(new Set((ts.data || []).map(r => `${r.teacher_id}|${r.subject_key}`)));
    setTeachers(tch.data || []);
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);

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

  if (loading) return <div className="curriculum-loading">جارٍ التحميل...</div>;

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
        <>
          <div className="curriculum-header" style={{ marginTop: 28 }}><h2>🎓 إسناد المواد للمعلمين</h2></div>
          {teachers.length === 0 ? (
            <p className="empty-state">لا يوجد معلمون بعد. فعّل معلماً من «المستخدمون والصلاحيات».</p>
          ) : (
            <div className="curriculum-table-wrapper">
              <table className="curriculum-table">
                <thead><tr><th>المعلم</th>{subjects.map(s => <th key={s.key}>{s.icon} {s.title}</th>)}</tr></thead>
                <tbody>
                  {teachers.map(t => (
                    <tr key={t.id}>
                      <td>{t.full_name || t.id.slice(0, 8)}</td>
                      {subjects.map(s => (
                        <td key={s.key}>
                          <input type="checkbox" aria-label={`${t.full_name || 'معلم'} — ${s.title}`}
                            checked={assigned.has(`${t.id}|${s.key}`)}
                            disabled={busy === `${t.id}|${s.key}`}
                            onChange={() => toggleSubject(t.id, s.key)} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
