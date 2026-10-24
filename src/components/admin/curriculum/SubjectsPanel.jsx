/**
 * SubjectsPanel — إدارة المواد الدراسية
 * /admin/subjects
 */
import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import './CurriculumAdmin.css';

const ICONS = ['📖', '🔢', '🔬', '🌍', '🎨', '🏃', '💻', '📐', '🎵', '📚', '🧪', '🌱', '🕌'];
const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ca8a04', '#0891b2', '#be185d'];

export default function SubjectsPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedGrade = searchParams.get('grade') || '';
  
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingKey, setEditingKey] = useState(null);
  const [form, setForm] = useState({
    key: '', title: '', icon: '📖', color: '#2563eb', badge: '', grade_id: '', sort_order: 0
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchGrades();
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, [selectedGrade]);

  async function fetchGrades() {
    const { data } = await supabase
      .from('grades')
      .select('id, title')
      .eq('published', true)
      .order('sort_order');
    setGrades(data || []);
  }

  async function fetchSubjects() {
    setLoading(true);
    let query = supabase
      .from('curriculum_subjects')
      .select('*')
      .order('sort_order', { ascending: true });
    
    if (selectedGrade) {
      query = query.eq('grade_id', selectedGrade);
    }
    
    const { data, error } = await query;
    
    if (error) {
      setError(error.message);
    } else {
      setSubjects(data || []);
    }
    setLoading(false);
  }

  function startEdit(subject) {
    setEditingKey(subject.key);
    setForm({
      key: subject.key,
      title: subject.title,
      icon: subject.icon || '📖',
      color: subject.color || '#2563eb',
      badge: subject.badge || '',
      grade_id: subject.grade_id || '',
      sort_order: subject.sort_order,
    });
  }

  function startNew() {
    const maxOrder = Math.max(0, ...subjects.map(s => s.sort_order));
    setEditingKey('__new__');
    setForm({
      key: '',
      title: '',
      icon: '📖',
      color: '#2563eb',
      badge: '',
      grade_id: selectedGrade || (grades[0]?.id || ''),
      sort_order: maxOrder + 1,
    });
  }

  function cancelEdit() {
    setEditingKey(null);
  }

  async function saveSubject() {
    if (!form.key.trim() || !form.title.trim()) {
      alert('المعرّف والعنوان مطلوبان');
      return;
    }

    setSaving(true);
    
    const payload = {
      title: form.title.trim(),
      icon: form.icon,
      color: form.color,
      badge: form.badge.trim() || null,
      grade_id: form.grade_id || null,
      sort_order: form.sort_order,
    };

    if (editingKey === '__new__') {
      const { error } = await supabase
        .from('curriculum_subjects')
        .insert([{ key: form.key.trim(), ...payload, published: true }]);
      
      if (error) {
        alert('خطأ: ' + error.message);
      } else {
        await fetchSubjects();
        cancelEdit();
      }
    } else {
      const { error } = await supabase
        .from('curriculum_subjects')
        .update(payload)
        .eq('key', editingKey);
      
      if (error) {
        alert('خطأ: ' + error.message);
      } else {
        await fetchSubjects();
        cancelEdit();
      }
    }
    
    setSaving(false);
  }

  async function togglePublished(subject) {
    const { error } = await supabase
      .from('curriculum_subjects')
      .update({ published: !subject.published })
      .eq('key', subject.key);
    
    if (!error) {
      setSubjects(subjects.map(s => 
        s.key === subject.key ? { ...s, published: !s.published } : s
      ));
    }
  }

  async function deleteSubject(subject) {
    if (!confirm(`حذف "${subject.title}"؟ سيحذف جميع الدروس المرتبطة.`)) return;
    
    const { error } = await supabase
      .from('curriculum_subjects')
      .delete()
      .eq('key', subject.key);
    
    if (error) {
      alert('خطأ: ' + error.message);
    } else {
      setSubjects(subjects.filter(s => s.key !== subject.key));
    }
  }

  if (loading) return <div className="curriculum-loading">جارٍ التحميل...</div>;
  if (error) return <div className="curriculum-error">خطأ: {error}</div>;

  return (
    <div className="curriculum-panel">
      {/* Navigation Bar */}
      <nav className="curriculum-nav">
        <Link to="/admin/grades">الصفوف</Link>
        <span className="nav-arrow">→</span>
        <span className="nav-active">📚 المواد</span>
        <span className="nav-arrow">→</span>
        <Link to="/admin/lessons">الدروس</Link>
      </nav>

      <div className="curriculum-header">
        <h2>📚 إدارة المواد الدراسية</h2>
        <div className="header-actions">
          <select 
            value={selectedGrade} 
            onChange={e => setSearchParams(e.target.value ? { grade: e.target.value } : {})}
            className="grade-filter"
          >
            <option value="">كل الصفوف</option>
            {grades.map(g => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </select>
          <button className="btn-primary" onClick={startNew}>
            + إضافة مادة
          </button>
        </div>
      </div>

      <div className="curriculum-table-wrapper">
        <table className="curriculum-table">
          <thead>
            <tr>
              <th>الأيقونة</th>
              <th>المعرّف</th>
              <th>العنوان</th>
              <th>الصف</th>
              <th>الشارة</th>
              <th>الدروس</th>
              <th>الحالة</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {editingKey === '__new__' && (
              <tr className="editing-row">
                <td>
                  <select value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} className="icon-select">
                    {ICONS.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </td>
                <td>
                  <input type="text" value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} placeholder="arabic" className="input-sm" />
                </td>
                <td>
                  <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="اللغة العربية" className="input-md" />
                </td>
                <td>
                  <select value={form.grade_id} onChange={e => setForm({ ...form, grade_id: e.target.value })} className="input-sm">
                    <option value="">بدون صف</option>
                    {grades.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                  </select>
                </td>
                <td>
                  <input type="text" value={form.badge} onChange={e => setForm({ ...form, badge: e.target.value })} placeholder="شارة الإتقان" className="input-sm" />
                </td>
                <td>—</td>
                <td>—</td>
                <td>
                  <button className="btn-success btn-sm" onClick={saveSubject} disabled={saving}>{saving ? '...' : '✓ حفظ'}</button>
                  <button className="btn-muted btn-sm" onClick={cancelEdit}>✕ إلغاء</button>
                </td>
              </tr>
            )}
            
            {subjects.map(subject => (
              <tr key={subject.key} className={!subject.published ? 'unpublished-row' : ''}>
                {editingKey === subject.key ? (
                  <>
                    <td>
                      <select value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} className="icon-select">
                        {ICONS.map(i => <option key={i} value={i}>{i}</option>)}
                      </select>
                    </td>
                    <td><code>{subject.key}</code></td>
                    <td><input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input-md" /></td>
                    <td>
                      <select value={form.grade_id} onChange={e => setForm({ ...form, grade_id: e.target.value })} className="input-sm">
                        <option value="">بدون صف</option>
                        {grades.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                      </select>
                    </td>
                    <td><input type="text" value={form.badge} onChange={e => setForm({ ...form, badge: e.target.value })} className="input-sm" /></td>
                    <td>—</td>
                    <td>—</td>
                    <td>
                      <button className="btn-success btn-sm" onClick={saveSubject} disabled={saving}>{saving ? '...' : '✓ حفظ'}</button>
                      <button className="btn-muted btn-sm" onClick={cancelEdit}>✕ إلغاء</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td><span className="subject-icon" style={{ background: subject.color }}>{subject.icon}</span></td>
                    <td><code>{subject.key}</code></td>
                    <td>{subject.title}</td>
                    <td>{grades.find(g => g.id === subject.grade_id)?.title || '—'}</td>
                    <td>{subject.badge || '—'}</td>
                    <td>
                      <Link to={`/admin/lessons?subject=${subject.key}`} className="lessons-link">
                        عرض الدروس →
                      </Link>
                    </td>
                    <td>
                      <button 
                        className={`badge ${subject.published ? 'badge-success' : 'badge-muted'}`}
                        onClick={() => togglePublished(subject)}
                      >
                        {subject.published ? '✓ منشور' : '○ مسودة'}
                      </button>
                    </td>
                    <td>
                      <button className="btn-icon" onClick={() => startEdit(subject)} title="تعديل">✏️</button>
                      <button className="btn-icon btn-danger" onClick={() => deleteSubject(subject)} title="حذف">🗑️</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {subjects.length === 0 && !editingKey && (
        <p className="empty-state">
          {selectedGrade 
            ? 'لا توجد مواد لهذا الصف. أضف مادة جديدة.'
            : 'لا توجد مواد. اختر صفاً وأضف مادة جديدة.'}
        </p>
      )}
    </div>
  );
}
