import React, { useState } from 'react';
import { useSiteSettings } from '../../context/SiteSettingsContext';

const timezoneData = {
  saudi: {
    country: '🇸🇦 المملكة العربية السعودية (الرياض / جدة / الدمام)',
    cairoTime: '5:00 مساءً',
    localTime: '6:00 مساءً',
    diffText: '+1 ساعة عن توقيت القاهرة',
    verdict: 'وقت مثالي جداً بعد عودة الطفل من المدرسة والغداء والاستراحة.'
  },
  uae: {
    country: '🇦🇪 دولة الإمارات العربية المتحدة (دبي / أبوظبي)',
    cairoTime: '5:00 مساءً',
    localTime: '7:00 مساءً',
    diffText: '+2 ساعة عن توقيت القاهرة',
    verdict: 'توقيت مسائي مريح قبل العشاء وأداء الواجبات بهدوء.'
  },
  kuwait: {
    country: '🇰🇼 دولة الكويت (مدينة الكويت / الأحمدي)',
    cairoTime: '5:00 مساءً',
    localTime: '6:00 مساءً',
    diffText: '+1 ساعة عن توقيت القاهرة',
    verdict: 'توقيت متوافق تماماً مع جدول الأسر في الكويت.'
  },
  qatar: {
    country: '🇶🇦 دولة قطر (الدوحة)',
    cairoTime: '5:00 مساءً',
    localTime: '6:00 مساءً',
    diffText: '+1 ساعة عن توقيت القاهرة',
    verdict: 'مريح ومناسب لأنشطة الطفل المسائية.'
  },
  uk: {
    country: '🇬🇧 المملكة المتحدة (لندن / مانشستر)',
    cairoTime: '5:00 مساءً',
    localTime: '3:00 أو 4:00 عصراً',
    diffText: '-1 أو -2 ساعة عن توقيت القاهرة',
    verdict: 'مباشرة بعد انتهاء اليوم الدراسي في بريطانيا.'
  },
  germany: {
    country: '🇩🇪 ألمانيا ودول الاتحاد الأوروبي (برلين / باريس)',
    cairoTime: '5:00 مساءً',
    localTime: '4:00 عصراً',
    diffText: '-1 ساعة عن توقيت القاهرة',
    verdict: 'توقيت عصري رائع للأطفال في أوروبا.'
  }
};

export default function TimezoneSection() {
  const [calcCountry, setCalcCountry] = useState('saudi');
  const currentCalc = timezoneData[calcCountry] || timezoneData.saudi;
  const { settings } = useSiteSettings();
  const { badge, title, subtitle } = settings.timezone;

  return (
    <section id="timezone" style={{
      padding: '60px 24px', background: 'var(--card-bg)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)'
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <span className="tag-badge info" style={{ marginBottom: '8px' }}>{badge}</span>
          <h2 style={{ fontSize: '30px', fontWeight: 900, color: 'var(--navy)' }}>
            {title}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '15px' }}>
            {subtitle}
          </p>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white',
          borderRadius: '24px', padding: '36px', boxShadow: '0 20px 40px rgba(15, 23, 42, 0.3)'
        }}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: 'var(--on-inverse)', marginBottom: '10px' }}>
              اختر بلد إقامتك الحالي:
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { id: 'saudi', label: '🇸🇦 السعودية' },
                { id: 'uae', label: '🇦🇪 الإمارات' },
                { id: 'kuwait', label: '🇰🇼 الكويت' },
                { id: 'qatar', label: '🇶🇦 قطر' },
                { id: 'uk', label: '🇬🇧 بريطانيا' },
                { id: 'germany', label: '🇩🇪 أوروبا' }
              ].map(b => (
                <button
                  key={b.id}
                  style={{
                    padding: '10px 18px', borderRadius: 'var(--radius-full)', fontWeight: 800, fontSize: '13px',
                    background: calcCountry === b.id ? 'var(--blue)' : '#334155',
                    color: 'white', border: 'none', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                  onClick={() => setCalcCountry(b.id)}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time Comparison Card */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.06)', border: '1.5px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '18px', padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px'
          }}>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--on-inverse)' }}>توقيت الحصة في القاهرة (مصر):</span>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#facc15', marginTop: '4px' }}>
                {currentCalc.cairoTime}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '12px', color: 'var(--on-inverse)' }}>التوقيت المحلي في {currentCalc.country}:</span>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#38bdf8', marginTop: '4px' }}>
                {currentCalc.localTime} ({currentCalc.diffText})
              </div>
            </div>

            <div style={{ gridColumn: '1 / -1', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '12px 18px', borderRadius: '12px', color: '#86efac', fontSize: '13.5px' }}>
              💡 <strong>الميزة لأطفالكم:</strong> {currentCalc.verdict}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
