/**
 * LessonReview — مراجعة دروس المعلمين (الإدارة ومحرر المحتوى)
 * الاعتماد/الرفض عبر دالة review_lesson (تفرض الصلاحية على الخادم).
 * إسناد المواد للمعلمين انتقل إلى المناهج ← «المعلمون والمواد» (/admin/teachers).
 */
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { resolveLessonReviewLoad } from '../../lib/lessonReviewLoadState';
import { lessonCurriculumPath, pendingRecordingLessonIds, RECORDINGS_STEP_PATH } from '../../lib/curriculumStatusTags';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import './curriculum/CurriculumAdmin.css';
import './LessonReview.css';
import Emoji from '../../ui/Emoji';

const NO_ROWS = { data: [], error: null };

export default function LessonReview() {
  const { role } = useAuth();
  const { triggerToast } = useApp();
  const isAdmin = role === 'admin';
  const [queue, setQueue] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loadState, setLoadState] = useState({ status: 'loading', error: null });
  const [busy, setBusy] = useState('');
  // دروس لها تسجيل حصة بانتظار المراجعة — مقروءة للمدير فقط (RLS)
  const [pendingRecordings, setPendingRecordings] = useState(new Set());
  // بعد اعتماد درس له تسجيل معلّق نقترح الخطوة التالية مباشرة
  const [recordingHint, setRecordingHint] = useState(null);

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
        NO_ROWS,
        isAdmin ? supabase.from('profiles').select('id, full_name').eq('role', 'teacher') : NO_ROWS,
      ]);
      const result = resolveLessonReviewLoad(results);
      setLoadState({ status: result.status, error: result.error });
      if (result.status === 'error') return;

      setQueue(result.queue);
      setSubjects(result.subjects);
      setTeachers(result.teachers);
    } catch (error) {
      setLoadState({ status: 'error', error });
      return;
    }

    // غير حرج: فشل جلب التسجيلات لا يمنع المراجعة، فقط لا تظهر وسوم 🎥.
    if (isAdmin) {
      const rec = await supabase.from('lesson_recordings').select('lesson_id').eq('status', 'review');
      setPendingRecordings(rec.error ? new Set() : pendingRecordingLessonIds(rec.data));
    }
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
    setRecordingHint(approve && pendingRecordings.has(l.id) ? (l.title || l.id) : null);
    load();
  }

  if (loadState.status === 'loading') return <div className="curriculum-loading">جارٍ التحميل...</div>;
  if (loadState.status === 'error') {
    return (
      <div className="curriculum-panel">
        <p className="empty-state" role="alert">
          تعذر تحميل بيانات مراجعة الدروس. أعد المحاولة، وإذا استمر الخطأ تواصل مع الإدارة التقنية.
        </p>
        <button className="btn-secondary" onClick={load}>إعادة المحاولة</button>
      </div>
    );
  }

  return (
    <div className="curriculum-panel">
      <div className="curriculum-header"><h2>🧾 دروس بانتظار الاعتماد ({queue.length})</h2></div>

      {recordingHint && (
        <div className="lr-next" role="status">
          <span><Emoji>🎥</Emoji> اعتُمد «{recordingHint}» وله تسجيل حصة بانتظار المراجعة.</span>
          <Link to={RECORDINGS_STEP_PATH} className="btn-primary btn-sm">راجع التسجيل الآن ←</Link>
          <button type="button" className="btn-muted btn-sm" onClick={() => setRecordingHint(null)}>لاحقاً</button>
        </div>
      )}

      {queue.length === 0 ? (
        <p className="empty-state">لا توجد دروس مُرسلة للمراجعة.</p>
      ) : (
        <div className="curriculum-table-wrapper">
          <table className="curriculum-table">
            <thead><tr><th>الدرس</th><th>المادة</th><th>المعلم</th><th>الإجراءات</th></tr></thead>
            <tbody>
              {queue.map(l => (
                <tr key={l.id}>
                  <td>
                    <Link to={`/admin/lesson/${l.id}`} className="lesson-title-link">{l.title || l.id}</Link>
                    {pendingRecordings.has(l.id) && (
                      <span className="lesson-tags">
                        <Link to={RECORDINGS_STEP_PATH} className="lesson-tag lesson-tag-warn"><Emoji>🎥</Emoji> تسجيل بانتظار المراجعة</Link>
                      </span>
                    )}
                  </td>
                  <td>{subjects.find(s => s.key === l.subject_key)?.title || l.subject_key}</td>
                  <td>{isAdmin ? teacherName(l.created_by) : '—'}</td>
                  <td>
                    <button className="btn-success btn-sm" disabled={busy === l.id} onClick={() => review(l, true)}>✓ اعتماد ونشر</button>
                    <button className="btn-muted btn-sm" disabled={busy === l.id} onClick={() => review(l, false)}>✕ رفض</button>
                    <Link to={lessonCurriculumPath(l)} className="btn-muted btn-sm lr-open" title="عرض الدرس ضمن دروس مادته">📂 افتح في المنهج</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isAdmin && (
        <p className="lsa-footnote">
          <Emoji>🎓</Emoji> إسناد المواد للمعلمين صار في المناهج ← <Link to="/admin/teachers">«المعلمون والمواد»</Link>.
        </p>
      )}
    </div>
  );
}
