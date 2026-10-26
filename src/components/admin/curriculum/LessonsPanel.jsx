/**
 * LessonsPanel — قائمة الدروس لكل مادة
 * /admin/lessons?subject=arabic
 */
import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import './CurriculumAdmin.css';

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

  useEffect(() => {
    fetchSubjects();
  }, []);

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

  return (
    <div className="curriculum-panel">
      {/* Navigation Bar */}
      <nav className="curriculum-nav">
        <Link to="/admin/grades">الصفوف</Link>
        <span className="nav-arrow">→</span>
        <Link to="/admin/subjects">المواد</Link>
        <span className="nav-arrow">→</span>
        <span className="nav-active">📝 الدروس</span>
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
