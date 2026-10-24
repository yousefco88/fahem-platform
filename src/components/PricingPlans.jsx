import React from 'react';
import { useApp } from '../context/AppContext';
import { useSiteSettings } from '../context/SiteSettingsContext';

// صفحة الباقات — كل المحتوى قابل للتعديل من لوحة الإدارة ⚙️ إعدادات الموقع
export default function PricingPlans() {
  const { triggerToast } = useApp();
  const { settings } = useSiteSettings();
  const { pricing } = settings;

  const ctaMessages = {
    trial: 'الحجز غير متاح بعد؛ لا يُرسل هذا النموذج طلبًا فعليًا.',
    foundation: 'الاشتراك والدفع غير متاحين في النموذج التجريبي.',
    vip: 'طلبات الاستشارة غير متصلة بفريق أو نظام حجز بعد.'
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 24px', textAlign: 'center' }}>
      <div style={{ marginBottom: '36px' }}>
        <div style={{
          display: 'inline-block', background: '#eff6ff', color: 'var(--blue)',
          fontWeight: 800, fontSize: '13px', padding: '6px 16px', borderRadius: 'var(--radius-full)', marginBottom: '12px'
        }}>
          {pricing.badge}
        </div>
        <h1 style={{ fontSize: '34px', marginBottom: '12px', color: 'var(--navy)' }}>
          {pricing.title}
        </h1>
        {pricing.disclaimer && (
          <p style={{ color: 'var(--muted)', fontSize: '16px', maxWidth: '650px', margin: '0 auto' }}>
            {pricing.disclaimer}
          </p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', alignItems: 'stretch' }}>
        {(pricing.plans || []).map(plan => (
          <div
            key={plan.id}
            style={plan.featured ? {
              background: 'linear-gradient(180deg, #ffffff 0%, #eff6ff 100%)', border: '2px solid var(--blue)',
              borderRadius: '28px', padding: '36px 28px', display: 'flex', flexDirection: 'column',
              position: 'relative', textAlign: 'right', boxShadow: '0 20px 35px -5px rgba(37,99,235,0.2)'
            } : {
              background: 'white', border: '2px solid var(--line)', borderRadius: '28px',
              padding: '36px 28px', display: 'flex', flexDirection: 'column', textAlign: 'right',
              position: 'relative'
            }}
          >
            {plan.ribbon && (
              <div style={{
                position: 'absolute', top: '-14px', right: '50%', transform: 'translateX(50%)',
                background: 'var(--blue)', color: 'white', padding: '5px 18px', borderRadius: 'var(--radius-full)',
                fontSize: '12px', fontWeight: 800, whiteSpace: 'nowrap'
              }}>
                {plan.ribbon}
              </div>
            )}
            <h3 style={{ fontSize: '22px', marginBottom: '8px', color: 'var(--navy)' }}>{plan.name}</h3>
            <p style={{ fontSize: '13.5px', color: 'var(--muted)', marginBottom: '24px', minHeight: '42px' }}>
              {plan.description}
            </p>
            <div style={{ fontSize: '38px', fontWeight: 900, color: 'var(--navy)', marginBottom: '4px' }}>
              {plan.price} {plan.priceNote && <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--muted)' }}>{plan.priceNote}</span>}
            </div>
            {plan.priceSubNote && <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{plan.priceSubNote}</span>}
            <ul style={{ listStyle: 'none', margin: '28px 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              {(plan.features || []).map((feature, i) => (
                <li key={i} style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: 'var(--green)', fontWeight: 900 }}>✓</span> {feature}
                </li>
              ))}
            </ul>
            <button
              className={plan.featured ? 'btn-accent' : undefined}
              style={plan.featured
                ? { width: '100%', justifyContent: 'center', padding: '15px' }
                : { background: '#f1f5f9', color: 'var(--navy)', border: 'none', width: '100%', padding: '14px', borderRadius: 'var(--radius-md)', fontWeight: 700 }}
              onClick={() => triggerToast(ctaMessages[plan.id] || 'هذه الخدمة غير متاحة بعد.')}
            >
              {plan.ctaLabel}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
