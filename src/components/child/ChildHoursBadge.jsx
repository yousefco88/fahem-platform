import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { minutesToLabel } from '../../lib/subscriptionLedger';
import Emoji from '../../ui/Emoji';

// Child-facing: remaining live-session hours across the child's active contracts.
// Silent (renders nothing) when there is no active contract, the ledger is not deployed, or loading fails.
export default function ChildHoursBadge({ childId }) {
  const [minutes, setMinutes] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setMinutes(null);
    if (!supabase || !childId) return undefined;
    (async () => {
      const { data, error } = await supabase.from('child_subscription_contracts')
        .select('id').eq('child_id', childId).in('status', ['active', 'cancel_scheduled']);
      if (cancelled || error || !data?.length) return;
      const balances = await Promise.all(data.map(k => supabase.rpc('contract_balance_minutes', { p_contract_id: k.id }).then(r => (r.error ? null : r.data))));
      if (cancelled || balances.some(b => b == null)) return;
      setMinutes(balances.reduce((a, b) => a + Number(b), 0));
    })();
    return () => { cancelled = true; };
  }, [childId]);

  if (minutes == null) return null;
  return (
    <section className="card" role="status" style={{ marginBottom: 28, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 28 }}><Emoji>⏳</Emoji></span>
      <div>
        <div style={{ fontWeight: 800, fontSize: 18 }}>باقي لك {minutesToLabel(Math.max(0, minutes))} حصص مباشرة</div>
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>{minutes > 0 ? 'احضر حصصك واستفد منها 🌟' : 'خلصت ساعاتك، اطلب من ولي أمرك تجديد الاشتراك.'}</div>
      </div>
    </section>
  );
}
