import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

const empty = () => ({ id: null, name: '', duration_days: '', included_hours: '', coverage_mode: 'all', price: '', status: 'draft', subjects: {} });
const box = { background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 14, padding: 20, marginBottom: 16 };
const input = { padding: '9px 11px', border: '1px solid var(--line)', borderRadius: 8, font: 'inherit' };
const button = { ...input, background: 'var(--card-bg)', cursor: 'pointer', fontWeight: 700 };
const toMinor = value => value === '' ? null : Number.isFinite(Number(value)) && Number(value) >= 0 ? Math.round(Number(value) * 100) : NaN;

export default function SubscriptionPlansPanel() {
  const { user } = useAuth();
  const { triggerToast } = useApp();
  const [plans, setPlans] = useState([]), [subjects, setSubjects] = useState([]), [form, setForm] = useState(empty);
  const [state, setState] = useState('loading'), [saving, setSaving] = useState(false), [audit, setAudit] = useState(null);
  const load = useCallback(async () => {
    if (!supabase) { setState('error'); return; }
    setState('loading');
    const [p, s] = await Promise.all([
      supabase.from('subscription_plans').select('*').order('updated_at', { ascending: false }),
      supabase.from('curriculum_subjects').select('key,title,published').order('sort_order'),
    ]);
    if (p.error || s.error) { setState('error'); return; }
    setPlans(p.data || []); setSubjects(s.data || []); setState('ready');
  }, []);
  useEffect(() => { load(); }, [load]);

  async function edit(plan) {
    const { data, error } = await supabase.from('subscription_plan_subjects').select('subject_key,price_per_child_minor').eq('plan_id', plan.id);
    if (error) { triggerToast(`تعذر تحميل مواد الخطة: ${error.message}`); return; }
    const selected = Object.fromEntries((data || []).map(x => [x.subject_key, (x.price_per_child_minor / 100).toFixed(2)]));
    setForm({ ...empty(), ...plan, duration_days: plan.duration_days ?? '', included_hours: plan.included_hours ?? '', price: plan.price_per_child_minor == null ? '' : (plan.price_per_child_minor / 100).toFixed(2), subjects: selected });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function save(event) {
    event.preventDefault();
    const duration = form.duration_days === '' ? null : Number(form.duration_days);
    const hours = form.included_hours === '' ? null : Number(form.included_hours);
    const price = form.coverage_mode === 'all' ? toMinor(form.price) : null;
    const selected = Object.entries(form.subjects).filter(([, v]) => v !== '').map(([subject_key, v]) => ({ subject_key, price_per_child_minor: toMinor(v) }));
    if (form.name.trim().length < 2 || form.name.trim().length > 100) return triggerToast('اسم الخطة يجب أن يكون بين حرفين و100 حرف.');
    if (duration !== null && (!Number.isInteger(duration) || duration <= 0)) return triggerToast('المدة بالأيام يجب أن تكون عدداً صحيحاً موجباً.');
    if (hours !== null && (!Number.isFinite(hours) || hours < 0)) return triggerToast('رصيد الساعات غير صالح.');
    if (Number.isNaN(price) || selected.some(x => Number.isNaN(x.price_per_child_minor))) return triggerToast('تحقق من الأسعار المدخلة.');
    if (form.status === 'active' && (duration === null || hours === null || (form.coverage_mode === 'all' ? price === null : !selected.length))) return triggerToast('أكمل المدة والساعات والسعر والمواد المطلوبة قبل التفعيل.');
    setSaving(true);
    const { data: planId, error: saveError } = await supabase.rpc('save_subscription_plan', {
      p_id: form.id || null,
      p_name: form.name.trim(),
      p_duration_days: duration,
      p_included_hours: hours,
      p_coverage_mode: form.coverage_mode,
      p_price_per_child_minor: price,
      p_status: form.id ? form.status : 'draft',
      p_subjects: form.coverage_mode === 'selected' ? selected : [],
    });
    setSaving(false);
    if (saveError) return triggerToast(`تعذر حفظ الخطة: ${saveError.message}`);
    if (!planId) return triggerToast('لم تُحفظ الخطة: الخادم لم يُرجع معرّفاً.');
    setForm(empty()); triggerToast('تم حفظ الخطة وسجل التعديلات ✓'); await load();
  }

  async function showAudit(plan) {
    const { data, error } = await supabase.from('subscription_plan_audit').select('id,action,actor_id,occurred_at,old_data,new_data').eq('plan_id', plan.id).order('occurred_at', { ascending: false }).limit(30);
    if (error) return triggerToast(`تعذر تحميل سجل التعديلات: ${error.message}`);
    setAudit({ name: plan.name, rows: data || [] });
  }

  async function archive(plan) {
    if (!window.confirm(`أرشفة «${plan.name}»؟`)) return;
    const { error } = await supabase.from('subscription_plans').update({ status: 'archived', updated_by: user?.id || null }).eq('id', plan.id);
    if (error) triggerToast(`تعذرت الأرشفة: ${error.message}`); else { triggerToast('تمت الأرشفة.'); await load(); }
  }

  return <div dir="rtl" style={{ color: 'var(--navy)' }}>
    <section style={box}>
      <h2 style={{ marginTop: 0 }}>📦 كتالوج الاشتراكات</h2>
      <p style={{ color: 'var(--muted)' }}>إعداد داخلي فقط: لا ينشئ اشتراكاً أو يخصم ساعات أو ينفذ دفعاً. اترك الأسعار والمدة والساعات فارغة لحفظ مسودة.</p>
      {state === 'loading' && <p>جارٍ تحميل الكتالوج…</p>}
      {state === 'error' && <p role="alert">تعذر تحميل الكتالوج. تحقق من وجود migration وصلاحية الإدارة. <button style={button} onClick={load}>إعادة المحاولة</button></p>}
      {state === 'ready' && <form onSubmit={save}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <label style={{ display: 'grid', gap: 5, flex: '1 1 180px' }}>اسم الخطة<input style={input} required maxLength={100} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></label>
          <label style={{ display: 'grid', gap: 5, flex: '1 1 150px' }}>المدة (يوم)<input style={input} type="number" min="1" step="1" value={form.duration_days} onChange={e => setForm(f => ({ ...f, duration_days: e.target.value }))} /></label>
          <label style={{ display: 'grid', gap: 5, flex: '1 1 150px' }}>الساعات لكل طفل<input style={input} type="number" min="0" step="0.25" value={form.included_hours} onChange={e => setForm(f => ({ ...f, included_hours: e.target.value }))} /></label>
          <label style={{ display: 'grid', gap: 5, flex: '1 1 150px' }}>المواد<select style={input} value={form.coverage_mode} onChange={e => setForm(f => ({ ...f, coverage_mode: e.target.value, price: e.target.value === 'selected' ? '' : f.price }))}><option value="all">كل المواد</option><option value="selected">مواد محددة</option></select></label>
          {form.coverage_mode === 'all' && <label style={{ display: 'grid', gap: 5, flex: '1 1 150px' }}>السعر لكل طفل (ر.س)<input style={input} type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></label>}
          {form.id ? <label style={{ display: 'grid', gap: 5, flex: '1 1 150px' }}>الحالة<select style={input} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}><option value="draft">مسودة</option><option value="active">نشطة</option><option value="archived">مؤرشفة</option></select></label> : <p style={{ margin: 0, alignSelf: 'center', color: 'var(--muted)' }}>الحالة: مسودة — يمكن تفعيلها بعد الحفظ.</p>}
        </div>
        {form.coverage_mode === 'selected' && <div style={{ marginTop: 14 }}><strong>المواد وأسعارها لكل طفل</strong>{!subjects.length ? <p>لا توجد مواد متاحة من قاعدة المناهج.</p> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 8, marginTop: 8 }}>{subjects.filter(s => s.published || Object.hasOwn(form.subjects, s.key)).map(s => <label key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--line)', borderRadius: 8, padding: 8 }}><input type="checkbox" checked={Object.hasOwn(form.subjects, s.key)} disabled={!s.published && !Object.hasOwn(form.subjects, s.key)} onChange={e => setForm(f => { const next = { ...f.subjects }; if (e.target.checked) next[s.key] = ''; else delete next[s.key]; return { ...f, subjects: next }; })} /><span style={{ flex: 1 }}>{s.title}{!s.published && ' (غير منشورة)'}</span>{Object.hasOwn(form.subjects, s.key) && <input aria-label={`سعر ${s.title} للطفل`} style={{ ...input, width: 100 }} type="number" min="0" step="0.01" value={form.subjects[s.key]} onChange={e => setForm(f => ({ ...f, subjects: { ...f.subjects, [s.key]: e.target.value } }))} />}</label>)}</div>}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 15 }}><button style={{ ...button, background: 'var(--blue)', color: 'white' }} disabled={saving}>{saving ? 'جارٍ الحفظ…' : form.id ? 'حفظ التعديلات' : 'حفظ كمسودة'}</button>{form.id && <button type="button" style={button} onClick={() => setForm(empty())}>إلغاء التعديل</button>}</div>
      </form>}
    </section>
    {state === 'ready' && <section style={box}><h3 style={{ marginTop: 0 }}>الخطط ({plans.length})</h3>{!plans.length ? <p>لا توجد خطط مسجلة؛ لم تُنشأ أسعار تلقائية.</p> : <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 650, borderCollapse: 'collapse' }}><thead><tr>{['الخطة','المدة','الساعات','التغطية','السعر/طفل','الحالة','إجراءات'].map(x => <th key={x} style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid var(--line)' }}>{x}</th>)}</tr></thead><tbody>{plans.map(p => <tr key={p.id}><td>{p.name}</td><td>{p.duration_days ?? '—'} يوم</td><td>{p.included_hours ?? '—'}</td><td>{p.coverage_mode === 'all' ? 'كل المواد' : 'مواد محددة'}</td><td>{p.price_per_child_minor == null ? 'حسب المواد' : `${(p.price_per_child_minor / 100).toFixed(2)} ر.س`}</td><td>{p.status}</td><td style={{ whiteSpace: 'nowrap' }}><button style={button} onClick={() => edit(p)}>تعديل</button>{' '}<button style={button} onClick={() => showAudit(p)}>السجل</button>{p.status !== 'archived' && <> <button style={button} onClick={() => archive(p)}>أرشفة</button></>}</td></tr>)}</tbody></table></div>}</section>}
    {audit && <section style={box}><div style={{ display: 'flex', justifyContent: 'space-between' }}><h3>سجل التعديلات: {audit.name}</h3><button style={button} onClick={() => setAudit(null)}>إغلاق</button></div>{audit.rows.length ? audit.rows.map(r => <details key={r.id} style={{ padding: 8, borderBottom: '1px solid var(--line)' }}><summary>{r.action} · {new Date(r.occurred_at).toLocaleString('ar-SA')} · {r.actor_id || 'غير معروف'}</summary><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 11 }}>{JSON.stringify({ old: r.old_data, new: r.new_data }, null, 2)}</pre></details>) : <p>لا توجد تعديلات.</p>}</section>}
  </div>;
}
