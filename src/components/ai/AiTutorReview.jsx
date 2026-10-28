/**
 * AiTutorReview — مراجعة محادثات مساعد التدريب (المعلم لأطفاله المسندين، والإدارة للكل).
 * القراءة محكومة بـ RLS؛ الحكم والتصحيح عبر دالة ai_tutor_review_message (تفرض الصلاحية على الخادم).
 * الأحكام «خاطئة + تصحيح» تُحقن في تعليمات المساعد تلقائيًا (آخر 6 تصحيحات).
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';
import AiTutorKnowledge from './AiTutorKnowledge';
import './AiTutorAdmin.css';
import Emoji from '../../ui/Emoji';

const FILTERS = [
  { id: 'todo', label: 'بانتظار المراجعة' },
  { id: 'wrong', label: 'خاطئة' },
  { id: 'correct', label: 'صحيحة' },
  { id: 'all', label: 'الكل' },
];

function ChatsReview() {
  const { triggerToast } = useApp();
  const [items, setItems] = useState([]);
  const [state, setState] = useState('loading'); // loading | error | ready
  const [filter, setFilter] = useState('todo');
  const [editing, setEditing] = useState(null); // message id being marked wrong
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    if (!supabase) { setState('error'); return; }
    setState('loading');
    const msgs = await supabase.from('ai_tutor_messages')
      .select('id, child_id, role, content, created_at').order('created_at', { ascending: false }).limit(200);
    if (msgs.error) { setState('error'); return; }
    const rows = msgs.data || [];
    const childIds = [...new Set(rows.map(r => r.child_id))];
    const [kids, fixes] = await Promise.all([
      childIds.length ? supabase.from('children').select('id, name').in('id', childIds) : { data: [] },
      supabase.from('ai_tutor_corrections').select('message_id, verdict, correction'),
    ]);
    if (kids.error || fixes.error) { setState('error'); return; }
    const names = new Map((kids.data || []).map(k => [k.id, k.name]));
    const verdicts = new Map((fixes.data || []).map(f => [f.message_id, f]));
    const asked = new Map(rows.filter(r => r.role === 'user').map(r => [`${r.child_id}|${r.created_at}`, r.content]));
    setItems(rows.filter(r => r.role === 'assistant').map(r => ({
      id: r.id,
      child: names.get(r.child_id) || 'طفل',
      at: r.created_at,
      question: asked.get(`${r.child_id}|${r.created_at}`) || '—',
      reply: r.content,
      review: verdicts.get(r.id) || null,
    })));
    setState('ready');
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => ({
    todo: items.filter(i => !i.review).length,
    wrong: items.filter(i => i.review?.verdict === 'wrong').length,
    correct: items.filter(i => i.review?.verdict === 'correct').length,
    all: items.length,
  }), [items]);

  const shown = items.filter(i =>
    filter === 'all' ? true : filter === 'todo' ? !i.review : i.review?.verdict === filter);

  async function submit(id, verdict, correction) {
    setBusy(id);
    const { error } = await supabase.rpc('ai_tutor_review_message', {
      p_message: id, p_verdict: verdict, p_correction: correction || null,
    });
    setBusy('');
    if (error) { triggerToast(`تعذر الحفظ: ${error.message}`); return; }
    triggerToast(verdict === 'correct' ? 'سُجّلت الإجابة صحيحة ✓' : 'حُفظ التصحيح وسيصل للمساعد ✓');
    setEditing(null); setDraft('');
    load();
  }

  return (
    <section className="atr-wrap" dir="rtl">
      <h3 className="atr-title"><Emoji>🧐</Emoji> مراجعة محادثات المساعد</h3>
      <p className="atr-hint">
        ما يظهر هنا هو ما دار فعليًا بين أطفال فعّل أولياء أمورهم المساعد وبين النموذج (للمعلم: أطفاله المسندون فقط).
        علّم الرد «صحيحًا» أو «خاطئًا» مع الصواب؛ آخر 6 تصحيحات تُضاف تلقائيًا لتعليمات المساعد في كل رد.
      </p>

      <div className="atr-chips">
        {FILTERS.map(f => (
          <button key={f.id} type="button" className={`atr-chip${filter === f.id ? ' on' : ''}`} onClick={() => setFilter(f.id)}>
            {f.label} ({counts[f.id]})
          </button>
        ))}
        <button type="button" className="atr-chip" onClick={load}>↻ تحديث</button>
      </div>

      {state === 'loading' && <div className="atr-empty">جارٍ التحميل...</div>}
      {state === 'error' && <div className="atr-empty atr-err">تعذر تحميل المحادثات. <button type="button" className="atr-link" onClick={load}>إعادة المحاولة</button></div>}
      {state === 'ready' && shown.length === 0 && (
        <div className="atr-empty">
          {items.length === 0
            ? 'لا توجد محادثات بعد — تظهر هنا بعد أن يفعّل ولي أمر المساعد ويسأل الطفل.'
            : 'لا توجد رسائل في هذا التصنيف.'}
        </div>
      )}

      {state === 'ready' && shown.map(i => (
        <article key={i.id} className={`atr-card${i.review ? ` ${i.review.verdict}` : ''}`}>
          <div className="atr-meta">
            <b>{i.child}</b>
            <span>{new Date(i.at).toLocaleString('ar-EG')}</span>
            {i.review && <span className={`atr-tag ${i.review.verdict}`}>{i.review.verdict === 'correct' ? 'صحيحة' : 'خاطئة'}</span>}
          </div>
          <div className="atr-q"><small>السؤال</small>{i.question}</div>
          <div className="atr-a"><small>رد المساعد</small>{i.reply}</div>
          {i.review?.correction && <div className="atr-fix"><small>الصواب</small>{i.review.correction}</div>}

          {editing === i.id ? (
            <div className="atr-edit">
              <textarea
                value={draft} maxLength={600} rows={3} autoFocus
                placeholder="اكتب الإجابة الصحيحة بجملتين أو ثلاث بأسلوب بسيط للطفل"
                onChange={e => setDraft(e.target.value)}
              />
              <div className="atr-row">
                <button type="button" className="atr-btn bad" disabled={busy === i.id || !draft.trim()} onClick={() => submit(i.id, 'wrong', draft.trim())}>حفظ التصحيح</button>
                <button type="button" className="atr-btn" onClick={() => { setEditing(null); setDraft(''); }}>إلغاء</button>
              </div>
            </div>
          ) : (
            <div className="atr-row">
              <button type="button" className="atr-btn good" disabled={busy === i.id} onClick={() => submit(i.id, 'correct')}>✓ صحيحة</button>
              <button type="button" className="atr-btn bad" disabled={busy === i.id} onClick={() => { setEditing(i.id); setDraft(i.review?.correction || ''); }}>✗ خاطئة + تصحيح</button>
            </div>
          )}
        </article>
      ))}
    </section>
  );
}


export default function AiTutorReview() {
  return (
    <div className="atr-page" dir="rtl">
      <ChatsReview />
      <AiTutorKnowledge />
    </div>
  );
}
