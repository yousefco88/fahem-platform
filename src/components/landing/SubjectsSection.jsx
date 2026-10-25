import React from 'react';
import { useSiteSettings } from '../../context/SiteSettingsContext';

export default function SubjectsSection() {
  const { settings } = useSiteSettings();
  const { badge, titleSuffix, subtitle, items: subjects } = settings.subjects;

  return (
    <section id="subjects" style={{ padding: '70px 24px', background: 'var(--card-bg)' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <span className="tag-badge info" style={{ marginBottom: '8px' }}>{badge}</span>
          <h2 style={{ fontSize: '30px', fontWeight: 900, color: 'var(--navy)' }}>
            {subjects.length} {titleSuffix}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '15px' }}>
            {subtitle}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
          {subjects.map((s, i) => (
            <div
              key={i}
              style={{
                background: 'var(--bg)', border: '1.5px solid var(--line)', borderRadius: '16px',
                padding: '20px', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
              }}
            >
              <div>
                <div className="u-21">
                  <span style={{ fontSize: '32px' }}>{s.icon}</span>
                  <span className="tag-badge info" style={{ fontSize: '11px' }}>{s.badge}</span>
                </div>
                <h3 className="u-8">{s.title}</h3>
                <p style={{ fontSize: '12.5px', color: 'var(--muted)', lineHeight: 1.5 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
