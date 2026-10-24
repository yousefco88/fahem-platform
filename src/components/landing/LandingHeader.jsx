import React from 'react';
import { useApp } from '../../context/AppContext';
import { useSiteSettings } from '../../context/SiteSettingsContext';

export const scrollToBooking = () => {
  document.getElementById('booking-section')?.scrollIntoView({ behavior: 'smooth' });
};

export default function LandingHeader() {
  const { setCurrentScreen } = useApp();
  const { settings } = useSiteSettings();
  const { banner, header } = settings;

  return (
    <>
      {/* 1. Global Marketing Top Banner */}
      {banner.visible !== false && (
      <div style={{
        background: 'linear-gradient(90deg, #1e3a8a, #2563eb, #1d4ed8)', color: 'white',
        padding: '10px 20px', textAlign: 'center', fontSize: '13px', fontWeight: 700,
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', flexWrap: 'wrap'
      }}>
        <span>{banner.text}</span>
        <button
          style={{ background: '#facc15', color: '#1e1b4b', border: 'none', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontWeight: 900, fontSize: '11.5px', cursor: 'pointer' }}
          onClick={scrollToBooking}
        >
          {banner.buttonLabel}
        </button>
      </div>
      )}

      {/* 2. Marketing Header Navbar - Desktop Only */}
      <header className="desktop-header" style={{
        background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 50,
        padding: '14px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px'
      }}>
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setCurrentScreen('parent')}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '14px',
            background: 'linear-gradient(135deg, var(--blue), #1d4ed8)',
            color: 'white', display: 'grid', placeItems: 'center',
            fontSize: '24px', fontWeight: 900, boxShadow: 'var(--shadow-lg)'
          }}>
            ف
          </div>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>{header.brandName}</h2>
            <span style={{ fontSize: '11px', color: '#475569', fontWeight: 700 }}>{header.tagline}</span>
          </div>
        </div>

        {/* Quick Nav Links - Hidden on Mobile */}
        <nav className="desktop-nav" style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          <a href="#features" style={{ textDecoration: 'none', color: '#475569', fontSize: '13.5px', fontWeight: 700 }}>المميزات</a>
          <a href="#subjects" style={{ textDecoration: 'none', color: '#475569', fontSize: '13.5px', fontWeight: 700 }}>المواد الـ 12</a>
          <a href="#timezone" style={{ textDecoration: 'none', color: '#475569', fontSize: '13.5px', fontWeight: 700 }}>حاسبة التوقيت</a>
          <a href="#comparison" style={{ textDecoration: 'none', color: '#475569', fontSize: '13.5px', fontWeight: 700 }}>مقارنة الدروس</a>
          <a href="#testimonials" style={{ textDecoration: 'none', color: '#475569', fontSize: '13.5px', fontWeight: 700 }}>آراء الأسر</a>
          <a href="#faq" style={{ textDecoration: 'none', color: '#475569', fontSize: '13.5px', fontWeight: 700 }}>الأسئلة الشائعة</a>
        </nav>

        {/* CTA Buttons */}
        <div className="desktop-cta" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            style={{
              background: '#f1f5f9', color: '#1e293b', border: '1px solid #cbd5e1',
              padding: '9px 16px', borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: '13px', cursor: 'pointer'
            }}
            onClick={() => setCurrentScreen('exam')}
          >
            🇪🇬 محاكي السفارة
          </button>
          <button
            className="btn-accent"
            style={{ padding: '9px 20px', fontSize: '13px', borderRadius: 'var(--radius-full)' }}
            onClick={scrollToBooking}
          >
            <span>{header.ctaLabel}</span>
            <span>🚀</span>
          </button>
        </div>
      </header>

      {/* Mobile Header - Simplified */}
      <header className="mobile-header" style={{
        display: 'none',
        background: 'white',
        padding: '12px 16px',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--blue), #1d4ed8)',
              color: 'white', display: 'grid', placeItems: 'center',
              fontSize: '18px', fontWeight: 900
            }}>
              ف
            </div>
            <span style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>فاهم</span>
          </div>
          <button
            className="btn-accent"
            style={{ padding: '8px 14px', fontSize: '12px', borderRadius: '20px' }}
            onClick={scrollToBooking}
          >
            احجز مجاناً 🎁
          </button>
        </div>
      </header>

      <style>{`
        @media (max-width: 768px) {
          .desktop-header { display: none !important; }
          .mobile-header { display: block !important; }
          .desktop-nav { display: none !important; }
          .desktop-cta { display: none !important; }
        }
      `}</style>
    </>
  );
}
