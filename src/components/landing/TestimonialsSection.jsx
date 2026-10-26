import React from 'react';
import { useSiteSettings } from '../../context/SiteSettingsContext';

export default function TestimonialsSection() {
  const { settings } = useSiteSettings();
  const { badge, title, subtitle } = settings.testimonials;

  // لا توجد شهادات حقيقية بعد — لا نعرض قسماً فارغاً
  return null;
  // eslint-disable-next-line no-unreachable
  return (
    <section id="testimonials" style={{ padding: '70px 24px', background: 'var(--bg)' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <span className="tag-badge info" style={{ marginBottom: '8px' }}>{badge}</span>
          <h2 style={{ fontSize: '30px', fontWeight: 900, color: 'var(--navy)' }}>
            {title}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '15px' }}>
            {subtitle}
          </p>
        </div>
      </div>
    </section>
  );
}
