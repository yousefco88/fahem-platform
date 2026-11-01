import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';
import { minutesToLabel, CONTRACT_STATUS_LABEL, POSTING_RESULT_LABEL, isMissingSchemaError, translateLedgerError, todayIsoDate } from '../../lib/subscriptionLedger';

const box = { background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 14, padding: 20, marginBottom: 16 };
const input = { padding: '9px 11px', border: '1px solid var(--line)', borderRadius: 8, font: 'inherit' };
const button = { ...input, background: 'var(--card-bg)', cursor: 'pointer', fontWeight: 700 };
const primary = { ...button, background: 'var(--blue)', color: 'white' };
const th = { textAlign: 'right', padding: 8, borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap' };
const td = { padding: 8, borderBottom: '1px solid var(--line)', verticalAlign: 'top' };
const field = { display: 'grid', gap: 5, flex: '1 1 180px' };
const emptyGrant = () => ({ child_id: '', plan_id: '', subjects: [], starts_at: todayIsoDate(), note: '' });
const emptyCorrection = () => ({ attendance_id: '', attended: 'true', minutes: '', reason: '' });
const fmtDate = v => v ? new Date(v).toLocaleDateString('ar-SA') : '—';
const fmtDateTime = v => v ? new Date(v).toLocaleString('ar-SA') : '—';

// Admin-only: creates contracts by administrative grant, shows balances from the append-only ledger,
// corrects locked attendance, and exposes the automatic posting log. Every write goes through an RPC.
export default function SubscriptionContractsPanel() {
  const { triggerToast } = useApp();
  const [state, setState] = useState('loading');
  const [children, setChildren] = useState([]), [parents, setParents] = useState({}), [plans, setPlans] = useState([]), [planSubjects, setPlanSubjects] = useState([]), [subjectTitles, setSubjectTitles] = useState({});
  const [contracts, setContracts] = useState([]), [balances, setBalances] = useState({}), [postings, setPostings] = useState([]);
  const [grant, setGrant] = useState(emptyGrant), [correction, setCorrection] = useState(emptyCorrection), [busy, setBusy] = useState('');
  const [ledgerFor, setLedgerFor] = useState(null);

  const load = useCallback(async () => {
    if (!supabase) { setState('error'); return; }
    setState('loading');
    const [c, p, pl, ps, s, k, po] = await Promise.all([
      supabase.from('children').select('id, parent_id, name, grade').order('name'),
      supabase.from('parent_profiles').select('id, full_name'),
      supabase.from('subscription_plans').select('id, name, duration_days, included_hours, coverage_mode, price_per_child_minor, status').eq('status', 'active').order('name'),
      supabase.from('subscription_plan_subjects').select('plan_id, subject_key, price_per_child_minor'),
      supabase.from('curriculum_subjects').select('key, title'),
      supabase.from('child_subscription_contracts').select('id, child_id, plan_snapshot, coverage_mode_snapshot, included_hours_snapshot, quoted_total_minor, currency, starts_at, ends_at, status, admin_note, created_at').order('created_at', { ascending: false }).limit(300),
      supabase.from('attendance_ledger_postings').select('attendance_id, source_version, result, error_message, attempts, last_attempt_at').order('last_attempt_at', { ascending: false }).limit(100),
    ]);
    if (isMissingSchemaError(k.error) || isMissingSchemaError(po.error)) { setState('not-deployed'); return; }
    if ([c, p, pl, ps, s, k, po].some(x => x.error)) { setState('error'); return; }
    setChildren(c.data || []);
    setParents(Object.fromEntries((p.data || []).map(x => [x.id, x.full_name])));
    setPlans(pl.data || []); setPlanSubjects(ps.data || []);
    setSubjectTitles(Object.fromEntries((s.data || []).map(x => [x.key, x.title])));
    setContracts(k.data || []); setPostings(po.data || []);
    const ids = (k.data || []).filter(x => ['active', 'cancel_scheduled', 'frozen'].includes(x.status)).map(x => x.id);
    const results = await Promise.all(ids.map(id => supabase.rpc('contract_balance_minutes', { p_contract_id: id }).then(r => [id, r.error ? null : r.data])));
    setBalances(Object.fromEntries(results));
    setState('ready');
  }, []);
  useEffect(() => { load(); }, [load]);

  const selectedPlan = plans.find(x => x.id === grant.plan_id) || null;
  const selectedPlanSubjects = useMemo(() => planSubjects.filter(x => x.plan_id === grant.plan_id), [planSubjects, grant.plan_id]);
  const quoted = selectedPlan ? (selectedPlan.coverage_mode === 'all' ? selectedPlan.price_per_child_minor : selectedPlanSubjects.filter(x => grant.subjects.includes(x.subject_key)).reduce((a, x) => a + x.price_per_child_minor, 0)) : null;
  const childLabel = id => { const c = children.find(x => x.id === id); return c ? `${c.name}${parents[c.parent_id] ? ` — ${parents[c.parent_id]}` : ''}` : id; };

  async function submitGrant(event) {
    event.preventDefault();
    if (!grant.child_id || !grant.plan_id) return triggerToast('اختر الطفل والخطة.');
    if (grant.note.trim().length < 3) return triggerToast('اكتب ملاحظة الإدارة (مرجع التحويل أو سبب المنحة).');
    if (selectedPlan?.coverage_mode === 'selected' && !grant.subjects.length) return triggerToast('اختر مادة واحدة على الأقل.');
    if (!window.confirm(`منح «${childLabel(grant.child_id)}» خطة «${selectedPlan.name}» (${selectedPlan.included_hours} ساعة، ${selectedPlan.duration_days} يوم)؟ سيُضاف الرصيد فوراً.`)) return;
    setBusy('grant');
    const { data, error } = await supabase.rpc('admin_grant_child_contract', {
      p_child_id: grant.child_id, p_plan_id: grant.plan_id,
      p_subject_keys: selectedPlan.coverage_mode === 'selected' ? grant.subjects : null,
      p_starts_at: new Date(`${grant.starts_at}T00:00:00`).toISOString(), p_admin_note: grant.note.trim(),
    });
    setBusy('');
    if (error) return triggerToast(`تعذرت المنحة: ${translateLedgerError(error.message)}`);
    triggerToast(`تم إنشاء العقد والرصيد ${minutesToLabel(data?.balance_minutes)} ✓`);
    setGrant(emptyGrant()); await load();
  }

  async function submitCorrection(event) {
    event.preventDefault();
    const minutes = correction.attended === 'true' ? Number(correction.minutes) : 0;
    if (!/^[0-9a-f-]{36}$/i.test(correction.attendance_id.trim())) return triggerToast('معرّف الحضور غير صالح.');
    if (correction.attended === 'true' && (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440)) return triggerToast('الدقائق يجب أن تكون بين 1 و1440.');
    if (correction.reason.trim().length < 3) return triggerToast('السبب مطلوب.');
    if (!window.confirm('تصحيح الحضور وإعادة ترحيله للدفتر؟ سيُسجَّل في سجل التدقيق باسمك.')) return;
    setBusy('correction');
    const { data, error } = await supabase.rpc('admin_correct_live_attendance', { p_attendance_id: correction.attendance_id.trim(), p_attended: correction.attended === 'true', p_actual_minutes: minutes, p_reason: correction.reason.trim() });
    setBusy('');
    if (error) return triggerToast(`تعذر التصحيح: ${translateLedgerError(error.message)}`);
    triggerToast(`تم التصحيح — نتيجة الدفتر: ${POSTING_RESULT_LABEL[data?.ledger?.status] || data?.ledger?.status || '—'}`);
    setCorrection(emptyCorrection()); await load();
  }

  async function runSweep() {
    setBusy('sweep');
    const { data, error } = await supabase.rpc('post_due_attendance_debits', { p_limit: 500 });
    setBusy('');
    if (error) return triggerToast(`تعذر الترحيل: ${translateLedgerError(error.message)}`);
    triggerToast(`الترحيل: ${data?.ok ?? 0} ناجح، ${data?.failed ?? 0} خطأ من ${data?.processed ?? 0}.`);
    await load();
  }

  async function showLedger(contract) {
    const { data, error } = await supabase.from('subscription_hour_ledger').select('id, entry_type, minutes, subject_key, source_type, source_id, reason, created_at, reverses_entry_id').eq('contract_id', contract.id).order('created_at', { ascending: false }).limit(200);
    if (error) return triggerToast(`تعذر تحميل الدفتر: ${error.message}`);
    setLedgerFor({ contract, rows: data || [] });
  }

  async function reverseEntry(row) {
    const reason = window.prompt('سبب عكس هذا القيد (إلزامي):');
    if (reason == null) return;
    const { error } = await supabase.rpc('reverse_ledger_entry', { p_entry_id: row.id, p_reason: reason.trim() });
    if (error) return triggerToast(`تعذر العكس: ${translateLedgerError(error.message)}`);
    triggerToast('تم عكس القيد.'); await load(); if (ledgerFor) await showLedger(ledgerFor.contract);
  }

  const errorPostings = postings.filter(x => x.result === 'error');

  return <div dir="rtl" style={{ color: 'var(--navy)' }}>
    <section style={box}>
      <h2 style={{ marginTop: 0 }}>🧾 عقود الاشتراك ودفتر الساعات</h2>
      <p style={{ color: 'var(--muted)' }}>الدفع خارج المنصة في هذه المرحلة: تُنشأ العقود بمنحة إدارية مع مرجع التحويل. الخصم مصدره حضور المعلم المؤكَّد فقط، ويُرحَّل تلقائياً بعد 48 ساعة من يوم الحصة.</p>
      {state === 'loading' && <p>جارٍ التحميل…</p>}
      {state === 'not-deployed' && <p role="alert">دفتر الساعات غير مفعّل في هذه البيئة بعد (migrations 20261101150000/160000 غير مطبّقة). لا يمكن إنشاء عقود هنا.</p>}
      {state === 'error' && <p role="alert">تعذر التحميل. <button style={button} onClick={load}>إعادة المحاولة</button></p>}
      {state === 'ready' && <form onSubmit={submitGrant}>
        <h3>منحة إدارية (إنشاء عقد)</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <label style={field}>الطفل<select style={input} required value={grant.child_id} onChange={e => setGrant(g => ({ ...g, child_id: e.target.value }))}><option value="">— اختر —</option>{children.map(c => <option key={c.id} value={c.id}>{childLabel(c.id)}{c.grade ? ` (${c.grade})` : ''}</option>)}</select></label>
          <label style={field}>الخطة النشطة<select style={input} required value={grant.plan_id} onChange={e => setGrant(g => ({ ...g, plan_id: e.target.value, subjects: [] }))}><option value="">— اختر —</option>{plans.map(p => <option key={p.id} value={p.id}>{p.name} · {p.included_hours ?? '؟'} س · {p.duration_days ?? '؟'} يوم</option>)}</select></label>
          <label style={field}>تاريخ البداية<input style={input} type="date" required value={grant.starts_at} onChange={e => setGrant(g => ({ ...g, starts_at: e.target.value }))} /></label>
          <label style={{ ...field, flex: '2 1 260px' }}>ملاحظة الإدارة (مرجع التحويل / السبب)<input style={input} required minLength={3} maxLength={300} value={grant.note} onChange={e => setGrant(g => ({ ...g, note: e.target.value }))} /></label>
        </div>
        {selectedPlan?.coverage_mode === 'selected' && <div style={{ marginTop: 12 }}><strong>المواد المشمولة</strong><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>{selectedPlanSubjects.map(s => <label key={s.subject_key} style={{ display: 'flex', gap: 6, alignItems: 'center', border: '1px solid var(--line)', borderRadius: 8, padding: '6px 10px' }}><input type="checkbox" checked={grant.subjects.includes(s.subject_key)} onChange={e => setGrant(g => ({ ...g, subjects: e.target.checked ? [...g.subjects, s.subject_key] : g.subjects.filter(k => k !== s.subject_key) }))} />{subjectTitles[s.subject_key] || s.subject_key} · {(s.price_per_child_minor / 100).toFixed(2)} ر.س</label>)}</div></div>}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 14, flexWrap: 'wrap' }}>
          <button style={primary} disabled={busy === 'grant' || !plans.length}>{busy === 'grant' ? 'جارٍ الإنشاء…' : 'إنشاء العقد ومنح الرصيد'}</button>
          {selectedPlan && <span style={{ color: 'var(--muted)' }}>المبلغ المستحق (snapshot): {quoted == null ? '—' : `${(quoted / 100).toFixed(2)} ${selectedPlan.currency || 'SAR'}`} · الرصيد الممنوح: {minutesToLabel((selectedPlan.included_hours || 0) * 60)}</span>}
          {!plans.length && <span style={{ color: 'var(--muted)' }}>لا توجد خطط نشطة في الكتالوج.</span>}
        </div>
      </form>}
    </section>

    {state === 'ready' && <section style={box}>
      <h3 style={{ marginTop: 0 }}>العقود ({contracts.length})</h3>
      {!contracts.length ? <p>لا توجد عقود بعد.</p> : <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}>
        <thead><tr>{['الطفل', 'الخطة', 'التغطية', 'المدة', 'الحالة', 'الرصيد المتبقي', 'الملاحظة', ''].map(x => <th key={x} style={th}>{x}</th>)}</tr></thead>
        <tbody>{contracts.map(k => <tr key={k.id}>
          <td style={td}>{childLabel(k.child_id)}</td>
          <td style={td}>{k.plan_snapshot?.name || '—'}<br /><small style={{ color: 'var(--muted)' }}>{k.included_hours_snapshot ?? '—'} س · {k.quoted_total_minor == null ? '—' : `${(k.quoted_total_minor / 100).toFixed(2)} ${k.currency || 'SAR'}`}</small></td>
          <td style={td}>{k.coverage_mode_snapshot === 'all' ? 'كل المواد' : 'مواد محددة'}</td>
          <td style={td}>{fmtDate(k.starts_at)} → {fmtDate(k.ends_at)}</td>
          <td style={td}>{CONTRACT_STATUS_LABEL[k.status] || k.status}</td>
          <td style={td}><strong>{balances[k.id] == null ? '—' : minutesToLabel(balances[k.id])}</strong></td>
          <td style={{ ...td, maxWidth: 220, overflowWrap: 'anywhere' }}>{k.admin_note || '—'}</td>
          <td style={td}><button style={button} onClick={() => showLedger(k)}>الدفتر</button></td>
        </tr>)}</tbody></table></div>}
    </section>}

    {ledgerFor && <section style={box}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h3 style={{ margin: 0 }}>دفتر: {childLabel(ledgerFor.contract.child_id)} — {ledgerFor.contract.plan_snapshot?.name}</h3><button style={button} onClick={() => setLedgerFor(null)}>إغلاق</button></div>
      <p style={{ color: 'var(--muted)' }}>القيود لا تُعدَّل ولا تُحذف؛ التصحيح بعكس القيد مع سبب.</p>
      {!ledgerFor.rows.length ? <p>لا قيود.</p> : <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse' }}>
        <thead><tr>{['التاريخ', 'النوع', 'الدقائق', 'المادة', 'المصدر', 'السبب', ''].map(x => <th key={x} style={th}>{x}</th>)}</tr></thead>
        <tbody>{ledgerFor.rows.map(r => { const reversed = ledgerFor.rows.some(x => x.reverses_entry_id === r.id); return <tr key={r.id} style={reversed ? { opacity: 0.55, textDecoration: 'line-through' } : undefined}>
          <td style={td}>{fmtDateTime(r.created_at)}</td>
          <td style={td}>{{ grant: 'منحة', debit: 'خصم', reversal: 'عكس' }[r.entry_type]}</td>
          <td style={td}>{minutesToLabel(r.minutes)}</td>
          <td style={td}>{r.subject_key ? (subjectTitles[r.subject_key] || r.subject_key) : '—'}</td>
          <td style={td}>{{ contract_activation: 'تفعيل العقد', teacher_live_attendance: 'حضور مؤكَّد', admin_adjustment: 'تعديل إداري' }[r.source_type]}<br /><small style={{ color: 'var(--muted)', fontFamily: 'monospace' }}>{r.source_id}</small></td>
          <td style={td}>{r.reason || '—'}</td>
          <td style={td}>{r.entry_type !== 'reversal' && !reversed && <button style={button} onClick={() => reverseEntry(r)}>عكس</button>}</td>
        </tr>; })}</tbody></table></div>}
    </section>}

    {state === 'ready' && <section style={box}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ margin: 0 }}>الترحيل التلقائي {errorPostings.length ? <span style={{ color: 'var(--red, #c0392b)' }}>· {errorPostings.length} خطأ ينتظر الحل</span> : null}</h3>
        <button style={button} disabled={busy === 'sweep'} onClick={runSweep}>{busy === 'sweep' ? 'جارٍ الترحيل…' : 'ترحيل المستحق الآن'}</button>
      </div>
      <p style={{ color: 'var(--muted)' }}>يُعاد كل خطأ تلقائياً في كل جولة حتى يُحل (مثلاً بمنح عقد يغطي المادة). آخر 100 محاولة:</p>
      {!postings.length ? <p>لا محاولات ترحيل بعد.</p> : <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse' }}>
        <thead><tr>{['آخر محاولة', 'النتيجة', 'المحاولات', 'معرّف الحضور', 'الرسالة'].map(x => <th key={x} style={th}>{x}</th>)}</tr></thead>
        <tbody>{postings.map(p => <tr key={`${p.attendance_id}:${p.source_version}`}>
          <td style={td}>{fmtDateTime(p.last_attempt_at)}</td>
          <td style={td}>{POSTING_RESULT_LABEL[p.result] || p.result}</td>
          <td style={td}>{p.attempts}</td>
          <td style={{ ...td, fontFamily: 'monospace', fontSize: 11 }}>{p.attendance_id} <button type="button" style={{ ...button, padding: '2px 6px' }} onClick={() => setCorrection(c => ({ ...c, attendance_id: p.attendance_id }))}>تصحيح</button></td>
          <td style={{ ...td, overflowWrap: 'anywhere' }}>{p.error_message ? translateLedgerError(p.error_message) : '—'}</td>
        </tr>)}</tbody></table></div>}
    </section>}

    {state === 'ready' && <section style={box}>
      <h3 style={{ marginTop: 0 }}>تصحيح حضور مقفل (إداري)</h3>
      <p style={{ color: 'var(--muted)' }}>بعد 48 ساعة لا يستطيع المعلم التعديل. التصحيح هنا يُدقَّق باسمك ويُعاد ترحيله للدفتر فوراً.</p>
      <form onSubmit={submitCorrection} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end' }}>
        <label style={{ ...field, flex: '2 1 300px' }}>معرّف الحضور<input style={{ ...input, fontFamily: 'monospace' }} required value={correction.attendance_id} onChange={e => setCorrection(c => ({ ...c, attendance_id: e.target.value }))} placeholder="uuid" /></label>
        <label style={field}>الحالة<select style={input} value={correction.attended} onChange={e => setCorrection(c => ({ ...c, attended: e.target.value, minutes: e.target.value === 'true' ? c.minutes : '' }))}><option value="true">حضر</option><option value="false">غاب</option></select></label>
        {correction.attended === 'true' && <label style={field}>الدقائق الفعلية<input style={input} type="number" min="1" max="1440" step="1" required value={correction.minutes} onChange={e => setCorrection(c => ({ ...c, minutes: e.target.value }))} /></label>}
        <label style={{ ...field, flex: '2 1 260px' }}>السبب<input style={input} required minLength={3} value={correction.reason} onChange={e => setCorrection(c => ({ ...c, reason: e.target.value }))} /></label>
        <button style={primary} disabled={busy === 'correction'}>{busy === 'correction' ? 'جارٍ التصحيح…' : 'تصحيح وإعادة الترحيل'}</button>
      </form>
    </section>}
  </div>;
}
