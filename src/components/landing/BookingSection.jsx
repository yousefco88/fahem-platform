import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { launchConfetti } from '../../utils/confetti';
import { supabase } from '../../lib/supabase';
import { useSiteSettings } from '../../context/SiteSettingsContext';

// رمز الدولة (ISO) يُحفظ في country_code بدل نص الخيار
const COUNTRY_CODES = {
  '🇸🇦 المملكة العربية السعودية': 'SA',
  '🇦🇪 دولة الإمارات العربية المتحدة': 'AE',
  '🇰🇼 دولة الكويت': 'KW',
  '🇶🇦 دولة قطر': 'QA',
  '🇬🇧 المملكة المتحدة وأوروبا': 'EU',
  '🇺🇸 الولايات المتحدة وكندا': 'US',
};

export default function BookingSection() {
  const { setCurrentScreen, triggerToast, soundManager } = useApp();
  const { settings } = useSiteSettings();
  const bookingTexts = settings.booking;

  const [parentName, setParentName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [childName, setChildName] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('الصف الأول الابتدائي (المنهج العام)');
  const [selectedCountry, setSelectedCountry] = useState('🇸🇦 المملكة العربية السعودية');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!parentName.trim() || !whatsappNumber.trim() || !childName.trim()) {
      triggerToast('يرجى ملء جميع الحقول المطلوبة للتسجيل');
      return;
    }

    if (!supabase) {
      triggerToast('نموذج الحجز غير متصل حاليًا بالخادم.');
      return;
    }
    const { error } = await supabase.from('bookings').insert({
      parent_name: parentName.trim(),
      whatsapp: whatsappNumber.trim(),
      child_name: childName.trim(),
      grade: selectedGrade,
      country_code: COUNTRY_CODES[selectedCountry] || null
    });
    if (error) {
      triggerToast('تعذر حفظ الطلب. حاول مرة أخرى.');
      return;
    }
    setBookingSuccess(true);
    launchConfetti();
    soundManager.playSuccess();
    soundManager.speak(`أهلاً بك يا أستاذ ${parentName}! تم تسجيل طلب الحصة التجريبية للبطل ${childName}.`);
    triggerToast(`تم استلام طلب الحصة التجريبية لـ ${childName}.`);
  };

  return (
    <section id="booking-section" style={{
      padding: '70px 24px', background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', color: 'white'
    }}>
      <div style={{ maxWidth: '650px', margin: '0 auto', textAlign: 'center' }}>

        <span style={{
          background: 'rgba(255,255,255,0.2)', padding: '6px 16px', borderRadius: 'var(--radius-full)',
          fontSize: '12.5px', fontWeight: 800, display: 'inline-block', marginBottom: '16px'
        }}>
          {bookingTexts.badge}
        </span>

        <h2 style={{ fontSize: '32px', fontWeight: 900, marginBottom: '12px' }}>
          {bookingTexts.title}
        </h2>
        <p style={{ fontSize: '15px', color: '#dbeafe', marginBottom: '30px' }}>
          {bookingTexts.subtitle}
        </p>

        <div style={{
          background: 'var(--card-bg)', color: 'var(--navy)', borderRadius: '24px',
          padding: '36px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)', textAlign: 'right'
        }}>
          {bookingSuccess ? (
            <div style={{ textAlign: 'center', padding: '20px 10px' }}>
              <div style={{ fontSize: '54px', marginBottom: '12px' }}>🎉</div>
              <h3 style={{ fontSize: '22px', color: 'var(--green-text)', marginBottom: '8px' }}>
                تم استلام طلبك بنجاح
              </h3>
              <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.6, marginBottom: '20px' }}>
                حُفظ طلب الحصة التجريبية باسم <strong>{childName}</strong> لدى فريق فاهم، وسنتواصل معك عبر واتساب لتأكيد الموعد. (لا يُعد هذا تأكيدًا نهائيًا للموعد حتى يصلك التواصل.)
              </p>
              <button
                className="btn-accent"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => setCurrentScreen('child')}
              >
                دخول مساحة الطفل التفاعلية الآن 🚀
              </button>
            </div>
          ) : (
            <form onSubmit={handleBookingSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label className="u-9">
                  اسم ولي الأمر الكريم
                </label>
                <input
                  type="text"
                  placeholder="مثال: أحمد الشافعي"
                  className="u-25"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label className="u-9">
                    رقم الواتساب (مع مفتاح الدولة)
                  </label>
                  <input
                    type="tel"
                    placeholder="مثال: +966 50 123 4567"
                    className="u-25"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="u-9">
                    دولة الإقامة الحالية
                  </label>
                  <select
                    style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--line)', borderRadius: '10px', fontSize: '13.5px', background: 'var(--card-bg)' }}
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                  >
                    <option>🇸🇦 المملكة العربية السعودية</option>
                    <option>🇦🇪 دولة الإمارات العربية المتحدة</option>
                    <option>🇰🇼 دولة الكويت</option>
                    <option>🇶🇦 دولة قطر</option>
                    <option>🇬🇧 المملكة المتحدة وأوروبا</option>
                    <option>🇺🇸 الولايات المتحدة وكندا</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '22px' }}>
                <div>
                  <label className="u-9">
                    اسم الطفل (البطل)
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: عمر"
                    className="u-25"
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="u-9">
                    الصف الدراسي الحالي
                  </label>
                  <select
                    style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--line)', borderRadius: '10px', fontSize: '13.5px', background: 'var(--card-bg)' }}
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                  >
                    <option>الصف الأول الابتدائي (المنهج العام)</option>
                    <option>الصف الأول الابتدائي (مدارس لغات / تجريبي)</option>
                    <option>مرحلة التأسيس والتهيئة (KG1 / KG2)</option>
                    <option>الصف الثاني الابتدائي</option>
                  </select>
                </div>
              </div>

              <button
                className="btn-accent"
                type="submit"
                style={{
                  width: '100%', justifyContent: 'center', fontSize: '16px',
                  padding: '14px', borderRadius: 'var(--radius-full)'
                }}
              >
                <span>{bookingTexts.submitLabel}</span>
                <span>📲</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
