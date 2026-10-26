/**
 * LessonEditor — محرر الدرس الكامل
 * /admin/lesson/:id
 * تبويبات: أساسي | فيديو | PDF | أسئلة | بناء الكلمة
 */
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { logActivity } from '../../../lib/activityLog';
import FileUploader from './FileUploader';
import './CurriculumAdmin.css';

const TABS = [
  { id: 'basic', label: '📋 أساسي', icon: '📋' },
  { id: 'video', label: '🎬 فيديو', icon: '🎬' },
  { id: 'pdf', label: '📄 PDF', icon: '📄' },
  { id: 'quiz', label: '❓ أسئلة', icon: '❓' },
  { id: 'wordBuilder', label: '🔤 بناء الكلمة', icon: '🔤' },
  { id: 'parentGuide', label: '👨‍👩‍👧 دليل الأهل', icon: '👨‍👩‍👧' },
  { id: 'references', label: '📚 المراجع', icon: '📚' },
];

export default function LessonEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [lesson, setLesson] = useState(null);
  const [form, setForm] = useState({});
  const [subjects, setSubjects] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchSubjects();
    fetchLesson();
  }, [id]);

  async function fetchSubjects() {
    const { data } = await supabase
      .from('curriculum_subjects')
      .select('key, title, icon')
      .order('sort_order');
    setSubjects(data || []);
  }

  async function fetchLesson() {
    setLoading(true);
    const { data, error } = await supabase
      .from('curriculum_lessons')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      setError(error.message);
    } else if (data) {
      setLesson(data);
      // Merge content JSON into form
      const content = data.content || {};
      setForm({
        title: data.title || content.title || '',
        subject_key: data.subject_key || '',
        sort_order: data.sort_order || 0,
        published: data.published ?? true,
        // Video
        video_url: data.video_url || '',
        video_type: data.video_type || 'link',
        videoChapters: content.videoChapters || [],
        // PDF
        pdf_url: data.pdf_url || '',
        pdf_type: data.pdf_type || 'link',
        pdfTitle: content.pdfTitle || '',
        // Quiz
        quizType: content.quizType || 'choice',
        question: content.question || '',
        choices: content.choices || ['', '', '', ''],
        answer: content.answer ?? 0,
        celebration: content.celebration || '',
        // Arrange items
        arrangeItems: content.arrangeItems || [],
        // Word Builder
        wordBuilder: content.wordBuilder || null,
        // Parent Guide
        parentGuide: content.parentGuide || { title: '', sections: [] },
        // المراجع (كتب رسمية/مصادر الدرس)
        references: content.references || [],
        // Objective
        objective: content.objective || '',
      });
    }
    setLoading(false);
  }

  function updateForm(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }

  async function saveLesson() {
    setSaving(true);
    
    // Build content JSON
    const content = {
      title: form.title,
      objective: form.objective,
      videoChapters: form.videoChapters,
      pdfTitle: form.pdfTitle,
      quizType: form.quizType,
      question: form.question,
      choices: form.choices,
      answer: form.answer,
      arrangeItems: form.arrangeItems,
      celebration: form.celebration,
      wordBuilder: form.wordBuilder,
      parentGuide: form.parentGuide,
      references: form.references,
    };
    
    const { error } = await supabase
      .from('curriculum_lessons')
      .update({
        title: form.title,
        subject_key: form.subject_key,
        sort_order: form.sort_order,
        published: form.published,
        video_url: form.video_url || null,
        video_type: form.video_type,
        pdf_url: form.pdf_url || null,
        pdf_type: form.pdf_type,
        content,
      })
      .eq('id', id);
    
    if (error) {
      alert('خطأ في الحفظ: ' + error.message);
    } else {
      setHasChanges(false);
      alert('✓ تم الحفظ بنجاح');
    }
    
    setSaving(false);
  }

  if (loading) return <div className="curriculum-loading">جارٍ التحميل...</div>;
  if (error) return <div className="curriculum-error">خطأ: {error}</div>;
  if (!lesson) return <div className="curriculum-error">الدرس غير موجود</div>;

  const currentSubject = subjects.find(s => s.key === form.subject_key);

  return (
    <div className="lesson-editor">
      {/* Navigation Bar */}
      <nav className="curriculum-nav">
        <Link to="/admin/grades">الصفوف</Link>
        <span className="nav-arrow">→</span>
        <Link to="/admin/subjects">المواد</Link>
        <span className="nav-arrow">→</span>
        <Link to={`/admin/lessons?subject=${form.subject_key}`}>الدروس</Link>
        <span className="nav-arrow">→</span>
        <span className="nav-active">✏️ {form.title || id}</span>
      </nav>

      <div className="editor-header">
        <div className="editor-title">
          <h2>
            {currentSubject?.icon} تعديل: {form.title || id}
          </h2>
        </div>
        <div className="editor-actions">
          <button 
            className={`badge ${form.published ? 'badge-success' : 'badge-muted'}`}
            onClick={() => updateForm('published', !form.published)}
          >
            {form.published ? '✓ منشور' : '○ مسودة'}
          </button>
          <button 
            className="btn-primary"
            onClick={saveLesson}
            disabled={saving || !hasChanges}
          >
            {saving ? 'جارٍ الحفظ...' : hasChanges ? '💾 حفظ التغييرات' : '✓ محفوظ'}
          </button>
        </div>
      </div>

      <div className="editor-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="editor-content">
        {activeTab === 'basic' && (
          <BasicTab form={form} updateForm={updateForm} subjects={subjects} />
        )}
        {activeTab === 'video' && (
          <VideoTab form={form} updateForm={updateForm} lessonId={id} />
        )}
        {activeTab === 'pdf' && (
          <PdfTab form={form} updateForm={updateForm} lessonId={id} />
        )}
        {activeTab === 'quiz' && (
          <QuestionBankTab lessonId={id} form={form} updateForm={updateForm} />
        )}
        {activeTab === 'wordBuilder' && (
          <WordBuilderTab form={form} updateForm={updateForm} />
        )}
        {activeTab === 'parentGuide' && (
          <ParentGuideTab form={form} updateForm={updateForm} />
        )}
        {activeTab === 'references' && (
          <ReferencesTab form={form} updateForm={updateForm} />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// TAB COMPONENTS
// ============================================================================

function BasicTab({ form, updateForm, subjects }) {
  return (
    <div className="tab-panel">
      <div className="form-group">
        <label>عنوان الدرس *</label>
        <input
          type="text"
          value={form.title}
          onChange={e => updateForm('title', e.target.value)}
          placeholder="مثال: حرف الباء"
          className="input-lg"
        />
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label>المادة</label>
          <select
            value={form.subject_key}
            onChange={e => updateForm('subject_key', e.target.value)}
            className="input-md"
          >
            <option value="">اختر مادة...</option>
            {subjects.map(s => (
              <option key={s.key} value={s.key}>{s.icon} {s.title}</option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label>الترتيب</label>
          <input
            type="number"
            value={form.sort_order}
            onChange={e => updateForm('sort_order', parseInt(e.target.value) || 0)}
            className="input-sm"
          />
        </div>
      </div>

      <div className="form-group">
        <label>هدف الدرس</label>
        <textarea
          value={form.objective}
          onChange={e => updateForm('objective', e.target.value)}
          placeholder="ماذا سيتعلم الطفل في هذا الدرس؟"
          rows={3}
          className="input-lg"
        />
      </div>
    </div>
  );
}

function VideoTab({ form, updateForm, lessonId }) {
  return (
    <div className="tab-panel">
      <div className="form-group">
        <label>نوع الفيديو</label>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              checked={form.video_type === 'link'}
              onChange={() => updateForm('video_type', 'link')}
            />
            🔗 رابط خارجي (YouTube / Vimeo)
          </label>
          <label className="radio-label">
            <input
              type="radio"
              checked={form.video_type === 'upload'}
              onChange={() => updateForm('video_type', 'upload')}
            />
            📤 رفع ملف
          </label>
        </div>
      </div>

      {form.video_type === 'link' ? (
        <div className="form-group">
          <label>رابط الفيديو</label>
          <input
            type="url"
            value={form.video_url}
            onChange={e => updateForm('video_url', e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="input-lg"
            dir="ltr"
          />
          {form.video_url && form.video_url.includes('youtube') && (
            <div className="video-preview">
              <iframe
                src={form.video_url.replace('watch?v=', 'embed/')}
                title="معاينة الفيديو"
                frameBorder="0"
                allowFullScreen
              />
            </div>
          )}
        </div>
      ) : (
        <div className="form-group">
          <label>رفع ملف فيديو</label>
          <FileUploader
            type="video"
            currentUrl={form.video_url}
            onUpload={url => updateForm('video_url', url)}
            lessonId={lessonId}
          />
        </div>
      )}

      <div className="form-group">
        <label>فصول الفيديو (اختياري)</label>
        <VideoChaptersEditor
          chapters={form.videoChapters}
          onChange={chapters => updateForm('videoChapters', chapters)}
        />
      </div>
    </div>
  );
}

function VideoChaptersEditor({ chapters, onChange }) {
  function addChapter() {
    onChange([...chapters, { time: '0:00', title: '' }]);
  }
  
  function updateChapter(index, field, value) {
    const updated = [...chapters];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  }
  
  function removeChapter(index) {
    onChange(chapters.filter((_, i) => i !== index));
  }

  return (
    <div className="chapters-editor">
      {chapters.map((ch, i) => (
        <div key={i} className="chapter-row">
          <input
            type="text"
            value={ch.time}
            onChange={e => updateChapter(i, 'time', e.target.value)}
            placeholder="0:00"
            className="input-xs"
            dir="ltr"
          />
          <input
            type="text"
            value={ch.title}
            onChange={e => updateChapter(i, 'title', e.target.value)}
            placeholder="عنوان الفصل"
            className="input-md"
          />
          <button className="btn-icon btn-danger" onClick={() => removeChapter(i)}>✕</button>
        </div>
      ))}
      <button className="btn-muted btn-sm" onClick={addChapter}>+ إضافة فصل</button>
    </div>
  );
}

function PdfTab({ form, updateForm, lessonId }) {
  return (
    <div className="tab-panel">
      <div className="form-group">
        <label>عنوان ورقة العمل</label>
        <input
          type="text"
          value={form.pdfTitle}
          onChange={e => updateForm('pdfTitle', e.target.value)}
          placeholder="ورقة تدريب حرف الباء"
          className="input-lg"
        />
      </div>

      <div className="form-group">
        <label>نوع الملف</label>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              checked={form.pdf_type === 'link'}
              onChange={() => updateForm('pdf_type', 'link')}
            />
            🔗 رابط خارجي
          </label>
          <label className="radio-label">
            <input
              type="radio"
              checked={form.pdf_type === 'upload'}
              onChange={() => updateForm('pdf_type', 'upload')}
            />
            📤 رفع ملف
          </label>
        </div>
      </div>

      {form.pdf_type === 'link' ? (
        <div className="form-group">
          <label>رابط PDF</label>
          <input
            type="url"
            value={form.pdf_url}
            onChange={e => updateForm('pdf_url', e.target.value)}
            placeholder="https://drive.google.com/..."
            className="input-lg"
            dir="ltr"
          />
          {form.pdf_url && (
            <a href={form.pdf_url} target="_blank" rel="noopener noreferrer" className="preview-link">
              📄 معاينة الملف →
            </a>
          )}
        </div>
      ) : (
        <div className="form-group">
          <label>رفع ملف PDF</label>
          <FileUploader
            type="pdf"
            currentUrl={form.pdf_url}
            onUpload={url => updateForm('pdf_url', url)}
            lessonId={lessonId}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// بنك الأسئلة — أسئلة متعددة لكل درس تُدار من هنا (معلم/إدارة حسب RLS)
// ============================================================================

const QUIZ_TYPE_LABELS = { choice: '🔤 اختيار', truefalse: '✓✗ صح/خطأ', arrange: '🔀 ترتيب' };
const DIFFICULTY_LABELS = { easy: 'سهل', normal: 'متوسط', hard: 'صعب' };
const emptyDraft = () => ({ quiz_type: 'choice', question: '', choices: ['', '', '', ''], answer: 0, skill: '', difficulty: 'normal', celebration: '' });

function QuestionBankTab({ lessonId, form, updateForm }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!supabase || !lessonId) { setLoading(false); return; }
    setLoading(true);
    const { data, error: e } = await supabase
      .from('lesson_questions')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('sort_order');
    if (e) setError(e.message); else setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [lessonId]);

  const updateDraft = (k, v) => setDraft(d => ({ ...d, [k]: v }));
  const updateDraftChoice = (i, v) => setDraft(d => {
    const choices = [...d.choices]; choices[i] = v; return { ...d, choices };
  });

  const startEdit = (q) => setDraft({
    id: q.id,
    quiz_type: q.quiz_type,
    question: q.question,
    choices: q.quiz_type === 'truefalse' ? [] : (Array.isArray(q.choices) && q.choices.length ? [...q.choices] : ['', '', '', '']),
    answer: q.answer,
    skill: q.skill || '',
    difficulty: q.difficulty || 'normal',
    celebration: q.celebration || '',
  });

  const validateDraft = () => {
    if (!draft.question.trim()) return 'اكتب نص السؤال أولاً';
    if (draft.quiz_type === 'choice') {
      const filled = draft.choices.filter(c => c.trim());
      if (filled.length < 2) return 'أدخل خيارين على الأقل';
      if (typeof draft.answer !== 'number' || !draft.choices[draft.answer]?.trim()) return 'حدد الإجابة الصحيحة من الخيارات المعبأة';
    }
    if (draft.quiz_type === 'truefalse' && typeof draft.answer !== 'boolean') return 'حدد الإجابة: صح أم خطأ';
    if (draft.quiz_type === 'arrange' && draft.choices.filter(c => c.trim()).length < 2) return 'أدخل عنصرين على الأقل للترتيب';
    return '';
  };

  const saveDraft = async () => {
    const problem = validateDraft();
    if (problem) { setError(problem); return; }
    setSaving(true); setError('');
    const payload = {
      lesson_id: lessonId,
      quiz_type: draft.quiz_type,
      question: draft.question.trim(),
      choices: draft.quiz_type === 'truefalse' ? [] : draft.choices.map(c => c.trim()).filter(Boolean),
      answer: draft.answer,
      skill: draft.skill.trim() || null,
      difficulty: draft.difficulty,
      celebration: draft.celebration.trim() || null,
    };
    let result;
    if (draft.id) {
      result = await supabase.from('lesson_questions').update(payload).eq('id', draft.id).select().single();
    } else {
      result = await supabase.from('lesson_questions').insert({ ...payload, sort_order: items.length }).select().single();
    }
    setSaving(false);
    if (result.error) { setError(result.error.message); return; }
    logActivity(draft.id ? 'question.update' : 'question.create', 'lesson_question', result.data.id, {
      lesson_id: lessonId, question: payload.question.slice(0, 80),
    });
    setDraft(null);
    load();
  };

  const removeQuestion = async (q) => {
    if (!window.confirm(`حذف السؤال نهائياً؟\n«${q.question.slice(0, 60)}»`)) return;
    const { error: e } = await supabase.from('lesson_questions').delete().eq('id', q.id);
    if (e) { setError(e.message); return; }
    logActivity('question.delete', 'lesson_question', q.id, { lesson_id: lessonId, question: q.question.slice(0, 80) });
    load();
  };

  const copyLegacyToBank = async () => {
    if (!form.question?.trim()) return;
    setSaving(true); setError('');
    const { data, error: e } = await supabase.from('lesson_questions').insert({
      lesson_id: lessonId,
      quiz_type: form.quizType || 'choice',
      question: form.question.trim(),
      choices: (form.quizType || 'choice') === 'truefalse' ? [] : (form.choices || []).map(c => (c || '').trim()).filter(Boolean),
      answer: form.answer,
      sort_order: items.length,
    }).select().single();
    setSaving(false);
    if (e) { setError(e.message); return; }
    logActivity('question.create', 'lesson_question', data.id, { lesson_id: lessonId, question: form.question.slice(0, 80), source: 'legacy_copy' });
    load();
  };

  const chip = { fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: 'var(--blue-light)', color: 'var(--blue-text)', fontWeight: 700, whiteSpace: 'nowrap' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h4 style={{ margin: 0, color: 'var(--navy)' }}>🏦 بنك أسئلة الدرس ({items.length})</h4>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
            تظهر الأسئلة للطالب بالترتيب في تبويب الأسئلة — وحقل «المهارة» يبني تقرير نقاط الضعف لولي الأمر
          </span>
        </div>
        {!draft && (
          <button className="btn-secondary" style={{ padding: '7px 14px', fontSize: '13px' }} onClick={() => setDraft(emptyDraft())}>
            + إضافة سؤال
          </button>
        )}
      </div>

      {error && (
        <div style={{ background: 'var(--yellow-light)', border: '1px solid var(--yellow)', borderRadius: '8px', padding: '8px 12px', fontSize: '12.5px', marginBottom: '10px' }}>
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div style={{ color: 'var(--muted)', fontSize: '13px', padding: '16px' }}>جارٍ تحميل الأسئلة...</div>
      ) : items.length === 0 && !draft ? (
        <div style={{ textAlign: 'center', padding: '24px', border: '1px dashed var(--line)', borderRadius: '12px', color: 'var(--muted)', marginBottom: '12px' }}>
          <div style={{ fontSize: '24px', marginBottom: '6px' }}>❓</div>
          <div style={{ fontSize: '13px' }}>لا توجد أسئلة في البنك بعد — أضف أول سؤال</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
          {items.map((q, idx) => (
            <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', border: '1px solid var(--line)', borderRadius: '10px', background: 'var(--bg)' }}>
              <span style={{ fontWeight: 800, color: 'var(--muted)', fontSize: '12px', flexShrink: 0 }}>{idx + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.question}</div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                  <span style={chip}>{QUIZ_TYPE_LABELS[q.quiz_type] || q.quiz_type}</span>
                  <span style={chip}>{DIFFICULTY_LABELS[q.difficulty] || q.difficulty}</span>
                  {q.skill && <span style={{ ...chip, background: 'var(--yellow-light)', color: 'var(--orange-text)' }}>🎯 {q.skill}</span>}
                </div>
              </div>
              <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px', flexShrink: 0 }} onClick={() => startEdit(q)}>✏️ تعديل</button>
              <button style={{ padding: '4px 10px', fontSize: '12px', flexShrink: 0, background: 'transparent', border: '1px solid var(--line)', borderRadius: '8px', color: 'var(--muted)', cursor: 'pointer' }} onClick={() => removeQuestion(q)}>🗑</button>
            </div>
          ))}
        </div>
      )}

      {draft && (
        <div style={{ border: '2px solid var(--blue)', borderRadius: '12px', padding: '16px', marginBottom: '14px', background: 'var(--card-bg)' }}>
          <h5 style={{ margin: '0 0 12px', color: 'var(--navy)' }}>{draft.id ? '✏️ تعديل السؤال' : '➕ سؤال جديد'}</h5>

          <div className="form-group">
            <label>نوع السؤال</label>
            <select className="input-md" value={draft.quiz_type} onChange={e => {
              const t = e.target.value;
              setDraft(d => ({ ...d, quiz_type: t, answer: t === 'truefalse' ? true : t === 'choice' ? 0 : (d.choices || []), choices: t === 'truefalse' ? [] : (d.choices?.length ? d.choices : ['', '', '', '']) }));
            }}>
              <option value="choice">اختيار من متعدد</option>
              <option value="truefalse">صح / خطأ</option>
              <option value="arrange">ترتيب عناصر</option>
            </select>
          </div>

          <div className="form-group">
            <label>نص السؤال *</label>
            <textarea className="input-md" rows={2} value={draft.question} onChange={e => updateDraft('question', e.target.value)} placeholder="مثال: ما الحرف الأول في كلمة «باب»؟" />
          </div>

          {draft.quiz_type === 'choice' && (
            <div className="form-group">
              <label>الخيارات (حدد الصحيح ✓)</label>
              {draft.choices.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                  <input type="radio" name="bank-correct" checked={draft.answer === i} onChange={() => updateDraft('answer', i)} />
                  <input className="input-md" style={{ flex: 1 }} value={c} onChange={e => updateDraftChoice(i, e.target.value)} placeholder={`الخيار ${i + 1}`} />
                </div>
              ))}
            </div>
          )}

          {draft.quiz_type === 'truefalse' && (
            <div className="form-group">
              <label>الإجابة الصحيحة</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <label style={{ display: 'flex', gap: '6px', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="radio" name="bank-tf" checked={draft.answer === true} onChange={() => updateDraft('answer', true)} /> ✓ صح
                </label>
                <label style={{ display: 'flex', gap: '6px', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="radio" name="bank-tf" checked={draft.answer === false} onChange={() => updateDraft('answer', false)} /> ✕ خطأ
                </label>
              </div>
            </div>
          )}

          {draft.quiz_type === 'arrange' && (
            <div className="form-group">
              <label>العناصر بالترتيب الصحيح (سطر لكل عنصر)</label>
              <textarea className="input-md" rows={4} value={draft.choices.join('\n')} onChange={e => updateDraft('choices', e.target.value.split('\n'))} placeholder={'الأول\nالثاني\nالثالث'} />
              <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>⚠️ أسئلة الترتيب تُحفظ في البنك لكنها لا تُعرض في مشغّل الطفل بعد</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label>المهارة (لتقرير ولي الأمر)</label>
              <input className="input-md" value={draft.skill} onChange={e => updateDraft('skill', e.target.value)} placeholder="مثال: التمييز الصوتي" />
            </div>
            <div className="form-group">
              <label>الصعوبة</label>
              <select className="input-md" value={draft.difficulty} onChange={e => updateDraft('difficulty', e.target.value)}>
                <option value="easy">سهل</option>
                <option value="normal">متوسط</option>
                <option value="hard">صعب</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>رسالة التشجيع عند الإجابة الصحيحة (اختياري)</label>
            <input className="input-md" value={draft.celebration} onChange={e => updateDraft('celebration', e.target.value)} placeholder="ممتاز! لاحظت الفرق بسرعة 🌟" />
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button className="btn-secondary" style={{ padding: '8px 18px', fontWeight: 700 }} disabled={saving} onClick={saveDraft}>
              {saving ? 'جارٍ الحفظ...' : draft.id ? 'حفظ التعديل ✓' : 'إضافة للبنك ✓'}
            </button>
            <button style={{ padding: '8px 14px', background: 'transparent', border: '1px solid var(--line)', borderRadius: '8px', color: 'var(--muted)', cursor: 'pointer' }} onClick={() => { setDraft(null); setError(''); }}>
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* النظام القديم: سؤال واحد داخل بيانات الدرس — يبقى احتياطاً حتى يمتلئ البنك */}
      <details style={{ border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 14px' }}>
        <summary style={{ cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: 'var(--muted)' }}>
          📜 السؤال القديم (نظام السؤال الواحد){form.question?.trim() ? ' — يوجد سؤال محفوظ' : ' — فارغ'}
        </summary>
        <div style={{ marginTop: '10px' }}>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '10px' }}>
            يظهر هذا السؤال للطالب فقط إذا كان البنك فارغاً. عند وجود أسئلة في البنك يتجاهله المشغّل.
          </p>
          {form.question?.trim() && (
            <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', marginBottom: '10px' }} disabled={saving} onClick={copyLegacyToBank}>
              ⬆ انسخه إلى البنك
            </button>
          )}
          <QuizTab form={form} updateForm={updateForm} />
        </div>
      </details>
    </div>
  );
}

function QuizTab({ form, updateForm }) {
  function updateChoice(index, value) {
    const updated = [...form.choices];
    updated[index] = value;
    updateForm('choices', updated);
  }

  return (
    <div className="tab-panel">
      <div className="form-group">
        <label>نوع السؤال</label>
        <select
          value={form.quizType}
          onChange={e => updateForm('quizType', e.target.value)}
          className="input-md"
        >
          <option value="choice">اختيار من متعدد</option>
          <option value="truefalse">صح أو خطأ</option>
          <option value="arrange">ترتيب</option>
        </select>
      </div>

      <div className="form-group">
        <label>نص السؤال</label>
        <textarea
          value={form.question}
          onChange={e => updateForm('question', e.target.value)}
          placeholder="مثال: ما هو الحرف الذي يبدأ به اسم (بطة)؟"
          rows={2}
          className="input-lg"
        />
      </div>

      {form.quizType === 'choice' && (
        <div className="form-group">
          <label>الخيارات (4 خيارات)</label>
          <div className="choices-editor">
            {form.choices.map((choice, i) => (
              <div key={i} className="choice-row">
                <label className="choice-radio">
                  <input
                    type="radio"
                    checked={form.answer === i}
                    onChange={() => updateForm('answer', i)}
                  />
                  {form.answer === i && '✓'}
                </label>
                <input
                  type="text"
                  value={choice}
                  onChange={e => updateChoice(i, e.target.value)}
                  placeholder={`الخيار ${i + 1}`}
                  className={`input-md ${form.answer === i ? 'correct-choice' : ''}`}
                />
              </div>
            ))}
          </div>
          <small className="hint">اختر الإجابة الصحيحة بالضغط على الدائرة</small>
        </div>
      )}

      {form.quizType === 'truefalse' && (
        <div className="form-group">
          <label>الإجابة الصحيحة</label>
          <div className="truefalse-options">
            <label className={`tf-option ${form.answer === true ? 'selected' : ''}`}>
              <input
                type="radio"
                checked={form.answer === true}
                onChange={() => updateForm('answer', true)}
              />
              ✓ صح
            </label>
            <label className={`tf-option ${form.answer === false ? 'selected' : ''}`}>
              <input
                type="radio"
                checked={form.answer === false}
                onChange={() => updateForm('answer', false)}
              />
              ✕ خطأ
            </label>
          </div>
        </div>
      )}

      {form.quizType === 'arrange' && (
        <div className="form-group">
          <label>عناصر الترتيب (بالترتيب الصحيح)</label>
          <ArrangeEditor
            items={form.arrangeItems || []}
            onChange={items => updateForm('arrangeItems', items)}
          />
          <small className="hint">أضف العناصر بالترتيب الصحيح، وستُخلط عند العرض للطفل</small>
        </div>
      )}

      <div className="form-group">
        <label>رسالة التهنئة (اختياري)</label>
        <input
          type="text"
          value={form.celebration}
          onChange={e => updateForm('celebration', e.target.value)}
          placeholder="أحسنت! 🎉"
          className="input-md"
        />
      </div>
    </div>
  );
}

function WordBuilderTab({ form, updateForm }) {
  const wb = form.wordBuilder || { segments: [], correctOrder: [] };

  function updateWordBuilder(field, value) {
    updateForm('wordBuilder', { ...wb, [field]: value });
  }

  function parseSegments(text) {
    const segments = text.split(',').map(s => s.trim()).filter(Boolean);
    updateWordBuilder('segments', segments);
  }

  function parseOrder(text) {
    const order = text.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    updateWordBuilder('correctOrder', order);
  }

  return (
    <div className="tab-panel">
      <div className="info-box">
        💡 تحدي بناء الكلمة: يظهر للطفل مقاطع مبعثرة ويجب ترتيبها لتكوين الكلمة الصحيحة.
      </div>

      <div className="form-group">
        <label>المقاطع (مفصولة بفاصلة)</label>
        <input
          type="text"
          value={wb.segments?.join(', ') || ''}
          onChange={e => parseSegments(e.target.value)}
          placeholder="مثال: بَ, طَّ, ة"
          className="input-lg"
        />
      </div>

      <div className="form-group">
        <label>الترتيب الصحيح (أرقام مفصولة بفاصلة، تبدأ من 0)</label>
        <input
          type="text"
          value={wb.correctOrder?.join(', ') || ''}
          onChange={e => parseOrder(e.target.value)}
          placeholder="مثال: 0, 1, 2"
          className="input-md"
          dir="ltr"
        />
      </div>

      {wb.segments?.length > 0 && (
        <div className="word-preview">
          <strong>معاينة:</strong>
          <div className="segments-preview">
            {wb.segments.map((seg, i) => (
              <span key={i} className="segment-chip">{seg}</span>
            ))}
          </div>
          {wb.correctOrder?.length > 0 && (
            <div className="correct-word">
              الكلمة: {wb.correctOrder.map(i => wb.segments[i]).join('')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ParentGuideTab({ form, updateForm }) {
  const guide = form.parentGuide || { title: '', sections: [] };

  function updateGuide(field, value) {
    updateForm('parentGuide', { ...guide, [field]: value });
  }

  function addSection() {
    updateGuide('sections', [...guide.sections, { heading: '', content: '' }]);
  }

  function updateSection(index, field, value) {
    const updated = [...guide.sections];
    updated[index] = { ...updated[index], [field]: value };
    updateGuide('sections', updated);
  }

  function removeSection(index) {
    updateGuide('sections', guide.sections.filter((_, i) => i !== index));
  }

  return (
    <div className="tab-panel">
      <div className="info-box">
        👨‍👩‍👧 دليل الأهل: نصائح وإرشادات تظهر للوالدين لمساعدة طفلهم في الدرس.
      </div>

      <div className="form-group">
        <label>عنوان الدليل</label>
        <input
          type="text"
          value={guide.title}
          onChange={e => updateGuide('title', e.target.value)}
          placeholder="كيف أساعد طفلي في تعلم حرف الباء؟"
          className="input-lg"
        />
      </div>

      <div className="form-group">
        <label>الأقسام</label>
        {guide.sections.map((section, i) => (
          <div key={i} className="section-editor">
            <input
              type="text"
              value={section.heading}
              onChange={e => updateSection(i, 'heading', e.target.value)}
              placeholder="عنوان القسم"
              className="input-md"
            />
            <textarea
              value={section.content}
              onChange={e => updateSection(i, 'content', e.target.value)}
              placeholder="المحتوى..."
              rows={3}
              className="input-lg"
            />
            <button className="btn-icon btn-danger" onClick={() => removeSection(i)}>
              🗑️ حذف القسم
            </button>
          </div>
        ))}
        <button className="btn-muted btn-sm" onClick={addSection}>
          + إضافة قسم
        </button>
      </div>
    </div>
  );
}

function ReferencesTab({ form, updateForm }) {
  const refs = form.references || [];

  function updateRefs(next) {
    updateForm('references', next);
  }

  function updateRef(index, field, value) {
    const updated = [...refs];
    updated[index] = { ...updated[index], [field]: value };
    updateRefs(updated);
  }

  return (
    <div className="tab-panel">
      <div className="info-box">
        📚 مراجع الدرس: الكتاب الرسمي أو المصدر الذي يستند إليه الدرس — تظهر لولي الأمر في تبويب دليل الأهل.
        لا تضف إلا مصادر حقيقية نملك حق الربط إليها (كتب الوزارة الرسمية).
      </div>

      {refs.map((r, i) => (
        <div key={i} className="section-editor">
          <input
            type="text"
            value={r.title || ''}
            onChange={e => updateRef(i, 'title', e.target.value)}
            placeholder="اسم المرجع (مثال: كتاب الوزارة — لغة عربية، الصف الأول، ترم أول)"
            className="input-lg"
          />
          <div className="form-row">
            <input
              type="text"
              value={r.source || ''}
              onChange={e => updateRef(i, 'source', e.target.value)}
              placeholder="الجهة (مثال: وزارة التربية والتعليم المصرية)"
              className="input-md"
            />
            <input
              type="url"
              dir="ltr"
              value={r.url || ''}
              onChange={e => updateRef(i, 'url', e.target.value)}
              placeholder="https://رابط المصدر الرسمي (اختياري)"
              className="input-md"
            />
          </div>
          <input
            type="text"
            value={r.note || ''}
            onChange={e => updateRef(i, 'note', e.target.value)}
            placeholder="ملاحظة (مثال: طبعة العام الدراسي 2025/2026)"
            className="input-lg"
          />
          <button className="btn-icon btn-danger" onClick={() => updateRefs(refs.filter((_, idx) => idx !== i))}>
            🗑️ حذف المرجع
          </button>
        </div>
      ))}
      <button className="btn-muted btn-sm" onClick={() => updateRefs([...refs, { title: '', source: '', url: '', note: '' }])}>
        + إضافة مرجع
      </button>
    </div>
  );
}

// ArrangeEditor للترتيب
function ArrangeEditor({ items, onChange }) {
  function addItem() {
    onChange([...items, '']);
  }

  function updateItem(index, value) {
    const updated = [...items];
    updated[index] = value;
    onChange(updated);
  }

  function removeItem(index) {
    onChange(items.filter((_, i) => i !== index));
  }

  function moveItem(from, to) {
    if (to < 0 || to >= items.length) return;
    const updated = [...items];
    const [item] = updated.splice(from, 1);
    updated.splice(to, 0, item);
    onChange(updated);
  }

  return (
    <div className="arrange-editor">
      {items.map((item, i) => (
        <div key={i} className="arrange-item">
          <span className="arrange-number">{i + 1}</span>
          <input
            type="text"
            value={item}
            onChange={e => updateItem(i, e.target.value)}
            placeholder={`العنصر ${i + 1}`}
            className="input-md"
          />
          <div className="arrange-controls">
            <button 
              type="button" 
              className="btn-icon" 
              onClick={() => moveItem(i, i - 1)}
              disabled={i === 0}
              title="تحريك للأعلى"
            >
              ⬆️
            </button>
            <button 
              type="button" 
              className="btn-icon" 
              onClick={() => moveItem(i, i + 1)}
              disabled={i === items.length - 1}
              title="تحريك للأسفل"
            >
              ⬇️
            </button>
            <button 
              type="button" 
              className="btn-icon btn-danger" 
              onClick={() => removeItem(i)}
              title="حذف"
            >
              🗑️
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="btn-muted btn-sm" onClick={addItem}>
        + إضافة عنصر
      </button>
    </div>
  );
}
