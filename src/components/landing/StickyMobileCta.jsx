import React, { useEffect, useState } from 'react';
import { scrollToBooking } from './LandingHeader';
import Emoji from '../../ui/Emoji';

// CTA عائم للجوال — يظهر بعد تجاوز قسم الهيرو ويختفي عند نموذج الحجز
export default function StickyMobileCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const past = window.scrollY > 600;
      const booking = document.getElementById('booking-section');
      let nearBooking = false;
      if (booking) {
        const r = booking.getBoundingClientRect();
        nearBooking = r.top < window.innerHeight && r.bottom > 0;
      }
      setVisible(past && !nearBooking);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <div className="sticky-mobile-cta" style={{
      position: 'fixed', bottom: '16px', left: '16px', right: '16px', zIndex: 60,
      display: 'none'
    }}>
      <button
        className="btn-accent"
        style={{
          width: '100%', padding: '14px', fontSize: '15px', fontWeight: 900,
          borderRadius: 'var(--radius-full)', boxShadow: '0 12px 30px rgba(234, 88, 12, 0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
        }}
        onClick={scrollToBooking}
      >
        <span>احجز حصة تجريبية مجانية</span>
        <span><Emoji>🎁</Emoji></span>
      </button>
      <style>{`
        @media (max-width: 768px) {
          .sticky-mobile-cta { display: block !important; }
        }
      `}</style>
    </div>
  );
}
