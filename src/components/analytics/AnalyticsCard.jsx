/**
 * AnalyticsCard.jsx — بطاقة مؤشر بأسلوب المشروع (بلا Tailwind)
 * trend (إن مُرّر) يجب أن يكون سلسلة حقيقية محسوبة من البيانات — لا أرقام مزروعة.
 */
import React from 'react';

const COLORS = {
  blue:   { bg: 'var(--blue-light)', text: 'var(--blue-text)' },
  green:  { bg: 'var(--green-light)', text: 'var(--green-text)' },
  orange: { bg: 'var(--orange-light)', text: 'var(--orange-text)' },
  purple: { bg: 'var(--purple-light)', text: 'var(--purple-text)' },
  teal:   { bg: 'var(--teal-light)', text: 'var(--teal-text)' },
};

function Sparkline({ trend, color }) {
  if (!trend || trend.length < 2) return null;
  const max = Math.max(...trend);
  const min = Math.min(...trend);
  const range = max - min || 1;
  const W = 80, H = 30, P = 2;
  const points = trend
    .map((v, i) => `${P + (i / (trend.length - 1)) * (W - P * 2)},${H - P - ((v - min) / range) * (H - P * 2)}`)
    .join(' ');
  return (
    <svg width={W} height={H} style={{ opacity: 0.6, flexShrink: 0 }} aria-hidden="true">
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

export default function AnalyticsCard({ title, value, hint, icon, trend, color = 'blue' }) {
  const c = COLORS[color] || COLORS.blue;
  return (
    <div style={{
      background: 'var(--card-bg, var(--card-bg))', border: '1px solid var(--line, var(--line))',
      borderRadius: 16, padding: '16px 18px', minWidth: 0,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{
          width: 40, height: 40, borderRadius: 12, background: c.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
        }}>{icon}</span>
        <Sparkline trend={trend} color={c.text} />
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--muted, var(--muted))', fontWeight: 700, marginBottom: 2 }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 26, fontWeight: 900, color: c.text }}>{value}</span>
        {hint && <span style={{ fontSize: 11.5, color: 'var(--muted, var(--muted))' }}>{hint}</span>}
      </div>
    </div>
  );
}
