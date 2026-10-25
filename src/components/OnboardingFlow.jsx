import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function OnboardingFlow() {
  const {
    parentName, setParentName,
    childName, setChildName,
    grade, setGrade,
    addChild,
    country, setCountry,
    setCountryText,
    setCurrentScreen,
    triggerToast
  } = useApp();

  const [formParent, setFormParent] = useState(parentName);
  const [formChild, setFormChild] = useState(childName);
  const [formGrade, setFormGrade] = useState(grade);
  const [formCountry, setFormCountry] = useState(country);

  // Computed preview string
  const getTimezoneInfo = (c) => {
    switch (c) {
      case 'KSA':
      case 'KUW':
      case 'QAT':
        return {
          desc: 'حصة اليوم 6:00 م بتوقيت القاهرة توافق 7:00 م بتوقيت إقامتك بالخليج.',
          badge: 'الساعة 7:00 مساءً',
          label: 'المملكة العربية السعودية / الخليج (GMT+3)',
          liveTime: 'اليوم 7:00 م (بتوقيتك المحلي)'
        };
      case 'UAE':
        return {
          desc: 'حصة اليوم 6:00 م بتوقيت القاهرة توافق 8:00 م بتوقيت دبي بالإمارات.',
          badge: 'الساعة 8:00 مساءً',
          label: 'الإمارات العربية المتحدة (GMT+4)',
          liveTime: 'اليوم 8:00 م (بتوقيتك المحلي)'
        };
      case 'EGY':
        return {
          desc: 'حصة اليوم ستكون في موعدها المعتاد 6:00 م بتوقيت مصر.',
          badge: 'الساعة 6:00 مساءً',
          label: 'مصر (GMT+2)',
          liveTime: 'اليوم 6:00 م (بتوقيت مصر)'
        };
      case 'UK':
        return {
          desc: 'حصة اليوم 6:00 م بتوقيت القاهرة توافق 5:00 م بتوقيت بريطانيا.',
          badge: 'الساعة 5:00 مساءً',
          label: 'المملكة المتحدة (GMT+1)',
          liveTime: 'اليوم 5:00 م (بتوقيت لندن)'
        };
      case 'GER':
        return {
          desc: 'حصة اليوم 6:00 م بتوقيت القاهرة توافق 5:00 م بتوقيت ألمانيا وأوروبا.',
          badge: 'الساعة 5:00 مساءً',
          label: 'ألمانيا وأوروبا (GMT+1)',
          liveTime: 'اليوم 5:00 م (بتوقيت برلين)'
        };
      case 'USA':
        return {
          desc: 'حصة اليوم 6:00 م بتوقيت القاهرة توافق 12:00 ظهراً بتوقيت شرق أمريكا وكندا.',
          badge: 'الساعة 12:00 ظهراً',
          label: 'الولايات المتحدة / كندا (EST)',
          liveTime: 'اليوم 12:00 ظهراً (توقيت نيويورك)'
        };
      default:
        return {
          desc: 'يتم احتساب موعد الحصة الحي بدقة وفق توقيت إقامتك.',
          badge: 'موعد الحصة المباشرة',
          label: 'توقيت دولي',
          liveTime: 'اليوم 7:00 م'
        };
    }
  };

  const currentTz = getTimezoneInfo(formCountry);

  const handleSubmit = (e) => {
    e.preventDefault();
    setParentName(formParent);
    setChildName(formChild);
    setGrade(formGrade);
    setCountry(formCountry);
    setCountryText(currentTz.label);
    const newChild = addChild(formChild, formGrade);
    if (!newChild) return;

    triggerToast(`تم إنشاء ملف ${formChild} وحفظ المنطقة الزمنية. هذا نموذج محلي ولا يتضمن حساب دخول بعد.`);
    setCurrentScreen('parent');
  };

  return (
    <div style={{ maxWidth: '860px', margin: '40px auto', padding: '0 20px', width: '100%' }}>
      {/* Stepper Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginBottom: '36px' }}>
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', background: 'var(--bg)', padding: '0 10px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--green)', border: '3px solid var(--green)', color: 'white', display: 'grid', placeItems: 'center', fontWeight: 800, margin: '0 auto 8px' }}>
            ✓
          </div>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--navy)' }}>1. حساب ولي الأمر</span>
        </div>

        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', background: 'var(--bg)', padding: '0 10px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--blue)', border: '3px solid var(--blue)', color: 'white', display: 'grid', placeItems: 'center', fontWeight: 800, margin: '0 auto 8px', boxShadow: '0 0 16px rgba(37,99,235,0.4)' }}>
            2
          </div>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--navy)' }}>2. إضافة الطفل والصف</span>
        </div>

        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', background: 'var(--bg)', padding: '0 10px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--card-bg)', border: '3px solid var(--line)', color: 'var(--muted)', display: 'grid', placeItems: 'center', fontWeight: 800, margin: '0 auto 8px' }}>
            3
          </div>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--muted)' }}>3. المنطقة وتأكيد الحصة</span>
        </div>
      </div>

      {/* Card Form */}
      <div style={{ background: 'var(--card-bg)', borderRadius: 'var(--radius-lg)', padding: '36px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--line)' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h2 style={{ fontSize: '24px', color: 'var(--navy)', marginBottom: '6px' }}>أهلاً بك في منصة فاهم لأبنائنا بالخارج 🇪🇬</h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>جهّز حساب طفلك لنربط مواعيد حصصه المباشرة تلقائياً مع توقيت إقامتكم.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '14px', marginBottom: '8px', color: 'var(--navy)' }}>اسم ولي الأمر</label>
            <input
              type="text"
              style={{ width: '100%', padding: '14px 18px', border: '2px solid var(--line)', borderRadius: 'var(--radius-md)', fontSize: '15px' }}
              value={formParent}
              onChange={(e) => setFormParent(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '22px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '14px', marginBottom: '8px', color: 'var(--navy)' }}>اسم الطفل (الطالب)</label>
              <input
                type="text"
                style={{ width: '100%', padding: '14px 18px', border: '2px solid var(--line)', borderRadius: 'var(--radius-md)', fontSize: '15px' }}
                value={formChild}
                onChange={(e) => setFormChild(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '14px', marginBottom: '8px', color: 'var(--navy)' }}>الصف الدراسي</label>
              <select
                style={{ width: '100%', padding: '14px 18px', border: '2px solid var(--line)', borderRadius: 'var(--radius-md)', fontSize: '15px', background: 'var(--card-bg)' }}
                value={formGrade}
                onChange={(e) => setFormGrade(e.target.value)}
              >
                <option value="الصف الأول الابتدائي">الصف الأول الابتدائي (المنهج المصري)</option>
                <option value="الصف الثاني الابتدائي">الصف الثاني الابتدائي (المنهج المصري)</option>
                <option value="الصف الثالث الابتدائي">الصف الثالث الابتدائي (المنهج المصري)</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '14px', marginBottom: '8px', color: 'var(--navy)' }}>
              بلد الإقامة الحالية (لحساب المنطقة الزمنية تلقائياً)
            </label>
            <select
              style={{ width: '100%', padding: '14px 18px', border: '2px solid var(--line)', borderRadius: 'var(--radius-md)', fontSize: '15px', background: 'var(--card-bg)' }}
              value={formCountry}
              onChange={(e) => setFormCountry(e.target.value)}
            >
              <option value="KSA">المملكة العربية السعودية (توقيت مكة المكرمة GMT+3)</option>
              <option value="UAE">الإمارات العربية المتحدة (توقيت دبي GMT+4)</option>
              <option value="KUW">الكويت (GMT+3)</option>
              <option value="QAT">قطر (GMT+3)</option>
              <option value="EGY">مصر (توقيت القاهرة GMT+2)</option>
              <option value="UK">المملكة المتحدة / بريطانيا (GMT+1)</option>
              <option value="GER">ألمانيا وأوروبا الوسطى (GMT+1 / GMT+2)</option>
              <option value="USA">الولايات المتحدة / كندا (توقيت الشرق EST)</option>
            </select>

            <div style={{
              background: 'var(--blue-light)', border: '1.5px dashed var(--line)', borderRadius: 'var(--radius-md)',
              padding: '16px', marginTop: '12px', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px'
            }}>
              <div>
                <strong style={{ color: 'var(--blue)', fontSize: '14px', display: 'block' }}>توقيت الحصص التفاعلية المحسوب لك:</strong>
                <span style={{ fontSize: '12.5px', color: 'var(--muted)' }}>{currentTz.desc}</span>
              </div>
              <div style={{ background: 'var(--card-bg)', padding: '6px 14px', borderRadius: 'var(--radius-full)', fontWeight: 700, color: 'var(--blue)', border: '1px solid var(--line)', fontSize: '13px' }}>
                {currentTz.badge}
              </div>
            </div>
          </div>

          <button className="btn-accent" style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: '16px' }} type="submit">
            <span>تأكيد البيانات والدخول للوحة المتابعة 🚀</span>
          </button>
        </form>
      </div>
    </div>
  );
}
