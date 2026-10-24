/**
 * GradesPanel — إدارة الصفوف الدراسية
 * /admin/grades
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import './CurriculumAdmin.css';

const STAGES = [
  { id: 'kg', label: 'رياض الأطفال' },
  { id: 'primary', label: 'ابتدائي' },
  { id: 'preparatory', label: 'إعدادي' },
  { id: 'secondary', label: 'ثانوي' },
];

export default function GradesPanel() {
  const [grades, setGrades] = useState([]);
  const [subjectCounts, setSubjectCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ id: '', title: '', stage: 'primary', sort_order: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchGrades();
    fetchSubjectCounts();
  }, []);

  async function fetchGrades() {
    setLoading(true);
    const { data, error } = await supabase
      .from('grades')
      .select('*')
      .order('sort_order', { ascending: true });
    
    if (error) {
      setError(error.message);
    } else {
      setGrades(data || []);
    }
    setLoading(false);
  }

  async function fetchSubjectCounts() {
    const { data } = await supabase
      .from('curriculum_subjects')
      .select('grade_id');
    
    if (data) {
      const counts = {};
      data.forEach(s => {
        counts[s.grade_id] = (counts[s.grade_id] || 0) + 1;
      });
      setSubjectCounts(counts);
    }
  }

  function startEdit(grade) {
    setEditingId(grade.id);
    setForm({
      id: grade.id,
      title: grade.title,
      stage: grade.stage,
      sort_order: grade.sort_order,
    });
  }

  function startNew() {
    const maxOrder = Math.max(0, ...grades.map(g => g.sort_order));
    setEditingId('__new__');
    setForm({
      id: '',
      title: '',
      stage: 'primary',
      sort_order: maxOrder + 1,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ id: '', title: '', stage: 'primary', sort_order: 0 });
  }

  async function saveGrade() {
    if (!form.id.trim() || !form.title.trim()) {
      alert('المعرّف والعنوان مطلوبان');
      return;
    }

    setSaving(true);
    
    if (editingId === '__new__') {
      const { error } = await supabase
        .from('grades')
        .insert([{
          id: form.id.trim(),
          title: form.title.trim(),
          stage: form.stage,
          sort_order: form.sort_order,
          published: true,
        }]);
      
      if (error) {
        alert('خطأ: ' + error.message);
      } else {
        await fetchGrades();
        cancelEdit();
      }
    } else {
      const { error } = await supabase
        .from('grades')
        .update({
          title: form.title.trim(),
          stage: form.stage,
          sort_order: form.sort_order,
        })
        .eq('id', editingId);
      
      if (error) {
        alert('خطأ: ' + error.message);
      } else {
        await fetchGrades();
        cancelEdit();
      }
    }
    
    setSaving(false);
  }

  async function togglePublished(grade) {
    const { error } = await supabase
      .from('grades')
      .update({ published: !grade.published })
      .eq('id', grade.id);
    
    if (!error) {
      setGrades(grades.map(g => 
        g.id === grade.id ? { ...g, published: !g.published } : g
      ));
    }
  }

  async function deleteGrade(grade) {
    if (!confirm(`حذف "${grade.title}"؟ سيؤثر على المواد المرتبطة.`)) return;
    
    const { error } = await supabase
      .from('grades')
      .delete()
      .eq('id', grade.id);
    
    if (error) {
      alert('خطأ: ' + error.message);
    } else {
      setGrades(grades.filter(g => g.id !== grade.id));
    }
  }

  if (loading) return <div className="curriculum-loading">جارٍ التحميل...</div>;
  if (error) return <div className="curriculum-error">خطأ: {error}</div>;

  return (
    <div className="curriculum-panel">
      {/* Navigation Bar */}
      <nav className="curriculum-nav">
        <span className="nav-active">📚 الصفوف</span>
        <span className="nav-arrow">→</span>
        <Link to="/admin/subjects">المواد</Link>
        <span className="nav-arrow">→</span>
        <Link to="/admin/lessons">الدروس</Link>
      </nav>

      <div className="curriculum-header">
        <h2>📚 إدارة الصفوف الدراسية</h2>
        <button className="btn-primary" onClick={startNew}>
          + إضافة صف
        </button>
      </div>

      <div className="curriculum-table-wrapper">
        <table className="curriculum-table">
          <thead>
            <tr>
              <th>المعرّف</th>
              <th>العنوان</th>
              <th>المرحلة</th>
              <th>الترتيب</th>
              <th>المواد</th>
              <th>الحالة</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {editingId === '__new__' && (
              <tr className="editing-row">
                <td>
                  <input
                    type="text"
                    value={form.id}
                    onChange={e => setForm({ ...form, id: e.target.value })}
                    placeholder="مثال: g7"
                    className="input-sm"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="الصف السابع"
                    className="input-md"
                  />
                </td>
                <td>
                  <select
                    value={form.stage}
                    onChange={e => setForm({ ...form, stage: e.target.value })}
                    className="input-sm"
                  >
                    {STAGES.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                    className="input-xs"
                  />
                </td>
                <td>—</td>
                <td>
                  <button className="btn-success btn-sm" onClick={saveGrade} disabled={saving}>
                    {saving ? '...' : '✓ حفظ'}
                  </button>
                  <button className="btn-muted btn-sm" onClick={cancelEdit}>
                    ✕ إلغاء
                  </button>
                </td>
              </tr>
            )}
            
            {grades.map(grade => (
              <tr key={grade.id} className={!grade.published ? 'unpublished-row' : ''}>
                {editingId === grade.id ? (
                  <>
                    <td><code>{grade.id}</code></td>
                    <td>
                      <input
                        type="text"
                        value={form.title}
                        onChange={e => setForm({ ...form, title: e.target.value })}
                        className="input-md"
                      />
                    </td>
                    <td>
                      <select
                        value={form.stage}
                        onChange={e => setForm({ ...form, stage: e.target.value })}
                        className="input-sm"
                      >
                        {STAGES.map(s => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        value={form.sort_order}
                        onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                        className="input-xs"
                      />
                    </td>
                    <td>—</td>
                    <td>
                      <button className="btn-success btn-sm" onClick={saveGrade} disabled={saving}>
                        {saving ? '...' : '✓ حفظ'}
                      </button>
                      <button className="btn-muted btn-sm" onClick={cancelEdit}>
                        ✕ إلغاء
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td><code>{grade.id}</code></td>
                    <td>{grade.title}</td>
                    <td>{STAGES.find(s => s.id === grade.stage)?.label || grade.stage}</td>
                    <td>{grade.sort_order}</td>
                    <td>
                      <Link to={`/admin/subjects?grade=${grade.id}`} className="lessons-link">
                        {subjectCounts[grade.id] || 0} مادة →
                      </Link>
                    </td>
                    <td>
                      <button 
                        className={`badge ${grade.published ? 'badge-success' : 'badge-muted'}`}
                        onClick={() => togglePublished(grade)}
                        title={grade.published ? 'انقر لإخفاء' : 'انقر للنشر'}
                      >
                        {grade.published ? '✓ منشور' : '○ مسودة'}
                      </button>
                    </td>
                    <td>
                      <button className="btn-icon" onClick={() => startEdit(grade)} title="تعديل">
                        ✏️
                      </button>
                      <button className="btn-icon btn-danger" onClick={() => deleteGrade(grade)} title="حذف">
                        🗑️
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {grades.length === 0 && !editingId && (
        <p className="empty-state">لا توجد صفوف دراسية. أضف صفاً جديداً للبدء.</p>
      )}
    </div>
  );
}
