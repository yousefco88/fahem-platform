/**
 * AiTutorKnowledge — مدخلات سؤال/جواب معتمدة للمساعد.
 * المعلم يقترح (بانتظار الاعتماد) في المواد المسندة إليه فقط؛ الإدارة تعتمد/ترفض/تضيف مباشرة.
 * القراءة والكتابة محكومتان بـ RLS؛ المعتمَد فقط يصل للمساعد.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import './AiTutorAdmin.css';
import Emoji from '../../ui/Emoji';

const STATUS_LABEL = { pending: 'بانتظار الاعتماد', approved: 'معتمد', rejected: 'مرفوض' };

export default function AiTutorKnowledge() {
  const { user, role } = useAuth();
  const { triggerToast } = useApp();
  const isAdmin = role === 'admin';
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [rows, setRows] = useState([]);
  const [state, setState] = useState('loading');
  const [filter, setFilter] = useState('pending');
  const [form, setForm] = useState({ grade_id: '', subject_key: '', question: '', answer: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    if (!supabase) { setState('error'); return; }
    const [g, s, k] = await Promise.all([
      supabase.from('grades').select('id, title').order('sort_order'),
      supabase.from('curriculum_subjects').select('key, title, grade_id').order('sort_order'),
      supabase.from('ai_tutor_knowledge').select('*').order('created_at', { ascending: false }).limit(300),
    ]);
    if (g.error || s.error || k.error) { setState('error'); return; }
    setGrades(g.data || []); setSubjects(s.data || []); setRows(k.data || []);
    setState('ready');
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!form.subject_key) { triggerToast('اختر المادة'); return; }
    if (form.question.trim().length < 3 || form.answer.trim().length < 3) { triggerToast('اكتب السؤال والجواب'); return; }
    setSaving(true);
    const { error } = await supabase.from('ai_tutor_knowledge').insert({
      grade_id: form.grade_id || null, subject_key: form.subject_key,
      question: form.question.trim(), answer: form.answer.trim(),
      status: isAdmin ? 'approved' : 'pending', approved_by: isAdmin ? user.id : null, created_by: user.id,
    });
    setSaving(false);
    if (error) { triggerToast(`تعذر الحفظ: ${error.message}`); return; }
    triggerToast(isAdmin ? 'أُضيف ومعتمد ✓' : 'أُرسل للاعتماد ✓');
    setForm(f => ({ ...f, question: '', answer: '' }));
    load();
  }
  async function decide(id, status) {
    const { error } = await supabase.from('ai_tutor_knowledge').update({ status, approved_by: status === 'approved' ? user.id : null }).eq('id', id);
    if (error) { triggerToast(`تعذر: ${error.message}`); return; }
    load();
  }
  async function remove(id) {
    if (!window.confirm('حذف هذا المدخل؟')) return;
    const { error } = await supabase.from('ai_tutor_knowledge').delete().eq('id', id);
    if (error) { triggerToast(`تعذر: ${error.message}`); return; }
    load();
  }

  const subjOptions = subjects.filter(s => !form.grade_id || s.grade_id === form.grade_id);
  const subjName = k => subjects.find(s => s.key === k)?.title || '—';
  const gradeName = id => grades.find(g => g.id === id)?.title || 'كل الصفوف';
  const shown = rows.filter(r => filter === 'all' || r.status === filter);
  const count = f => rows.filter(r => f === 'all' || r.status === f).length;

  return (
    <section className="atr-wrap" dir="rtl">
      <h3 className="atr-title"><Emoji>🧠</Emoji> قاعدة المعرفة (سؤال وجواب معتمد)</h3>
      <p className="atr-hint">
        اكتب السؤال كما يسأله الطفل والجواب بأسلوب بسيط. {isAdmin ? 'إضافاتك تُعتمد مباشرة.' : 'إضافتك تنتظر اعتماد الإدارة، ولا تصل للمساعد قبل ذلك.'}
        المعلم يضيف في المواد المسندة إليه فقط.
      </p>

      <div className="atr-grid">
        <label className="atr-field"><span>الصف</span>
          <select value={form.grade_id} onChange={e => { set('grade_id', e.target.value); set('subject_key', ''); }}>
            <option value="">كل الصفوف</option>{grades.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
          </select></label>
        <label className="atr-field"><span>المادة</span>
          <select value={form.subject_key} onChange={e => set('subject_key', e.target.value)}>
            <option value="">اختر المادة</option>{subjOptions.map(s => <option key={s.key} value={s.key}>{s.title}</option>)}
          </select></label>
      </div>
      <label className="atr-field"><span>السؤال <small>({form.question.length}/300)</small></span>
        <input value={form.question} maxLength={300} onChange={e => set('question', e.target.value)} placeholder="ما هو الكسر؟" /></label>
      <label className="atr-field"><span>الجواب المعتمد <small>({form.answer.length}/1200)</small></span>
        <textarea rows={4} value={form.answer} maxLength={1200} onChange={e => set('answer', e.target.value)} /></label>
      <div className="atr-row"><button type="button" className="atr-btn good" disabled={saving} onClick={add}>{saving ? 'جارٍ الحفظ...' : isAdmin ? 'إضافة' : 'إرسال للاعتماد'}</button></div>

      {state === 'loading' && <div className="atr-empty">جارٍ التحميل...</div>}
      {state === 'error' && <div className="atr-empty atr-err">تعذر التحميل. <button type="button" className="atr-link" onClick={load}>إعادة المحاولة</button></div>}
      {state === 'ready' && (
        <>
          <div className="atr-chips">
            {[['pending', 'بانتظار الاعتماد'], ['approved', 'معتمد'], ['rejected', 'مرفوض'], ['all', 'الكل']].map(([id, label]) => (
              <button key={id} type="button" className={`atr-chip${filter === id ? ' on' : ''}`} onClick={() => setFilter(id)}>{label} ({count(id)})</button>
            ))}
          </div>
          {shown.length === 0 && <div className="atr-empty">لا توجد مدخلات في هذا التصنيف.</div>}
          {shown.map(r => (
            <article key={r.id} className={`atr-card${r.status === 'approved' ? ' correct' : r.status === 'rejected' ? ' wrong' : ''}`}>
              <div className="atr-meta">
                <span>{gradeName(r.grade_id)} · {subjName(r.subject_key)}</span>
                <span className={`atr-tag ${r.status === 'approved' ? 'correct' : r.status === 'rejected' ? 'wrong' : ''}`}>{STATUS_LABEL[r.status]}</span>
              </div>
              <div className="atr-q"><small>السؤال</small>{r.question}</div>
              <div className="atr-a"><small>الجواب</small>{r.answer}</div>
              <div className="atr-row">
                {isAdmin && r.status !== 'approved' && <button type="button" className="atr-btn good" onClick={() => decide(r.id, 'approved')}>اعتماد</button>}
                {isAdmin && r.status !== 'rejected' && <button type="button" className="atr-btn" onClick={() => decide(r.id, 'rejected')}>{r.status === 'approved' ? 'إيقاف' : 'رفض'}</button>}
                {(isAdmin || r.created_by === user?.id) && <button type="button" className="atr-btn bad" onClick={() => remove(r.id)}>حذف</button>}
              </div>
            </article>
          ))}
        </>
      )}
    </section>
  );
}
