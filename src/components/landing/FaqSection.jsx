import React, { useState } from 'react';
import { useSiteSettings } from '../../context/SiteSettingsContext';

export default function FaqSection() {
  const [openFaq, setOpenFaq] = useState(0);
  const { settings } = useSiteSettings();
  const { badge, title, items: faqs } = settings.faq;

  return (
    <section id="faq" style={{ padding: '70px 24px', background: 'var(--card-bg)' }}>
      <div style={{ maxWidth: '850px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <span className="tag-badge info" style={{ marginBottom: '8px' }}>{badge}</span>
          <h2 style={{ fontSize: '30px', fontWeight: 900, color: 'var(--navy)' }}>
            {title}
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {faqs.map((faq, i) => (
            <div
              key={i}
              style={{
                border: '1.5px solid var(--line)', borderRadius: '16px',
                background: openFaq === i ? 'var(--bg)' : 'var(--card-bg)', overflow: 'hidden'
              }}
            >
              <button
                style={{
                  width: '100%', padding: '18px 20px', background: 'none', border: 'none',
                  textAlign: 'right', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontWeight: 800, fontSize: '15px', color: 'var(--navy)', cursor: 'pointer'
                }}
                onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
              >
                <span>{faq.q}</span>
                <span style={{ fontSize: '18px', color: 'var(--blue-text)' }}>{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && (
                <div style={{ padding: '0 20px 18px', color: 'var(--muted)', fontSize: '14px', lineHeight: 1.6 }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
