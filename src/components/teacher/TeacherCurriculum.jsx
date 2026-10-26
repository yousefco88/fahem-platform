/**
 * TeacherCurriculum — «مناهجي» للمعلم
 * /teacher/curriculum        قائمة دروسي + إضافة درس (مسودة)
 * /teacher/curriculum/lesson/:id  المحرر (LessonEditor بوضع المعلم)
 * الخادم يفرض: مواد مُسندة فقط، مسودات للمعلم، لا نشر ولا حذف (RLS + trigger).
 */
import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import LessonEditor from '../admin/curriculum/LessonEditor';
import '../admin/curriculum/CurriculumAdmin.css';

const STATUS = {
  draft: { label: '○ مسودة', cls: 'badge-muted' },
  submitted: { label: '⏳ بانتظار المراجعة', cls: 'badge-muted' },
  approved: { label: '✓ معتمد ومنشور', cls: 'badge-success' },
  rejected: { label: '✕ مرفوض — يحتاج تعديل', cls: 'badge-muted' },
};

function MyLessons() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!supabase || !user) return;
    setLoading(true);
    const [subs, less] = await Promise.all([
      supabase.from('teacher_subjects').select('subject_key, curriculum_subjects(key, title, icon)').eq('teacher_id', user.id),
      supabase.from('curriculum_lessons').select('id, title, subject_key, review_status, review_note, updated_at')
        .eq('created_by', user.id).eq('archived', false).order('updated_at', { ascending: false }),
    ]);
    const err = subs.error || less.error;
    if (err) setError(err.message);
    const list = (subs.data || []).map(r => r.curriculum_subjects).filter(Boolean);
    setSubjects(list);
    setLessons(less.data || []);
    setSubject(prev => prev || list[0]?.key || '');
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function addLesson(e) {
    e.preventDefault();
    if (!title.trim() || !subject) return;
    setSaving(true);
    const id = `t-${user.id.slice(0, 8)}-${Date.now().toString(36)}`;
    const { error: err } = await supabase.from('curriculum_lessons').insert([{
      id, subject_key: subject, title: title.trim(), content: {},
      created_by: user.id, review_status: 'draft', published: false,
    }]);
    setSaving(false);
    if (err) { alert('تعذر إنشاء الدرس: ' + err.message); return; }
    navigate(`/teacher/curriculum/lesson/${id}`);
  }

  if (loading) return <div className="curriculum-loading">جارٍ التحميل...</div>;
  if (error) return <div className="curriculum-error">خطأ: {error}</div>;

  return (
    <div className="curriculum-panel">
      <nav className="curriculum-nav">
        <Link to="/teacher">مساحة المعلم</Link>
        <span className="nav-arrow">→</span>
        <span className="nav-active">📚 مناهجي</span>
      </nav>

      <div className="curriculum-header"><h2>📚 مناهجي</h2></div>

      {subjects.length === 0 ? (
        <p className="empty-state">لم تُسنَد لك مواد بعد. تُسنِد الإدارة المواد من «المستخدمون والصلاحيات»، وبعدها تستطيع إضافة دروسك هنا.</p>
      ) : (
        <form onSubmit={addLesson} className="header-actions" style={{ marginBottom: 16 }}>
          <select value={subject} onChange={e => setSubject(e.target.value)} className="subject-filter" aria-label="المادة">
            {subjects.map(s => <option key={s.key} value={s.key}>{s.icon} {s.title}</option>)}
          </select>
          <input className="input-md" value={title} onChange={e => setTitle(e.target.value)} placeholder="عنوان الدرس الجديد" aria-label="عنوان الدرس" />
          <button className="btn-primary" disabled={saving || !title.trim()}>{saving ? '...' : '+ إضافة درس (مسودة)'}</button>
        </form>
      )}

      {lessons.length === 0 ? (
        <p className="empty-state">لا توجد دروس لك بعد. تبدأ كل مسودة عندك وتصل الطلاب بعد اعتماد الإدارة.</p>
      ) : (
        <div className="curriculum-table-wrapper">
          <table className="curriculum-table">
            <thead><tr><th>العنوان</th><th>المادة</th><th>الحالة</th><th></th></tr></thead>
            <tbody>
              {lessons.map(l => {
                const st = STATUS[l.review_status] || STATUS.draft;
                return (
                  <tr key={l.id}>
                    <td>
                      <Link to={`/teacher/curriculum/lesson/${l.id}`} className="lesson-title-link">{l.title || 'بدون عنوان'}</Link>
                      {l.review_status === 'rejected' && l.review_note && (
                        <small style={{ display: 'block', color: 'var(--muted)' }}>سبب الرفض: {l.review_note}</small>
                      )}
                    </td>
                    <td>{subjects.find(s => s.key === l.subject_key)?.title || l.subject_key}</td>
                    <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                    <td><Link to={`/teacher/curriculum/lesson/${l.id}`} className="btn-icon" title="فتح">✏️</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function TeacherCurriculum() {
  return (
    <div className="teacher-page">
      <Routes>
        <Route index element={<MyLessons />} />
        <Route path="lesson/:id" element={<LessonEditor />} />
      </Routes>
    </div>
  );
}
