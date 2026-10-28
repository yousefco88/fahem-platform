/**
 * TeacherCurriculum — «مناهجي» للمعلم
 * /teacher/curriculum        قائمة دروسي + إضافة درس (مسودة)
 * /teacher/curriculum/lesson/:id  المحرر (LessonEditor بوضع المعلم)
 * الخادم يفرض: مواد مُسندة فقط، مسودات للمعلم، لا نشر ولا حذف (RLS + trigger).
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import LessonEditor from '../admin/curriculum/LessonEditor';
import '../admin/curriculum/CurriculumAdmin.css';
import Emoji from '../../ui/Emoji';

const STATUS = {
  rejected: { label: '✕ مرفوض — يحتاج تعديلك', cls: 'tc-badge-rejected', order: 0 },
  submitted: { label: '⏳ بانتظار المراجعة', cls: 'tc-badge-submitted', order: 1 },
  draft: { label: '○ مسودة', cls: 'tc-badge-draft', order: 2 },
  approved: { label: '✓ معتمد', cls: 'tc-badge-approved', order: 3 },
};
const FILTERS = [
  { key: 'all', label: 'الكل' },
  { key: 'rejected', label: 'مرفوض' },
  { key: 'submitted', label: 'بانتظار المراجعة' },
  { key: 'draft', label: 'مسودة' },
  { key: 'approved', label: 'معتمد' },
];
const dateFmt = new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' });

function MyLessons() {
  const { user } = useAuth();
  const { triggerToast } = useApp();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');

  const load = useCallback(async () => {
    if (!supabase || !user) return;
    setLoading(true);
    const [subs, less] = await Promise.all([
      supabase.from('teacher_subjects').select('subject_key, curriculum_subjects(key, title, icon, grade, grade_id, grades(title))').eq('teacher_id', user.id),
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

  // عدّادات الحالات — مشتقة من نفس البيانات، صفر استعلامات إضافية
  const counts = useMemo(() => {
    const c = { all: lessons.length, rejected: 0, submitted: 0, draft: 0, approved: 0 };
    lessons.forEach(l => { if (c[l.review_status] !== undefined) c[l.review_status] += 1; });
    return c;
  }, [lessons]);

  // الفلترة ثم الترتيب: ما يحتاج تصرف المعلم أولاً (مرفوض → انتظار → مسودة → معتمد)، ثم الأحدث
  const visible = useMemo(() => lessons
    .filter(l => statusFilter === 'all' || l.review_status === statusFilter)
    .filter(l => subjectFilter === 'all' || l.subject_key === subjectFilter)
    .slice()
    .sort((a, b) => {
      const d = (STATUS[a.review_status]?.order ?? 2) - (STATUS[b.review_status]?.order ?? 2);
      return d !== 0 ? d : new Date(b.updated_at) - new Date(a.updated_at);
    }), [lessons, statusFilter, subjectFilter]);

  const subjectOf = (key) => subjects.find(s => s.key === key);

  async function addLesson(e) {
    e.preventDefault();
    if (!title.trim() || !subject) return;
    const currentSubject = subjectOf(subject);
    // Do not reuse stale legacy text when the linked grade is unavailable.
    const grade = (currentSubject?.grade_id
      ? currentSubject.grades?.title
      : currentSubject?.grade)?.trim();
    if (!grade) {
      triggerToast('تعذر تحديد صف المادة. اطلب من الإدارة تحديد صف صحيح للمادة قبل إضافة درس.');
      return;
    }
    setSaving(true);
    const id = `t-${user.id.slice(0, 8)}-${Date.now().toString(36)}`;
    const { error: err } = await supabase.from('curriculum_lessons').insert([{
      id, subject_key: subject, grade, title: title.trim(), content: {},
      created_by: user.id, review_status: 'draft', published: false,
    }]);
    setSaving(false);
    if (err) { triggerToast('تعذر إنشاء الدرس: ' + err.message); return; }
    navigate(`/teacher/curriculum/lesson/${id}`);
  }

  if (loading) return <div className="curriculum-loading">جارٍ التحميل...</div>;
  if (error) return <div className="curriculum-error">خطأ: {error}</div>;

  return (
    <div className="curriculum-panel">
      <nav className="curriculum-nav">
        <Link to="/teacher">مساحة المعلم</Link>
        <span className="nav-arrow">→</span>
        <span className="nav-active"><Emoji>📚</Emoji> مناهجي</span>
      </nav>

      <div className="curriculum-header"><h2><Emoji>📚</Emoji> مناهجي</h2></div>

      {subjects.length === 0 ? (
        <p className="empty-state">لم تُسنَد لك مواد بعد. تُسنِد الإدارة المواد من «المستخدمون والصلاحيات»، وبعدها تستطيع إضافة دروسك هنا.</p>
      ) : (
        <form onSubmit={addLesson} className="tc-add-form">
          <select value={subject} onChange={e => setSubject(e.target.value)} className="subject-filter" aria-label="المادة">
            {subjects.map(s => <option key={s.key} value={s.key}>{s.icon} {s.title}</option>)}
          </select>
          <input className="input-md tc-add-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="عنوان الدرس الجديد" aria-label="عنوان الدرس" />
          <button className="btn-primary" disabled={saving || !title.trim()}>{saving ? '...' : '+ إضافة درس (مسودة)'}</button>
        </form>
      )}

      {lessons.length > 0 && (
        <div className="tc-filters" role="group" aria-label="تصفية الدروس بالحالة">
          {FILTERS.map(f => (
            <button
              key={f.key} type="button"
              className={`tc-chip ${statusFilter === f.key ? 'active' : ''} ${f.key !== 'all' ? STATUS[f.key].cls : ''}`}
              onClick={() => setStatusFilter(f.key)}
              aria-pressed={statusFilter === f.key}
            >
              {f.label} <span className="tc-chip-count">{counts[f.key]}</span>
            </button>
          ))}
          {subjects.length > 1 && (
            <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} className="subject-filter" aria-label="تصفية بالمادة">
              <option value="all">كل موادي</option>
              {subjects.map(s => <option key={s.key} value={s.key}>{s.icon} {s.title}</option>)}
            </select>
          )}
        </div>
      )}

      {lessons.length === 0 ? (
        <p className="empty-state">لا توجد دروس لك بعد. تبدأ كل مسودة عندك وتصل الطلاب بعد اعتماد الإدارة.</p>
      ) : visible.length === 0 ? (
        <p className="empty-state">لا توجد دروس مطابقة لهذه التصفية.</p>
      ) : (
        <div className="tc-lesson-list">
          {visible.map(l => {
            const st = STATUS[l.review_status] || STATUS.draft;
            const sub = subjectOf(l.subject_key);
            return (
              <div key={l.id} className={`tc-lesson-card ${l.review_status === 'rejected' ? 'tc-lesson-rejected' : ''}`}>
                <div className="tc-lesson-main">
                  <Link to={`/teacher/curriculum/lesson/${l.id}`} className="lesson-title-link tc-lesson-title">
                    {l.title || 'بدون عنوان'}
                  </Link>
                  <div className="tc-lesson-meta">
                    <span>{sub ? `${sub.icon} ${sub.title}` : l.subject_key}</span>
                    <span>· آخر تحديث {dateFmt.format(new Date(l.updated_at))}</span>
                  </div>
                </div>
                <span className={`tc-badge ${st.cls}`}>{st.label}</span>
                <Link to={`/teacher/curriculum/lesson/${l.id}`} className="btn-icon" title="فتح الدرس">✏️</Link>
                {l.review_status === 'rejected' && l.review_note && (
                  <div className="tc-reject-note" role="alert">
                    <strong>سبب الرفض:</strong> {l.review_note}
                    <Link to={`/teacher/curriculum/lesson/${l.id}`} className="tc-reject-cta">عدّل وأعد الإرسال ←</Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TeacherCurriculum() {
  return (
    <div className="teacher-curriculum-content">
      <Routes>
        <Route index element={<MyLessons />} />
        <Route path="lesson/:id" element={<LessonEditor />} />
      </Routes>
    </div>
  );
}
