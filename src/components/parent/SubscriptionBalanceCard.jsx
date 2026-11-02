import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';
import { minutesToLabel, CONTRACT_STATUS_LABEL, isMissingSchemaError, describeLedgerEntry } from '../../lib/subscriptionLedger';
import Emoji from '../../ui/Emoji';

// Read-only: the active child's subscription contracts with remaining minutes from the ledger.
// Renders nothing when the child has no contracts or the ledger is not deployed in this environment.
export default function SubscriptionBalanceCard() {
  const { activeChildCloudId } = useApp();
  const [rows, setRows] = useState(null);
  const [status, setStatus] = useState('loading');
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    let cancelled = false;
    if (!supabase || !activeChildCloudId) { setRows(null); setStatus('no-child'); return undefined; }
    setRows(null); setActivity([]); setStatus('loading');
    (async () => {
      const { data, error } = await supabase.from('child_subscription_contracts')
        .select('id, plan_snapshot, included_hours_snapshot, coverage_mode_snapshot, starts_at, ends_at, status')
        .eq('child_id', activeChildCloudId).in('status', ['active', 'cancel_scheduled', 'frozen']).order('ends_at', { ascending: false });
      if (cancelled) return;
      if (error) { setStatus(isMissingSchemaError(error) ? 'unavailable' : 'error'); return; }
      if (!data?.length) { setRows([]); setStatus('ready'); return; }
      const [balances, ledger] = await Promise.all([
        Promise.all(data.map(k => supabase.rpc('contract_balance_minutes', { p_contract_id: k.id }).then(r => (r.error ? null : r.data)))),
        supabase.from('subscription_hour_ledger').select('id, entry_type, minutes, subject_key, reason, created_at')
          .eq('child_id', activeChildCloudId).order('created_at', { ascending: false }).limit(10),
      ]);
      if (cancelled) return;
      setRows(data.map((k, i) => ({ ...k, balance: balances[i] })));
      setActivity(ledger.error ? null : (ledger.data || []));
      setStatus('ready');
    })();
    return () => { cancelled = true; };
  }, [activeChildCloudId]);

  if (status === 'no-child') return null;
  if (status !== 'ready') return <div className="card u-3" role="status" style={{ padding: 16 }}>{status === 'loading' ? 'جارٍ تحميل الاشتراك…' : status === 'unavailable' ? 'رصيد الاشتراكات غير مفعّل في هذه البيئة.' : 'تعذر تحميل رصيد الاشتراك. حاول تحديث الصفحة.'}</div>;
  return (
    <div className="card u-3" style={{ padding: 16 }}>
      <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Emoji>⏳</Emoji> رصيد ساعات الاشتراك</h3>
      {!rows?.length && <p>لا يوجد اشتراك نشط لهذا الطفل. تصفح <a href="/subscriptions">خطط الاشتراكات</a>؛ يُفعّل الاشتراك من الإدارة بعد تأكيد الدفع خارج المنصة.</p>}
      {(rows || []).map(k => (
        <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '8px 0', borderTop: '1px solid var(--line)' }}>
          <div>
            <strong>{k.plan_snapshot?.name || 'اشتراك'}</strong> · {k.coverage_mode_snapshot === 'all' ? 'كل المواد' : 'مواد محددة'}
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>حتى {new Date(k.ends_at).toLocaleDateString('ar-SA')} · {CONTRACT_STATUS_LABEL[k.status] || k.status}</div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{k.balance == null ? '—' : minutesToLabel(k.balance)}</div>
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>من {minutesToLabel((k.included_hours_snapshot || 0) * 60)}</div>
          </div>
        </div>
      ))}
      {!!rows?.length && (
        <div style={{ marginTop: 12 }}>
          <h4 style={{ margin: '0 0 6px' }}>آخر الحركات</h4>
          {activity === null && <p style={{ color: 'var(--muted)', fontSize: 13 }}>تعذر تحميل سجل الحركة.</p>}
          {activity?.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 13 }}>لا توجد حركات بعد.</p>}
          {!!activity?.length && (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {activity.map(e => (
                <li key={e.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0', borderTop: '1px solid var(--line)', fontSize: 14 }}>
                  <span>{describeLedgerEntry(e)}<span style={{ color: 'var(--muted)', fontSize: 12, marginInlineStart: 8 }}>{new Date(e.created_at).toLocaleDateString('ar-SA')}</span></span>
                  <strong dir="ltr" style={{ color: e.minutes < 0 ? 'var(--danger, #C8102E)' : 'inherit' }}>{e.minutes > 0 ? '+' : ''}{minutesToLabel(e.minutes)}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <p style={{ color: 'var(--muted)', fontSize: 12, margin: '8px 0 0' }}>يُخصم الرصيد من حضور الحصص المباشرة المؤكَّد من المعلم، بعد 48 ساعة من يوم الحصة.</p>
    </div>
  );
}
