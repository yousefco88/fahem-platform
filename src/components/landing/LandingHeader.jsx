import React from 'react';
import { useApp } from '../../context/AppContext';
import { useSiteSettings } from '../../context/SiteSettingsContext';

export const scrollToBooking = () => {
  document.getElementById('booking-section')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
};

export default function LandingHeader() {
  const { setCurrentScreen } = useApp();
  const { settings } = useSiteSettings();
  const { banner, header } = settings;
  // الروابط تتبع أقسام الصفحة الظاهرة فعلاً (الإدارة قد تخفي أقساماً) — لا روابط ميتة
  const sections = settings.landingLayout?.sections;
  const shown = (id) => !Array.isArray(sections) || !sections.length || sections.some(x => x.id === id && x.visible !== false);

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
        background: 'color-mix(in srgb, var(--card-bg) 95%, transparent)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, zIndex: 50,
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
            <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--navy)', lineHeight: 1.1 }}>{header.brandName}</h2>
            <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700 }}>{header.tagline}</span>
          </div>
        </div>

        {/* Quick Nav Links - Hidden on Mobile */}
        <nav className="desktop-nav" style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          <a href="#features" className="u-28">المميزات</a>
          {shown('subjects') && <a href="#subjects" className="u-28">المواد الـ 12</a>}
          {shown('timezone') && <a href="#timezone" className="u-28">حاسبة التوقيت</a>}
          {shown('comparison') && <a href="#comparison" className="u-28">مقارنة الدروس</a>}
          {shown('faq') && <a href="#faq" className="u-28">الأسئلة الشائعة</a>}
        </nav>

        {/* CTA Buttons */}
        <div className="desktop-cta" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
        background: 'var(--card-bg)',
        padding: '12px 16px',
        borderBottom: '1px solid var(--line)',
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
            <span style={{ fontSize: '18px', fontWeight: 900, color: 'var(--navy)' }}>فاهم</span>
          </div>
          <button
            className="btn-accent btn-compact"
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
