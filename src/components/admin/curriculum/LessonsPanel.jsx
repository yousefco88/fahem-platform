/**
 * LessonsPanel — قائمة الدروس لكل مادة
 * /admin/lessons?subject=arabic
 */
import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import './CurriculumAdmin.css';
import Emoji from '../../../ui/Emoji';
import { useAuth } from '../../../context/AuthContext';
import { subjectTeacherOptions } from '../../../lib/lessonTeacherAssignment';

export default function LessonsPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedSubject = searchParams.get('subject') || '';
  
  const [subjects, setSubjects] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ id: '', title: '', sort_order: 0 });
  const [saving, setSaving] = useState(false);
  // إسناد معلم للدرس — للمدير فقط (teacher_subjects مقروءة للمدير وحده بحسب RLS)
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const [teachers, setTeachers] = useState([]);
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [assigningId, setAssigningId] = useState('');

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (isAdmin) fetchTeachers();
  }, [isAdmin]);

  useEffect(() => {
    if (selectedSubject) {
      fetchLessons();
    } else {
      setLessons([]);
      setLoading(false);
    }
  }, [selectedSubject]);

  async function fetchSubjects() {
    const { data } = await supabase
      .from('curriculum_subjects')
      .select('key, title, icon, grade, grade_id, grades(title)')
      .order('sort_order');
    setSubjects(data || []);
  }

  async function fetchTeachers() {
    const [t, ts] = await Promise.all([
      supabase.from('profiles').select('id, full_name').eq('role', 'teacher'),
      supabase.from('teacher_subjects').select('teacher_id, subject_key'),
    ]);
    if (t.error || ts.error) { setError((t.error || ts.error).message); return; }
    setTeachers(t.data || []);
    setTeacherSubjects(ts.data || []);
  }

  async function assignTeacher(lesson, teacherId) {
    const next = teacherId || null;
    if (lesson.published && next && !confirm('الدرس منشور: سيظهر للمعلم للعرض فقط، ولن يستطيع تعديله إلا إذا ألغيت نشره. متابعة؟')) return;
    setAssigningId(lesson.id);
    const { data, error } = await supabase
      .from('curriculum_lessons')
      .update({ assigned_teacher_id: next })
      .eq('id', lesson.id)
      .select('id, assigned_teacher_id, review_status, published')
      .single();
    setAssigningId('');
    if (error) { alert('تعذر إسناد المعلم: ' + error.message); return; }
    setLessons(prev => prev.map(l => (l.id === lesson.id ? { ...l, ...data } : l)));
  }

  async function fetchLessons() {
    setLoading(true);
    const { data, error } = await supabase
      .from('curriculum_lessons')
      .select('*')
      .eq('subject_key', selectedSubject)
      .order('sort_order', { ascending: true });
    
    if (error) {
      setError(error.message);
    } else {
      setLessons(data || []);
    }
    setLoading(false);
  }

  function startNew() {
    const maxOrder = Math.max(0, ...lessons.map(l => l.sort_order || 0));
    setEditingId('__new__');
    setForm({
      id: '',
      title: '',
      sort_order: maxOrder + 1,
    });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveLesson() {
    if (!form.id.trim() || !form.title.trim()) {
      alert('المعرّف والعنوان مطلوبان');
      return;
    }

    // A linked grade is authoritative; only unlinked legacy subjects use grade.
    const grade = (currentSubject?.grade_id
      ? currentSubject.grades?.title
      : currentSubject?.grade)?.trim();
    if (!grade) {
      alert('تعذر تحديد صف المادة. حدّد صفاً صحيحاً للمادة قبل إضافة درس.');
      return;
    }

    setSaving(true);
    
    if (editingId === '__new__') {
      const { error } = await supabase
        .from('curriculum_lessons')
        .insert([{
          id: form.id.trim(),
          subject_key: selectedSubject,
          grade,
          title: form.title.trim(),
          sort_order: form.sort_order,
          published: false,  // يبدأ كمسودة
          content: {},
        }]);
      
      if (error) {
        alert('خطأ: ' + error.message);
      } else {
        await fetchLessons();
        cancelEdit();
      }
    }
    
    setSaving(false);
  }

  async function togglePublished(lesson) {
    const { error } = await supabase
      .from('curriculum_lessons')
      .update({ published: !lesson.published })
      .eq('id', lesson.id);
    if (error) { alert('تعذر تغيير حالة النشر: ' + error.message); return; }
    {
      setLessons(lessons.map(l => 
        l.id === lesson.id ? { ...l, published: !l.published } : l
      ));
    }
  }

  async function deleteLesson(lesson) {
    if (!confirm(`حذف "${lesson.title}"؟`)) return;
    
    const { error } = await supabase
      .from('curriculum_lessons')
      .delete()
      .eq('id', lesson.id);
    
    if (error) {
      alert('خطأ: ' + error.message);
    } else {
      setLessons(lessons.filter(l => l.id !== lesson.id));
    }
  }

  const currentSubject = subjects.find(s => s.key === selectedSubject);
  const teacherOptions = subjectTeacherOptions({ teachers, assignments: teacherSubjects, subjectKey: selectedSubject });

  return (
    <div className="curriculum-panel">
      {/* Navigation Bar */}
      <nav className="curriculum-nav">
        <Link to="/admin/grades">الصفوف</Link>
        <span className="nav-arrow">→</span>
        <Link to="/admin/subjects">المواد</Link>
        <span className="nav-arrow">→</span>
        <span className="nav-active"><Emoji>📝</Emoji> الدروس</span>
      </nav>

      <div className="curriculum-header">
        <h2>
          📝 إدارة الدروس
          {currentSubject && (
            <span className="header-subject">
              {currentSubject.icon} {currentSubject.title}
            </span>
          )}
        </h2>
        <div className="header-actions">
          <select 
            value={selectedSubject} 
            onChange={e => setSearchParams(e.target.value ? { subject: e.target.value } : {})}
            className="subject-filter"
          >
            <option value="">اختر مادة...</option>
            {subjects.map(s => (
              <option key={s.key} value={s.key}>{s.icon} {s.title}</option>
            ))}
          </select>
          {selectedSubject && (
            <button className="btn-primary" onClick={startNew}>
              + إضافة درس
            </button>
          )}
        </div>
      </div>

      {isAdmin && selectedSubject && teacherOptions.length === 0 && (
        <p className="empty-state">
          لا يوجد معلم مسند لهذه المادة بعد. أسند المادة أولاً من الخطوة 2 «مراجعة دروس المعلمين» ← «إسناد المواد للمعلمين»، ثم اختر معلم كل درس من عمود «المعلم».
        </p>
      )}

      {!selectedSubject ? (
        <p className="empty-state">اختر مادة من القائمة أعلاه لعرض دروسها.</p>
      ) : loading ? (
        <div className="curriculum-loading">جارٍ التحميل...</div>
      ) : error ? (
        <div className="curriculum-error">خطأ: {error}</div>
      ) : (
        <div className="curriculum-table-wrapper">
          <table className="curriculum-table">
            <thead>
              <tr>
                <th>#</th>
                <th>المعرّف</th>
                <th>العنوان</th>
                <th>الفيديو</th>
                <th>PDF</th>
                <th>السؤال</th>
                <th>الحالة</th>
                {isAdmin && <th>المعلم</th>}
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {editingId === '__new__' && (
                <tr className="editing-row">
                  <td>—</td>
                  <td>
                    <input 
                      type="text" 
                      value={form.id} 
                      onChange={e => setForm({ ...form, id: e.target.value })}
                      placeholder="lesson-1"
                      className="input-sm"
                    />
                  </td>
                  <td>
                    <input 
                      type="text" 
                      value={form.title} 
                      onChange={e => setForm({ ...form, title: e.target.value })}
                      placeholder="عنوان الدرس"
                      className="input-md"
                    />
                  </td>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                  {isAdmin && <td>—</td>}
                  <td>
                    <button className="btn-success btn-sm" onClick={saveLesson} disabled={saving}>
                      {saving ? '...' : '✓ حفظ'}
                    </button>
                    <button className="btn-muted btn-sm" onClick={cancelEdit}>
                      ✕ إلغاء
                    </button>
                  </td>
                </tr>
              )}
              
              {lessons.map((lesson, index) => {
                const content = lesson.content || {};
                const hasVideo = !!lesson.video_url || !!content.videoChapters;
                const hasPdf = !!lesson.pdf_url || !!content.pdfTitle;
                const hasQuiz = !!content.question || !!content.quizType;
                
                return (
                  <tr key={lesson.id} className={!lesson.published ? 'unpublished-row' : ''}>
                    <td>{index + 1}</td>
                    <td><code>{lesson.id}</code></td>
                    <td>
                      <Link to={`/admin/lesson/${lesson.id}`} className="lesson-title-link">
                        {lesson.title || content.title || 'بدون عنوان'}
                      </Link>
                    </td>
                    <td>{hasVideo ? '✅' : '❌'}</td>
                    <td>{hasPdf ? '✅' : '❌'}</td>
                    <td>{hasQuiz ? '✅' : '❌'}</td>
                    <td>
                      <button 
                        className={`badge ${lesson.published ? 'badge-success' : 'badge-muted'}`}
                        onClick={() => togglePublished(lesson)}
                      >
                        {lesson.published ? '✓ منشور' : '○ مسودة'}
                      </button>
                    </td>
                    {isAdmin && (
                      <td>
                        <select
                          className="input-sm"
                          aria-label={`المعلم المسؤول عن ${lesson.title || lesson.id}`}
                          value={lesson.assigned_teacher_id || ''}
                          disabled={assigningId === lesson.id}
                          onChange={e => assignTeacher(lesson, e.target.value)}
                        >
                          <option value="">— بدون —</option>
                          {teacherOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          {lesson.assigned_teacher_id && !teacherOptions.some(t => t.id === lesson.assigned_teacher_id) && (
                            <option value={lesson.assigned_teacher_id}>معلم غير مسند للمادة</option>
                          )}
                        </select>
                      </td>
                    )}
                    <td>
                      <Link to={`/admin/lesson/${lesson.id}`} className="btn-icon" title="تعديل">
                        ✏️
                      </Link>
                      <button 
                        className="btn-icon btn-danger" 
                        onClick={() => deleteLesson(lesson)} 
                        title="حذف"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {lessons.length === 0 && !editingId && (
            <p className="empty-state">لا توجد دروس لهذه المادة. أضف درساً جديداً.</p>
          )}
        </div>
      )}
    </div>
  );
}
