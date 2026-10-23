import React from 'react';
import { useApp } from '../../context/AppContext';
import { scrollToBooking } from './LandingHeader';

export default function HeroSection() {
  const { setCurrentScreen } = useApp();

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
          <span>📚 محتوى تعليمي تجريبي قيد المراجعة الأكاديمية</span>
        </div>

        <h1 style={{
          fontSize: 'clamp(26px, 6vw, 44px)', fontWeight: 900, color: 'var(--navy)', lineHeight: 1.25,
          marginBottom: '20px', letterSpacing: '-0.5px'
        }}>
          التعليم الحي المتقن لأبنائنا في الخارج.. <br />
          <span style={{ color: 'var(--blue)', background: 'linear-gradient(135deg, #2563eb, #14b8a6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            كأن طفلك في أفضل مدارس مصر وأنت بجواره في الغربة
          </span>
        </h1>

        <p style={{
          fontSize: 'clamp(14px, 3vw, 18px)', color: '#475569', lineHeight: 1.7, maxWidth: '780px',
          margin: '0 auto 36px'
        }}>
          حصص تفاعلية مباشرة في <strong>مجموعات مصغرة (4 طلاب فقط)</strong> مع نخبة المعلمين المتخصصين، أرشفة ذكية دائمة لكل حصة، وإتقان تام للمنهج الوزاري وامتحانات السفارة بلا ضياع أو إحباط.
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
            <span>احجز حصة تجريبية مجانية لطفلك</span>
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
            <span>جرب مساحة الطفل التفاعلية</span>
            <span>🦊</span>
          </button>
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
