/**
 * LessonEditor — محرر الدرس الكامل
 * /admin/lesson/:id
 * تبويبات: أساسي | فيديو | PDF | أسئلة | بناء الكلمة
 */
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import './CurriculumAdmin.css';

const TABS = [
  { id: 'basic', label: '📋 أساسي', icon: '📋' },
  { id: 'video', label: '🎬 فيديو', icon: '🎬' },
  { id: 'pdf', label: '📄 PDF', icon: '📄' },
  { id: 'quiz', label: '❓ أسئلة', icon: '❓' },
  { id: 'wordBuilder', label: '🔤 بناء الكلمة', icon: '🔤' },
  { id: 'parentGuide', label: '👨‍👩‍👧 دليل الأهل', icon: '👨‍👩‍👧' },
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
        // Word Builder
        wordBuilder: content.wordBuilder || null,
        // Parent Guide
        parentGuide: content.parentGuide || { title: '', sections: [] },
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
      celebration: form.celebration,
      wordBuilder: form.wordBuilder,
      parentGuide: form.parentGuide,
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
      <div className="editor-header">
        <div className="editor-title">
          <Link to={`/admin/lessons?subject=${form.subject_key}`} className="back-link">
            ← العودة للدروس
          </Link>
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
          <VideoTab form={form} updateForm={updateForm} />
        )}
        {activeTab === 'pdf' && (
          <PdfTab form={form} updateForm={updateForm} />
        )}
        {activeTab === 'quiz' && (
          <QuizTab form={form} updateForm={updateForm} />
        )}
        {activeTab === 'wordBuilder' && (
          <WordBuilderTab form={form} updateForm={updateForm} />
        )}
        {activeTab === 'parentGuide' && (
          <ParentGuideTab form={form} updateForm={updateForm} />
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

function VideoTab({ form, updateForm }) {
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
            📤 رفع ملف (قريباً)
          </label>
        </div>
      </div>

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

function PdfTab({ form, updateForm }) {
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
            📤 رفع ملف (قريباً)
          </label>
        </div>
      </div>

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
