import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

const BAND = { needs_support: '🔻 يحتاج دعماً', developing: '🔸 في تقدّم', strong: '🔺 متمكّن' };
const box = { border: '1px solid var(--line)', borderRadius: 12, padding: 12, background: 'var(--card-bg)' };

/** اختبار تقييم قصير: أسئلة من بنك الدروس المعتمد، التصحيح وحفظ النتيجة على الخادم. */
export default function AssessmentSection({ child, subjects }) {
  const [history, setHistory] = useState([]);
  const [subject, setSubject] = useState(subjects[0]?.id || '');
  const [qs, setQs] = useState(null);
  const [assessmentId, setAssessmentId] = useState(null);
  const [ans, setAns] = useState({});
  const [result, setResult] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const childIdRef = useRef(child.id);
  childIdRef.current = child.id;

  const loadHistory = async (childId = child.id) => {
    const { data } = await supabase.from('exam_attempts').select('subject_key,percentage,band,total_questions,correct_count,created_at')
      .eq('child_id', childId).order('created_at', { ascending: false }).limit(10);
    if (childIdRef.current === childId) setHistory(data || []);
  };
  useEffect(() => {
    setHistory([]); setQs(null); setAssessmentId(null); setAns({});
    setResult(null); setMsg(''); setBusy(false);
    loadHistory(child.id);
    /* eslint-disable-next-line */
  }, [child.id]);

  const start = async () => {
    const requestedChildId = child.id;
    setBusy(true); setMsg(''); setResult(null); setAns({});
    const { data, error } = await supabase.rpc('start_assessment', { p_child: requestedChildId, p_subject: subject, p_count: 10 });
    if (childIdRef.current !== requestedChildId) return;
    setBusy(false);
    if (error) {
      setQs(null); setAssessmentId(null);
      return setMsg(/not_enough_questions/.test(error.message)
        ? 'لا توجد أسئلة كافية لهذه المادة بعد (نحتاج 5 أسئلة معتمدة على الأقل). يضيفها المعلمون من لوحة المناهج.'
        : 'تعذر بدء الاختبار: ' + error.message);
    }
    setAssessmentId(data.assessment_id);
    setQs(data.questions);
  };

  const submit = async () => {
    const requestedChildId = child.id;
    setBusy(true);
    const { data, error } = await supabase.rpc('submit_assessment', {
      p_child: requestedChildId,
      p_subject: subject,
      p_assessment_id: assessmentId,
      p_answers: ans,
    });
    if (childIdRef.current !== requestedChildId) return;
    setBusy(false);
    if (error) return setMsg('تعذر حفظ النتيجة: ' + error.message);
    setResult(data); setQs(null); setAssessmentId(null); loadHistory(requestedChildId);
  };

  const label = (k) => subjects.find(s => s.id === k)?.title || k;
  return (
    <div style={box}>
      <strong>📝 اختبار تقييم</strong>
      {!qs && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <select value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="المادة" disabled={busy}>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.icon} {s.title}</option>)}
          </select>
          <button type="button" className="fam-out" onClick={start} disabled={busy || !subject}>{busy ? '⏳' : 'ابدأ الاختبار'}</button>
        </div>
      )}
      {msg && <p role="alert" style={{ margin: '8px 0 0' }}>{msg}</p>}
      {result && <p role="status" style={{ margin: '8px 0 0' }}>النتيجة: <strong>{result.correct}/{result.total}</strong> ({result.percentage}%) — {BAND[result.band]}</p>}
      {qs && (
        <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
          {qs.map((q, i) => {
            const opts = q.quiz_type === 'truefalse' ? [{ t: '✓ صح', v: true }, { t: '✕ خطأ', v: false }] : (q.choices || []).map((t, j) => ({ t, v: j }));
            return (
              <fieldset key={q.id} style={{ border: '1px solid var(--line)', borderRadius: 8 }}>
                <legend>{i + 1}. {q.question}</legend>
                {opts.map(o => (
                  <label key={String(o.v)} style={{ display: 'block', padding: '4px 0' }}>
                    <input type="radio" name={q.id} checked={ans[q.id] === o.v} onChange={() => setAns(a => ({ ...a, [q.id]: o.v }))} /> {o.t}
                  </label>
                ))}
              </fieldset>
            );
          })}
          <button type="button" className="acct-submit" onClick={submit} disabled={busy || Object.keys(ans).length < qs.length}>إنهاء وحفظ النتيجة</button>
        </div>
      )}
      {history.length > 0 && (
        <small style={{ display: 'block', marginTop: 8 }}>
          آخر النتائج: {history.slice(0, 5).map(h => `${label(h.subject_key)} ${h.percentage}%`).join(' · ')}
        </small>
      )}
      {history.length === 0 && !qs && !msg && <small style={{ display: 'block', marginTop: 8 }}>لا اختبارات سابقة.</small>}
    </div>
  );
}
