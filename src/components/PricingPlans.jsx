import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
// المصدر الوحيد للأسعار هو الخطط النشطة في كتالوج الإدارة، لا site_settings.pricing.plans.
export default function PricingPlans() {
  const [catalog, setCatalog] = useState({ status: 'loading', plans: [], subjects: [], titles: {} });

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!supabase) { if (mounted) setCatalog(c => ({ ...c, status: 'error' })); return; }
      try {
        const [plans, subjects, titles] = await Promise.all([
          supabase.from('subscription_plans').select('id,name,duration_days,included_hours,coverage_mode,price_per_child_minor,currency').eq('status', 'active').order('created_at'),
          supabase.from('subscription_plan_subjects').select('plan_id,subject_key,price_per_child_minor'),
          supabase.from('curriculum_subjects').select('key,title').eq('published', true),
        ]);
        if (plans.error || subjects.error || titles.error) throw plans.error || subjects.error || titles.error;
        if (mounted) setCatalog({ status: 'ready', plans: plans.data || [], subjects: subjects.data || [], titles: Object.fromEntries((titles.data || []).map(s => [s.key, s.title])) });
      } catch {
        if (mounted) setCatalog(c => ({ ...c, status: 'error' }));
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 24px', textAlign: 'center' }}>
      <header style={{ marginBottom: '36px' }}>
        <h1 style={{ fontSize: '34px', marginBottom: '12px', color: 'var(--navy)' }}>خطط الاشتراكات</h1>
        <p style={{ color: 'var(--muted)' }}>المدة والساعات والأسعار المعروضة من كتالوج الإدارة. تُفعّل للطفل بعد مراجعة الإدارة.</p>
      </header>

      {catalog.status === 'loading' && <p role="status">جارٍ تحميل الاشتراكات…</p>}
      {catalog.status === 'error' && <p role="alert">تعذر تحميل كتالوج الاشتراكات حالياً. حاول لاحقاً.</p>}
      {catalog.status === 'ready' && !catalog.plans.length && <p>لا توجد خطط اشتراك نشطة حالياً.</p>}
      {catalog.status === 'ready' && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
        {catalog.plans.map(plan => {
          const subjects = catalog.subjects.filter(s => s.plan_id === plan.id);
          return <article key={plan.id} style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 24, padding: 28, textAlign: 'right' }}>
            <h2>{plan.name}</h2>
            <p>{plan.duration_days} يوم · {plan.included_hours} ساعة لكل طفل</p>
            {plan.coverage_mode === 'all'
              ? <p>تشمل كل المواد المتاحة</p>
              : <ul>{subjects.map(subject => <li key={subject.subject_key}>{catalog.titles[subject.subject_key] || subject.subject_key}: {(subject.price_per_child_minor / 100).toFixed(2)} ر.س</li>)}</ul>}
            <p style={{ fontWeight: 800 }}>{plan.coverage_mode === 'all' ? `${(plan.price_per_child_minor / 100).toFixed(2)} ر.س للطفل` : 'السعر حسب المواد المختارة للطفل'}</p>
            <p style={{ color: 'var(--muted)' }}>التفعيل بعد مراجعة الإدارة وتأكيد الدفع خارج المنصة؛ لا يوجد دفع إلكتروني هنا.</p>
            <Link to="/account" className="btn-accent" style={{ display: 'inline-block', padding: '10px 16px' }}>مساحتي والاشتراكات</Link>
          </article>;
        })}
      </div>}
    </div>
  );
}
