/**
 * GradesPanel — إدارة الصفوف الدراسية
 * /admin/grades
 */
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { loadGradeSubjectCounts } from '../../../lib/gradeSubjectCounts';
import { buildGradeManagementRows, filterGradeManagementRows, summarizeGradeManagement } from '../../../lib/gradeManagement';
import './CurriculumAdmin.css';
import Emoji from '../../../ui/Emoji';

const STAGES = [
  { id: 'kg', label: 'رياض الأطفال' },
  { id: 'primary', label: 'ابتدائي' },
  { id: 'preparatory', label: 'إعدادي' },
  { id: 'secondary', label: 'ثانوي' },
];

export default function GradesPanel() {
  const [grades, setGrades] = useState([]);
  const [subjectCounts, setSubjectCounts] = useState(null);
  const [subjectCountsError, setSubjectCountsError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ id: '', title: '', stage: 'primary', sort_order: 0 });
  const [saving, setSaving] = useState(false);
  const [gradeQuery, setGradeQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [publicationFilter, setPublicationFilter] = useState('all');

  useEffect(() => {
    fetchGrades();
    fetchSubjectCounts();
  }, []);

  async function fetchGrades() {
    setLoading(true);
    setError(null);
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
    const result = await loadGradeSubjectCounts(supabase);
    if (result.status === 'error') {
      setSubjectCountsError(result.message);
      setSubjectCounts(null);
      return;
    }
    setSubjectCounts(result.counts);
    setSubjectCountsError(null);
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
    const impact = grade.subjectCount === null
      ? 'لم يتأكد عدد المواد المرتبطة؛ قد يؤدي الحذف إلى فك ارتباط مواد بهذا الصف.'
      : grade.subjectCount > 0
        ? `سيؤدي الحذف إلى فك ارتباط ${grade.subjectCount} مادة مرتبطة بهذا الصف.`
        : 'لا توجد مواد مرتبطة بهذا الصف بحسب آخر تحميل.';
    if (!confirm(`حذف "${grade.title}"؟\n${impact}`)) return;
    
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

  const gradeRows = useMemo(() => buildGradeManagementRows(grades, subjectCounts), [grades, subjectCounts]);
  const visibleGrades = useMemo(
    () => filterGradeManagementRows(gradeRows, {
      query: gradeQuery,
      stage: stageFilter,
      publication: publicationFilter,
    }),
    [gradeRows, gradeQuery, stageFilter, publicationFilter],
  );
  const summary = useMemo(() => summarizeGradeManagement(gradeRows), [gradeRows]);

  if (loading) return <div className="curriculum-loading">جارٍ التحميل...</div>;
  if (error) return (
    <div className="curriculum-error" role="alert">
      <p>تعذّر تحميل الصفوف: {error}</p>
      <button className="btn-primary" onClick={fetchGrades}>إعادة المحاولة</button>
    </div>
  );

  return (
    <div className="curriculum-panel gm-panel">
      <nav className="curriculum-nav" aria-label="مسار إدارة المناهج">
        <span className="nav-active"><Emoji>📚</Emoji> الصفوف</span>
        <span className="nav-arrow">→</span>
        <Link to="/admin/subjects">المواد</Link>
        <span className="nav-arrow">→</span>
        <Link to="/admin/lessons">الدروس</Link>
      </nav>

      <div className="curriculum-header gm-header">
        <div>
          <h2><Emoji>📚</Emoji> إدارة الصفوف الدراسية</h2>
          <p>ابحث عن الصفوف، راجع المواد المرتبطة، وعدّل الحالة من بطاقة الصف.</p>
        </div>
        <button className="btn-primary" onClick={startNew}>
          + إضافة صف
        </button>
      </div>

      <section className="gm-summary" aria-label="ملخص الصفوف الدراسية">
        <article className="gm-summary-card">
          <span>الصفوف الدراسية</span>
          <strong>{summary.gradeCount}</strong>
          <small>إجمالي الصفوف</small>
        </article>
        <article className="gm-summary-card">
          <span>المراحل</span>
          <strong>{summary.stageCount}</strong>
          <small>مراحل لديها صفوف</small>
        </article>
        <article className="gm-summary-card">
          <span>حالة النشر</span>
          <strong>{summary.publishedCount}</strong>
          <small>صف منشور</small>
        </article>
        <article className="gm-summary-card gm-summary-accent">
          <span>إسنادات المواد</span>
          <strong>{summary.subjectCount ?? '—'}</strong>
          <small>{subjectCountsError ? 'تعذر تحميل الأعداد' : subjectCounts === null ? 'جارٍ تحميل الأعداد…' : 'مادة مرتبطة بالصفوف'}</small>
        </article>
      </section>

      <section className="gm-toolbar" aria-label="البحث والتصفية">
        <label className="gm-search">
          <span>بحث</span>
          <input
            type="search"
            value={gradeQuery}
            onChange={event => setGradeQuery(event.target.value)}
            placeholder="ابحث باسم الصف أو معرّفه…"
          />
        </label>
        <label className="gm-filter">
          <span>المرحلة</span>
          <select value={stageFilter} onChange={event => setStageFilter(event.target.value)}>
            <option value="all">كل المراحل</option>
            {STAGES.map(stage => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
          </select>
        </label>
        <label className="gm-filter">
          <span>النشر</span>
          <select value={publicationFilter} onChange={event => setPublicationFilter(event.target.value)}>
            <option value="all">كل الحالات</option>
            <option value="published">منشور</option>
            <option value="draft">مسودة</option>
          </select>
        </label>
        <span className="gm-result-count" aria-live="polite">{visibleGrades.length} من {grades.length} صف</span>
      </section>

      {editingId && (
        <section className="gm-form-card" aria-labelledby="gm-form-title">
          <div className="gm-form-heading">
            <div>
              <span className="gm-eyebrow">بيانات الصف</span>
              <h3 id="gm-form-title">{editingId === '__new__' ? 'إضافة صف دراسي' : `تعديل ${form.title}`}</h3>
            </div>
            <button type="button" className="btn-muted btn-sm" onClick={cancelEdit}>إغلاق</button>
          </div>
          <div className="gm-form-grid">
            <label>
              <span>المعرّف</span>
              <input
                type="text"
                value={form.id}
                onChange={event => setForm({ ...form, id: event.target.value })}
                placeholder="مثال: g7"
                disabled={editingId !== '__new__'}
                autoComplete="off"
              />
            </label>
            <label>
              <span>اسم الصف</span>
              <input
                type="text"
                value={form.title}
                onChange={event => setForm({ ...form, title: event.target.value })}
                placeholder="مثال: الصف السابع"
              />
            </label>
            <label>
              <span>المرحلة الدراسية</span>
              <select value={form.stage} onChange={event => setForm({ ...form, stage: event.target.value })}>
                {STAGES.map(stage => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
              </select>
            </label>
            <label>
              <span>ترتيب العرض</span>
              <input
                type="number"
                value={form.sort_order}
                onChange={event => setForm({ ...form, sort_order: parseInt(event.target.value, 10) || 0 })}
              />
            </label>
          </div>
          <div className="gm-form-actions">
            <button className="btn-primary" onClick={saveGrade} disabled={saving}>
              {saving ? 'جارٍ الحفظ…' : '✓ حفظ التغييرات'}
            </button>
            <button className="btn-muted" onClick={cancelEdit} disabled={saving}>إلغاء</button>
          </div>
        </section>
      )}

      {subjectCountsError && (
        <div className="gm-inline-notice" role="status">
          تعذّر تحميل أعداد المواد: {subjectCountsError}
          <button type="button" onClick={fetchSubjectCounts}>إعادة المحاولة</button>
        </div>
      )}

      {grades.length === 0 ? (
        <div className="gm-empty-state">
          <span aria-hidden="true"><Emoji>📚</Emoji></span>
          <h3>لا توجد صفوف دراسية بعد</h3>
          <p>أضف الصف الأول لبدء تنظيم المواد والدروس.</p>
          {!editingId && <button className="btn-primary" onClick={startNew}>+ إضافة أول صف</button>}
        </div>
      ) : visibleGrades.length === 0 ? (
        <div className="gm-empty-state">
          <span aria-hidden="true"><Emoji>🔎</Emoji></span>
          <h3>لا توجد نتائج مطابقة</h3>
          <p>جرّب تغيير عبارة البحث أو خيارات التصفية.</p>
          <button type="button" className="btn-muted" onClick={() => {
            setGradeQuery('');
            setStageFilter('all');
            setPublicationFilter('all');
          }}>مسح البحث والتصفية</button>
        </div>
      ) : (
        <div className="gm-grid">
          {visibleGrades.map(grade => {
            const stageLabel = STAGES.find(stage => stage.id === grade.stage)?.label || grade.stage;
            const subjectLabel = subjectCountsError
              ? 'تعذّر تحميل العدد'
              : grade.subjectCount === null ? 'جارٍ التحميل…' : `${grade.subjectCount} مادة`;

            return (
              <article className={`gm-grade-card ${grade.published ? '' : 'is-draft'}`} key={grade.id}>
                <div className="gm-card-topline">
                  <code>{grade.id}</code>
                  <button
                    type="button"
                    className={`badge ${grade.published ? 'badge-success' : 'badge-muted'}`}
                    onClick={() => togglePublished(grade)}
                    title={grade.published ? 'انقر لإخفاء الصف' : 'انقر لنشر الصف'}
                    aria-label={`${grade.published ? 'إلغاء نشر' : 'نشر'} ${grade.title}`}
                  >
                    {grade.published ? '✓ منشور' : '○ مسودة'}
                  </button>
                </div>
                <h3>{grade.title}</h3>
                <div className="gm-card-meta">
                  <span>{stageLabel}</span>
                  <span>ترتيب العرض: {grade.sort_order}</span>
                </div>
                <Link to={`/admin/subjects?grade=${encodeURIComponent(grade.id)}`} className="gm-subject-link">
                  <span>المواد المرتبطة</span>
                  <strong>{subjectLabel} <span aria-hidden="true">←</span></strong>
                </Link>
                <div className="gm-card-actions">
                  <button type="button" className="btn-muted btn-sm" onClick={() => startEdit(grade)}>
                    ✏️ تعديل الصف
                  </button>
                  <button type="button" className="btn-icon btn-danger" onClick={() => deleteGrade(grade)} title="حذف الصف" aria-label={`حذف ${grade.title}`}>
                    🗑️
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
