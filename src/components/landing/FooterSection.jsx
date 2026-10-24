import React from 'react';
import { useApp } from '../../context/AppContext';
import { useSiteSettings } from '../../context/SiteSettingsContext';

export default function FooterSection() {
  const { setCurrentScreen } = useApp();
  const { settings } = useSiteSettings();
  const { footer, header } = settings;

  return (
    <footer style={{ background: '#0f172a', color: 'white', padding: '50px 24px 30px' }}>
      <div style={{
        maxWidth: '1100px', margin: '0 auto', display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '30px', marginBottom: '40px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--blue)', color: 'white', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: '20px' }}>ف</div>
            <span style={{ fontSize: '20px', fontWeight: 900 }}>{header.brandName}</span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.6 }}>
            {footer.about}
          </p>
        </div>

        <div>
          <h4 style={{ fontSize: '15px', marginBottom: '14px', color: '#f8fafc' }}>روابط سريعة</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
            <button style={{ background: 'none', border: 'none', color: '#94a3b8', textAlign: 'right', cursor: 'pointer' }} onClick={() => setCurrentScreen('parent')}>لوحة ولي الأمر</button>
            <button style={{ background: 'none', border: 'none', color: '#94a3b8', textAlign: 'right', cursor: 'pointer' }} onClick={() => setCurrentScreen('child')}>مساحة الطفل التفاعلية</button>
            <button style={{ background: 'none', border: 'none', color: '#94a3b8', textAlign: 'right', cursor: 'pointer' }} onClick={() => setCurrentScreen('exam')}>محاكي امتحانات السفارة</button>
            <button style={{ background: 'none', border: 'none', color: '#94a3b8', textAlign: 'right', cursor: 'pointer' }} onClick={() => setCurrentScreen('pricing')}>باقات الاشتراك والأسعار</button>
          </div>
        </div>

        <div>
          <h4 style={{ fontSize: '15px', marginBottom: '14px', color: '#f8fafc' }}>تواصل معنا</h4>
          <div style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.7 }}>
            {(footer.contactLines || []).map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #1e293b', paddingTop: '20px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
        {footer.copyright}
      </div>
    </footer>
  );
}
