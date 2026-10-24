import React from 'react';
import { useApp } from '../../context/AppContext';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import { scrollToBooking } from './LandingHeader';

export default function HeroSection() {
  const { setCurrentScreen } = useApp();
  const { settings } = useSiteSettings();
  const { hero } = settings;

  return (
    <section style={{
      background: 'radial-gradient(circle at 10% 20%, #eff6ff 0%, #ffffff 80%)',
      padding: 'clamp(40px, 8vw, 70px) clamp(16px, 4vw, 24px) clamp(40px, 6vw, 60px)',
      textAlign: 'center', position: 'relative', overflow: 'hidden'
    }}>
      <div style={{ maxWidth: '950px', margin: '0 auto' }}>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: '#e0e7ff', color: '#3730a3', padding: '6px 18px',
          borderRadius: 'var(--radius-full)', fontSize: 'clamp(11px, 2.5vw, 13px)', fontWeight: 800, marginBottom: '24px'
        }}>
          <span>{hero.badge}</span>
        </div>

        <h1 style={{
          fontSize: 'clamp(26px, 6vw, 44px)', fontWeight: 900, color: '#0f172a', lineHeight: 1.25,
          marginBottom: '20px', letterSpacing: '-0.5px', textShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
          {hero.titleLine1} <br />
          <span style={{ background: 'linear-gradient(135deg, #1d4ed8, #0891b2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {hero.titleHighlight}
          </span>
        </h1>

        <p style={{
          fontSize: 'clamp(14px, 3vw, 18px)', color: '#475569', lineHeight: 1.7, maxWidth: '780px',
          margin: '0 auto 36px'
        }}>
          {hero.subtitle}
        </p>

        {/* Hero CTAs */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '40px' }}>
          <button
            className="btn-accent"
            style={{
              fontSize: 'clamp(14px, 3vw, 18px)', padding: 'clamp(12px, 3vw, 16px) clamp(20px, 5vw, 36px)', borderRadius: 'var(--radius-full)',
              boxShadow: '0 12px 30px rgba(234, 88, 12, 0.3)'
            }}
            onClick={scrollToBooking}
          >
            <span>{hero.ctaPrimary}</span>
            <span>🎁</span>
          </button>

          <button
            style={{
              background: 'white', color: 'var(--navy)', border: '2px solid #cbd5e1',
              fontSize: 'clamp(13px, 2.5vw, 16px)', padding: 'clamp(12px, 3vw, 16px) clamp(16px, 4vw, 28px)', borderRadius: 'var(--radius-full)',
              fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: 'var(--shadow-sm)'
            }}
            onClick={() => setCurrentScreen('child')}
          >
            <span>{hero.ctaSecondary}</span>
            <span>🦊</span>
          </button>
        </div>

        {/* Product Preview — مبني من مكونات حقيقية موجودة في المنصة */}
        <div style={{
          maxWidth: '760px', margin: '0 auto 40px', borderRadius: '20px', overflow: 'hidden',
          border: '1px solid #e2e8f0', boxShadow: '0 25px 60px -15px rgba(30, 58, 138, 0.25)',
          background: 'white', textAlign: 'right'
        }}>
          {/* window bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f87171' }} />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fbbf24' }} />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#34d399' }} />
            <span style={{ marginRight: 'auto', fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>fahem-platform.vercel.app</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', padding: '18px' }}>
            <div style={{ background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)', borderRadius: '14px', padding: '16px' }}>
              <div style={{ fontSize: '26px', marginBottom: '6px' }}>🦊</div>
              <div style={{ fontWeight: 900, fontSize: '13.5px', color: 'var(--navy)', marginBottom: '2px' }}>مساحة الطفل التفاعلية</div>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>دروس وألعاب تعليمية بشخصية فاهم</div>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #f0fdfa, #ccfbf1)', borderRadius: '14px', padding: '16px' }}>
              <div style={{ fontSize: '26px', marginBottom: '6px' }}>📊</div>
              <div style={{ fontWeight: 900, fontSize: '13.5px', color: 'var(--navy)', marginBottom: '2px' }}>لوحة متابعة ولي الأمر</div>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>مصفوفة إتقان وتقارير تقدم حقيقية</div>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #fef2f2, #fee2e2)', borderRadius: '14px', padding: '16px' }}>
              <div style={{ fontSize: '26px', marginBottom: '6px' }}>🇪🇬</div>
              <div style={{ fontWeight: 900, fontSize: '13.5px', color: 'var(--navy)', marginBottom: '2px' }}>محاكي امتحانات السفارة</div>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>تدريب مجاني بنمط الامتحان الرسمي</div>
            </div>
          </div>
        </div>

        {/* Social Proof Strip - Horizontal Scroll on Mobile */}
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'clamp(16px, 4vw, 32px)',
          flexWrap: 'nowrap', paddingTop: '20px', borderTop: '1px solid #e2e8f0', color: '#64748b',
          fontSize: 'clamp(11px, 2.5vw, 13.5px)', overflowX: 'auto', WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none', msOverflowStyle: 'none'
        }}>
          <div style={{ whiteSpace: 'nowrap' }}>
            <strong>🇪🇬 المنهج الوزاري الرسمي</strong>
          </div>
          <div style={{ whiteSpace: 'nowrap' }}>
            <strong>👩‍🏫 مجموعات مصغرة (4 طلاب)</strong>
          </div>
          <div style={{ whiteSpace: 'nowrap' }}>
            <strong>📼 أرشفة ذكية لكل حصة</strong>
          </div>
          <div style={{ whiteSpace: 'nowrap' }}>
            <strong>🕐 مواعيد تناسب الخليج وأوروبا</strong>
          </div>
          <div style={{ whiteSpace: 'nowrap' }}>
            <strong>🇪🇬 محاكي امتحانات السفارة</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
