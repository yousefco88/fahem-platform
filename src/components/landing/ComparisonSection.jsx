import React from 'react';
import { useSiteSettings } from '../../context/SiteSettingsContext';

export default function ComparisonSection() {
  const { settings } = useSiteSettings();
  const { badge, title, subtitle, fahemColumn, otherColumn, rows } = settings.comparison;

  return (
    <section id="comparison" style={{ padding: '70px 24px', background: 'var(--bg)' }}>
      <div style={{ maxWidth: '1050px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <span className="tag-badge info" style={{ marginBottom: '8px' }}>{badge}</span>
          <h2 style={{ fontSize: '30px', fontWeight: 900, color: 'var(--navy)' }}>
            {title}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '15px' }}>
            {subtitle}
          </p>
        </div>

        <div style={{ background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid var(--line)', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: 'var(--bg)', borderBottom: '2px solid var(--line)' }}>
                <th style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--navy)' }}>وجه المقارنة</th>
                <th style={{ padding: '16px 20px', fontWeight: 900, color: 'var(--blue)', background: 'var(--blue-light)' }}>{fahemColumn}</th>
                <th style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--muted)' }}>{otherColumn}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--navy)' }}>{row.aspect}</td>
                  <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--green-text)', background: 'var(--green-light)' }}>
                    ✓ {row.fahem}
                  </td>
                  <td style={{ padding: '16px 20px', color: 'var(--muted)' }}>
                    ❌ {row.other}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
