/**
 * AiTutorSources — رفع مصادر المناهج لقاعدة معرفة المساعد (الإدارة فقط).
 * ملفات PDF (بطبقة نص) أو TXT/MD أو نص ملصوق → استخراج في المتصفح → معاينة → حفظ مقاطع مقسّمة (لا يُخزَّن الملف الأصلي).
 * المصدر يبقى «بانتظار الاعتماد» ولا يصل المساعد قبل اعتماد الإدارة.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { buildChunks, cleanExtracted, looksScanned } from '../../lib/knowledgeIngest';
import '../ai/AiTutorAdmin.css';

const MAX_MB = 200;
const MAX_PAGES = 400;
const STATUS_LABEL = { pending: 'بانتظار الاعتماد', approved: 'معتمد', rejected: 'مرفوض' };

// قراءة PDF: نص مباشر لكل صفحة؛ الصفحة بلا نص تُقرأ بالتعرف الضوئي (OCR) داخل المتصفح
async function extractPdf(file, onProgress, ocrLang) {
  const pdfjs = await import('pdfjs-dist/build/pdf.min.mjs');
  const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), useSystemFonts: true, cMapUrl: '/pdfjs-cmaps/', cMapPacked: true }).promise;
  if (doc.numPages > MAX_PAGES) throw new Error(`الملف أكبر من ${MAX_PAGES} صفحة`);
  const pages = [];
  let ocr = null;
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      let text = (await page.getTextContent()).items.map(i => i.str).join(' ');
      if (cleanExtracted(text).length < 30) { // صفحة ممسوحة → OCR
        if (!ocr) {
          onProgress(p, doc.numPages, 'تجهيز محرك القراءة الضوئية (أول مرة يحمّل نحو 3MB)');
          const { createWorker } = await import('tesseract.js');
          ocr = await createWorker(ocrLang, 1, { workerPath: `${location.origin}/tesseract/worker.min.js`, corePath: `${location.origin}/tesseract`, langPath: `${location.origin}/tesseract/lang` });
        }
        onProgress(p, doc.numPages, 'قراءة ضوئية للصفحة');
        const vp = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = vp.width; canvas.height = vp.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
        text = (await ocr.recognize(canvas)).data.text;
        canvas.width = canvas.height = 0;
        onProgress(p, doc.numPages, 'قراءة ضوئية');
      } else if (p % 5 === 0 || p === doc.numPages) onProgress(p, doc.numPages);
      pages.push(text);
    }
  } finally { if (ocr) await ocr.terminate(); }
  return pages;
}

export default function AiTutorSources() {
  const { user } = useAuth();
  const { triggerToast } = useApp();
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [list, setList] = useState([]);
  const [state, setState] = useState('loading');
  const [form, setForm] = useState({ title: '', rights: 'official', confirmed: false, grade_id: '', subject_key: '', note: '', pasted: '', ocrLang: 'ara' });
  const [file, setFile] = useState(null);
  const [draft, setDraft] = useState(null); // { chunks, pages, chars }
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    if (!supabase) { setState('error'); return; }
    const [g, s, l] = await Promise.all([
      supabase.from('grades').select('id, title').order('sort_order'),
      supabase.from('curriculum_subjects').select('key, title, grade_id').order('sort_order'),
      supabase.from('ai_tutor_sources').select('*').order('created_at', { ascending: false }),
    ]);
    if (g.error || s.error || l.error) { setState('error'); return; }
    setGrades(g.data || []); setSubjects(s.data || []); setList(l.data || []);
    setState('ready');
  }, []);
  useEffect(() => { load(); }, [load]);

  async function prepare() {
    setError(''); setDraft(null);
    if (form.title.trim().length < 2) { setError('اكتب عنوانًا للمصدر'); return; }
    if (form.rights === 'external' && !form.confirmed) { setError('أكّد أن لديك حق استخدام هذا المحتوى'); return; }
    if (!file && form.pasted.trim().length < 20) { setError('اختر ملفًا أو ألصق نصًا'); return; }
    if (file && file.size > MAX_MB * 1024 * 1024) { setError(`الحد الأقصى ${MAX_MB}MB`); return; }
    setBusy('جارٍ الاستخراج...');
    try {
      let pages;
      if (file && /\.pdf$/i.test(file.name)) pages = await extractPdf(file, (p, n, m) => setBusy(`${m || 'استخراج الصفحات'} ${p}/${n}...`), form.ocrLang);
      else if (file) pages = [await file.text()];
      else pages = [form.pasted];
      const chars = pages.reduce((n, t) => n + cleanExtracted(t).length, 0);
      if (looksScanned(chars, pages.length)) throw new Error('هذا الملف ممسوح ضوئيًا ولم تُستخرج منه نصوص حتى بالقراءة الضوئية. جرّب نسخة أوضح أو ألصق النص.');
      const chunks = buildChunks(pages);
      if (!chunks.length) throw new Error('لم يُستخرج نص صالح');
      setDraft({ chunks, pages: pages.length, chars });
    } catch (e) { setError(e.message || 'تعذر الاستخراج'); }
    setBusy('');
  }

  async function save() {
    setBusy('جارٍ الحفظ...'); setError('');
    const { data: src, error: se } = await supabase.from('ai_tutor_sources').insert({
      title: form.title.trim(), rights: form.rights,
      rights_confirmed: form.rights === 'official' ? false : !!form.confirmed,
      grade_id: form.grade_id || null, subject_key: form.subject_key || null,
      note: form.note.trim() || null, pages: draft.pages, chunk_count: draft.chunks.length,
      created_by: user.id,
    }).select().single();
    if (se) { setBusy(''); setError(`تعذر الحفظ: ${se.message}`); return; }
    for (let i = 0; i < draft.chunks.length; i += 100) {
      const rows = draft.chunks.slice(i, i + 100).map(c => ({ source_id: src.id, page: c.page, content: c.content }));
      const { error: ce } = await supabase.from('ai_tutor_chunks').insert(rows);
      if (ce) {
        await supabase.from('ai_tutor_sources').delete().eq('id', src.id); // تراجع كامل
        setBusy(''); setError(`فشل حفظ المقاطع وتم التراجع: ${ce.message}`); return;
      }
    }
    setBusy(''); setDraft(null); setFile(null);
    setForm(f => ({ ...f, title: '', pasted: '', note: '', confirmed: false }));
    triggerToast('حُفظ المصدر بانتظار اعتمادك ✓');
    load();
  }

  async function decide(id, status) {
    const { error: e } = await supabase.from('ai_tutor_sources').update({ status, approved_by: status === 'approved' ? user.id : null }).eq('id', id);
    if (e) { triggerToast(`تعذر: ${e.message}`); return; }
    load();
  }
  async function remove(id) {
    if (!window.confirm('حذف هذا المصدر ومقاطعه نهائيًا؟')) return;
    const { error: e } = await supabase.from('ai_tutor_sources').delete().eq('id', id);
    if (e) { triggerToast(`تعذر: ${e.message}`); return; }
    load();
  }

  const subjOptions = subjects.filter(s => !form.grade_id || s.grade_id === form.grade_id);
  const gradeName = id => grades.find(g => g.id === id)?.title || 'كل الصفوف';
  const subjName = k => subjects.find(s => s.key === k)?.title || 'كل المواد';

  return (
    <section className="atr-wrap" dir="rtl">
      <h3 className="atr-title">📚 مصادر المناهج</h3>
      <p className="atr-hint">
        ارفع كتابًا أو ملخصًا (PDF نصي أو TXT أو نص ملصوق). يُقسَّم النص إلى مقاطع ويُحفظ دون الملف الأصلي، ولا يصل المساعد قبل اعتماده.
        المساعد يشرح بكلماته البسيطة ولا ينسخ المقاطع حرفيًا.
      </p>

      {state === 'loading' && <div className="atr-empty">جارٍ التحميل...</div>}
      {state === 'error' && <div className="atr-empty atr-err">تعذر التحميل (تتطلب صلاحية الإدارة). <button type="button" className="atr-link" onClick={load}>إعادة المحاولة</button></div>}

      {state === 'ready' && (
        <>
          <label className="atr-field"><span>عنوان المصدر</span>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="مثال: رياضيات الصف الأول — الفصل الأول (وزارة التربية)" />
          </label>
          <div className="atr-grid">
            <label className="atr-field"><span>الصف</span>
              <select value={form.grade_id} onChange={e => { set('grade_id', e.target.value); set('subject_key', ''); }}>
                <option value="">كل الصفوف</option>{grades.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select></label>
            <label className="atr-field"><span>المادة</span>
              <select value={form.subject_key} onChange={e => set('subject_key', e.target.value)}>
                <option value="">كل المواد</option>{subjOptions.map(s => <option key={s.key} value={s.key}>{s.title}</option>)}
              </select></label>
            <label className="atr-field"><span>نوع المصدر</span>
              <select value={form.rights} onChange={e => set('rights', e.target.value)}>
                <option value="official">رسمي (وزارة التربية والتعليم)</option>
                <option value="external">خارجي (ناشر / ملخص)</option>
              </select></label>
          </div>
          {form.rights === 'external' && (
            <label className="atr-field atr-check">
              <input type="checkbox" checked={form.confirmed} onChange={e => set('confirmed', e.target.checked)} />
              <span>أؤكد أن لدي حق استخدام هذا المحتوى داخل المنصة <small>(المسؤولية القانونية عن المصادر الخارجية على الجهة الرافعة؛ يُسجَّل هذا التأكيد مع المصدر)</small></span>
            </label>
          )}
          <label className="atr-field"><span>ملف (PDF نصي / TXT / MD)</span>
            <input type="file" accept=".pdf,.txt,.md,text/plain,application/pdf" onChange={e => { setFile(e.target.files?.[0] || null); setDraft(null); }} />
          </label>
          <label className="atr-field"><span>لغة الملف إن كان ممسوحًا ضوئيًا <small>(تُقرأ الصفحات المصوّرة تلقائيًا؛ الصفحة الواحدة نحو 5–15 ثانية)</small></span>
            <select value={form.ocrLang} onChange={e => set('ocrLang', e.target.value)}>
              <option value="ara">عربي</option><option value="ara+eng">عربي + إنجليزي</option><option value="eng">إنجليزي</option>
            </select></label>
          <label className="atr-field"><span>أو ألصق النص <small>(يُستخدم إن لم تختر ملفًا)</small></span>
            <textarea rows={4} value={form.pasted} onChange={e => set('pasted', e.target.value)} />
          </label>
          <label className="atr-field"><span>ملاحظة (اختياري)</span>
            <input value={form.note} maxLength={500} onChange={e => set('note', e.target.value)} />
          </label>
          {error && <div className="atr-empty atr-err">{error}</div>}
          <div className="atr-row">
            <button type="button" className="atr-btn" disabled={!!busy} onClick={prepare}>{busy || 'استخراج ومعاينة'}</button>
          </div>

          {draft && (
            <div className="atr-card">
              <b>معاينة قبل الحفظ</b>
              <small className="atr-note">{draft.pages} صفحة · {draft.chunks.length} مقطع · {draft.chars.toLocaleString('ar-EG')} حرف. تحقّق أن العربية مقروءة وغير مشوّهة قبل الحفظ.</small>
              {draft.chunks.slice(0, 3).map((c, i) => <div key={i} className="atr-q"><small>مقطع من صفحة {c.page}</small>{c.content.slice(0, 350)}</div>)}
              <div className="atr-row">
                <button type="button" className="atr-btn good" disabled={!!busy} onClick={save}>{busy || 'حفظ المصدر'}</button>
                <button type="button" className="atr-btn" onClick={() => setDraft(null)}>إلغاء</button>
              </div>
            </div>
          )}

          <h4 className="atr-sub">المصادر المحفوظة ({list.length})</h4>
          {list.length === 0 && <div className="atr-empty">لا توجد مصادر بعد.</div>}
          {list.map(s => (
            <article key={s.id} className={`atr-card${s.status === 'approved' ? ' correct' : s.status === 'rejected' ? ' wrong' : ''}`}>
              <div className="atr-meta">
                <b>{s.title}</b>
                <span>{gradeName(s.grade_id)} · {subjName(s.subject_key)}</span>
                <span>{s.rights === 'official' ? 'رسمي' : 'خارجي (مؤكَّد)'}</span>
                <span>{s.chunk_count} مقطع{s.pages ? ` · ${s.pages} صفحة` : ''}</span>
                <span className={`atr-tag ${s.status === 'approved' ? 'correct' : s.status === 'rejected' ? 'wrong' : ''}`}>{STATUS_LABEL[s.status]}</span>
              </div>
              <div className="atr-row">
                {s.status !== 'approved' && <button type="button" className="atr-btn good" onClick={() => decide(s.id, 'approved')}>اعتماد</button>}
                {s.status !== 'rejected' && <button type="button" className="atr-btn" onClick={() => decide(s.id, 'rejected')}>{s.status === 'approved' ? 'إيقاف' : 'رفض'}</button>}
                <button type="button" className="atr-btn bad" onClick={() => remove(s.id)}>حذف</button>
              </div>
            </article>
          ))}
        </>
      )}
    </section>
  );
}
