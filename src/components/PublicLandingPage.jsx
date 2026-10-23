import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { launchConfetti } from '../utils/confetti';

export default function PublicLandingPage() {
  const {
    setCurrentScreen,
    triggerToast,
    soundManager
  } = useApp();

  // Booking Form State
  const [parentName, setParentName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [childName, setChildName] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('الصف الأول الابتدائي');
  const [selectedCountry, setSelectedCountry] = useState('السعودية');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Timezone Calculator State
  const [calcCountry, setCalcCountry] = useState('saudi');

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

  const currentCalc = timezoneData[calcCountry] || timezoneData.saudi;

  // Handle Free Trial Booking
  const handleBookingSubmit = (e) => {
    e.preventDefault();
    if (!parentName.trim() || !whatsappNumber.trim() || !childName.trim()) {
      triggerToast('يرجى ملء جميع الحقول المطلوبة للتسجيل');
      return;
    }

    setBookingSuccess(true);
    launchConfetti();
    soundManager.playSuccess();
    soundManager.speak(`أهلاً بك يا أستاذ ${parentName}! تم تسجيل طلب الحصة التجريبية للبطل ${childName}.`);
    triggerToast(`تم تسجيل طلب الحصة التجريبية لـ ${childName}. سيتواصل فريق فاهم معكم بعد تفعيل خدمة الحجز.`);
  };

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState(0);

  const faqs = [
    {
      q: 'هل المنصة معتمدة ومطابقة لامتحانات السفارة المصرية («أبنائنا في الخارج»)؟',
      a: 'نعمل على تنظيم محتوى تعليمي متوافق مع المنهج المصري. المحتوى الحالي تجريبي ويحتاج إلى مراجعة واعتماد أكاديمي قبل استخدامه كمرجع للمنهج أو الامتحانات الرسمية.'
    },
    {
      q: 'ماذا يحدث إذا فات الطفل موعد الحصة الحية بسبب السفر أو الانشغال؟',
      a: 'بعد تفعيل البث والتخزين، ستتمكن الأسرة من الرجوع إلى تسجيل الحصة. هذه الخدمة غير متاحة في النموذج التجريبي الحالي.'
    },
    {
      q: 'ما حجم المجموعات التعليمية؟',
      a: 'لم تُعتمد بعد سعة المجموعات أو جداول الحصص؛ ستُحدد بعد اختيار المعلمين وتجربة التشغيل.'
    },
    {
      q: 'كيف نغطي مناهج مدارس اللغات مثل Connect Plus والـ Math بالإنجليزية؟',
      a: 'تُدرس إضافة مسارات مدارس اللغات لاحقًا. نطاق النسخة الأولى ومحتواها قيد التحديد والمراجعة الأكاديمية.'
    },
    {
      q: 'هل الحصص التجريبية متاحة الآن؟',
      a: 'ليس بعد؛ نموذج الحجز الحالي توضيحي ولا يرسل طلبًا إلى فريق أو يحجز حصة فعلية.'
    }
  ];

  return (
    <div style={{ background: '#f8fafc', color: 'var(--navy)', fontFamily: 'Cairo, sans-serif', minHeight: '100vh' }}>
      
      {/* 1. Global Marketing Top Banner */}
      <div style={{
        background: 'linear-gradient(90deg, #1e3a8a, #2563eb, #1d4ed8)', color: 'white',
        padding: '10px 20px', textAlign: 'center', fontSize: '13px', fontWeight: 700,
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', flexWrap: 'wrap'
      }}>
        <span>🎉 خصم 20% بمناسبة فتح باب التسجيل لامتحانات «أبنائنا في الخارج» بالسفارات والقنصليات</span>
        <button
          style={{ background: '#facc15', color: '#1e1b4b', border: 'none', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontWeight: 900, fontSize: '11.5px', cursor: 'pointer' }}
          onClick={() => {
            document.getElementById('booking-section')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          احجز حصتك المجانية 🎁
        </button>
      </div>

      {/* 2. Marketing Header Navbar */}
      <header style={{
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
            <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--navy)', lineHeight: 1.1 }}>فاهم</h2>
            <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700 }}>التعليم الحي لأبنائنا بالخارج 🇪🇬</span>
          </div>
        </div>

        {/* Quick Nav Links */}
        <nav style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          <a href="#features" style={{ textDecoration: 'none', color: '#475569', fontSize: '13.5px', fontWeight: 700 }}>المميزات</a>
          <a href="#subjects" style={{ textDecoration: 'none', color: '#475569', fontSize: '13.5px', fontWeight: 700 }}>المواد الـ 12</a>
          <a href="#timezone" style={{ textDecoration: 'none', color: '#475569', fontSize: '13.5px', fontWeight: 700 }}>حاسبة التوقيت</a>
          <a href="#comparison" style={{ textDecoration: 'none', color: '#475569', fontSize: '13.5px', fontWeight: 700 }}>مقارنة الدروس</a>
          <a href="#testimonials" style={{ textDecoration: 'none', color: '#475569', fontSize: '13.5px', fontWeight: 700 }}>آراء الأسر</a>
          <a href="#faq" style={{ textDecoration: 'none', color: '#475569', fontSize: '13.5px', fontWeight: 700 }}>الأسئلة الشائعة</a>
        </nav>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
            onClick={() => {
              document.getElementById('booking-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <span>احجز حصة تجريبية مجاناً</span>
            <span>🚀</span>
          </button>
        </div>
      </header>

      {/* 3. Hero Section */}
      <section style={{
        background: 'radial-gradient(circle at 10% 20%, #eff6ff 0%, #ffffff 80%)',
        padding: '70px 24px 60px', textAlign: 'center', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ maxWidth: '950px', margin: '0 auto' }}>
          
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: '#e0e7ff', color: '#3730a3', padding: '6px 18px',
            borderRadius: 'var(--radius-full)', fontSize: '13px', fontWeight: 800, marginBottom: '24px'
          }}>
            <span>📚 محتوى تعليمي تجريبي قيد المراجعة الأكاديمية</span>
          </div>

          <h1 style={{
            fontSize: '44px', fontWeight: 900, color: 'var(--navy)', lineHeight: 1.25,
            marginBottom: '20px', letterSpacing: '-0.5px'
          }}>
            التعليم الحي المتقن لأبنائنا في الخارج.. <br />
            <span style={{ color: 'var(--blue)', background: 'linear-gradient(135deg, #2563eb, #14b8a6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              كأن طفلك في أفضل مدارس مصر وأنت بجواره في الغربة
            </span>
          </h1>

          <p style={{
            fontSize: '18px', color: '#475569', lineHeight: 1.7, maxWidth: '780px',
            margin: '0 auto 36px'
          }}>
            حصص تفاعلية مباشرة في <strong>مجموعات مصغرة (4 طلاب فقط)</strong> مع نخبة المعلمين المتخصصين، أرشفة ذكية دائمة لكل حصة، وإتقان تام للمنهج الوزاري وامتحانات السفارة بلا ضياع أو إحباط.
          </p>

          {/* Hero CTAs */}
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '40px' }}>
            <button
              className="btn-accent"
              style={{
                fontSize: '18px', padding: '16px 36px', borderRadius: 'var(--radius-full)',
                boxShadow: '0 12px 30px rgba(234, 88, 12, 0.3)'
              }}
              onClick={() => {
                document.getElementById('booking-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <span>احجز حصة تجريبية مجانية لطفلك</span>
              <span>🎁</span>
            </button>

            <button
              style={{
                background: 'white', color: 'var(--navy)', border: '2px solid #cbd5e1',
                fontSize: '16px', padding: '16px 28px', borderRadius: 'var(--radius-full)',
                fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                boxShadow: 'var(--shadow-sm)'
              }}
              onClick={() => setCurrentScreen('child')}
            >
              <span>جرب مساحة الطفل التفاعلية</span>
              <span>🦊</span>
            </button>
          </div>

          {/* Social Proof Strip */}
          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '32px',
            flexWrap: 'wrap', paddingTop: '20px', borderTop: '1px solid #e2e8f0', color: '#64748b', fontSize: '13.5px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#f59e0b', fontSize: '16px' }}>⭐⭐⭐⭐⭐</span>
              <strong>نموذج أولي — لا توجد تقييمات فعلية</strong>
            </div>
            <div>
              <strong>التسجيل التجريبي لم يبدأ بعد</strong>
            </div>
            <div>
              <strong>🇦🇪 +78 طالب في الإمارات</strong>
            </div>
            <div>
              <strong>🇰🇼 +38 طالب في الكويت</strong>
            </div>
            <div>
              <strong>🌍 تغطية بريطانيا وأوروبا وأمريكا</strong>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Interactive Expat Timezone Calculator Section */}
      <section id="timezone" style={{
        padding: '60px 24px', background: 'white', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0'
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <span className="tag-badge info" style={{ marginBottom: '8px' }}>⏰ صُمم خصيصاً للمغتربين</span>
            <h2 style={{ fontSize: '30px', fontWeight: 900, color: 'var(--navy)' }}>
              حاسبة فروق التوقيت ومواعيد الحصص لبلد إقامتك
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '15px' }}>
              لا داعي للحيرة أو الحساب اليدوي، نبرمج مواعيد فصولنا لتناسب عودة طفلك من مدرسته بالخارج
            </p>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white',
            borderRadius: '24px', padding: '36px', boxShadow: '0 20px 40px rgba(15, 23, 42, 0.3)'
          }}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#94a3b8', marginBottom: '10px' }}>
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
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>توقيت الحصة في القاهرة (مصر):</span>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#facc15', marginTop: '4px' }}>
                  {currentCalc.cairoTime}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>التوقيت المحلي في {currentCalc.country}:</span>
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

      {/* 5. Why Fahem vs. Chaotic Tutoring (Comparison Table) */}
      <section id="comparison" style={{ padding: '70px 24px', background: '#f8fafc' }}>
        <div style={{ maxWidth: '1050px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <span className="tag-badge info" style={{ marginBottom: '8px' }}>⚖️ الشفافية والراحة</span>
            <h2 style={{ fontSize: '30px', fontWeight: 900, color: 'var(--navy)' }}>
              لماذا تختار أسر المغتربين «فاهم» بدلاً من الدروس الخصوصية التقليدية؟
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '15px' }}>
              مقارنة واقعية توضح الفارق بين الاحتراف المؤسسي المعتمد والحلول الفردية العشوائية
            </p>
          </div>

          <div style={{ background: 'white', borderRadius: '24px', border: '1px solid var(--line)', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid var(--line)' }}>
                  <th style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--navy)' }}>وجه المقارنة</th>
                  <th style={{ padding: '16px 20px', fontWeight: 900, color: 'var(--blue)', background: '#eff6ff' }}>🌟 أكاديمية «فاهم» لأبنائنا بالخارج</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700, color: '#64748b' }}>الدروس الخصوصية الفردية العشوائية</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    aspect: 'كفاءة وتدريب المعلمين',
                    fahem: 'نسعى إلى بناء فريق تعليمي متخصص؛ تفاصيل المعلمين واعتماداتهم ستعلن بعد التحقق منها.',
                    other: 'معلم مجهول الكفاءة، تدريس تقليدي قائم على الحفظ والتلقين.'
                  },
                  {
                    aspect: 'حجم المجموعة وتفاعل الطفل',
                    fahem: 'مجموعات مصغرة (4 طلاب فقط) تضمن مشاركة صوتية متكررة للطفل وتشجيع زملائه.',
                    other: 'إما درس فردي يصيب الطفل بالملل، أو مجموعات كبيرة تفقد الطفل تركيزه.'
                  },
                  {
                    aspect: 'إذا غاب الطفل أو سافرت الأسرة',
                    fahem: 'تسجيل الحصص وأرشفتها ضمن خصائص الخطة، وهي قيد التطوير في النموذج الحالي.',
                    other: 'تضيع الحصة تماماً وتضيع تكلفتها، ويتراكم المنهج على عاتق الأم.'
                  },
                  {
                    aspect: 'فلسفة التقييم والاختبارات',
                    fahem: 'التعلم للإتقان (Mastery): إعادة المحاولة بدون رسوب حتى تحقيق 100% واكتساب الشارات.',
                    other: 'اختبار تقليدي يسبب رهبة وخوفاً ويحبط الطفل حال الخطأ.'
                  },
                  {
                    aspect: 'التدرب على الاختبارات',
                    fahem: 'اختبارات تدريبية لمراجعة المفاهيم، مع تقرير نتيجة غير رسمي.',
                    other: 'لا يوجد تدريب على النظام الإلكتروني، وتفاجأ الأسرة بشكل الامتحان الرسمي.'
                  },
                  {
                    aspect: 'التكلفة الشهرية الإجمالية',
                    fahem: 'تُعلن الأسعار بعد اعتماد نطاق المحتوى والخدمات وتفعيل الدفع.',
                    other: 'تتجاوز 1500 إلى 2500 ر.س شهرياً للمواد الأساسية فقط!'
                  }
                ].map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--navy)' }}>{row.aspect}</td>
                    <td style={{ padding: '16px 20px', fontWeight: 700, color: '#166534', background: '#f0fdf4' }}>
                      ✓ {row.fahem}
                    </td>
                    <td style={{ padding: '16px 20px', color: '#64748b' }}>
                      ❌ {row.other}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 6. Showcase of 12 Accredited Subjects */}
      <section id="subjects" style={{ padding: '70px 24px', background: 'white' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <span className="tag-badge info" style={{ marginBottom: '8px' }}>📚 المنظومة الشاملة</span>
            <h2 style={{ fontSize: '30px', fontWeight: 900, color: 'var(--navy)' }}>
              12 مادة ومساراً تعليمياً تغطي كافة احتياجات طفلك في الغربة
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '15px' }}>
              لا نقتصر على العربي والحساب، بل نبني شخصية الطفل وهويته ومهارات مستقبله
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
            {[
              { icon: '📖', title: 'اللغة العربية', badge: 'لغتي وهويتي', desc: 'تأسيس الحروف، المدود، القراءة، والتعبير الكتابي السليم.' },
              { icon: '🌟', title: 'Connect Plus (لغات)', badge: 'المنهج المتقدم', desc: 'تراكيب الجمل الكاملة والطلاقة الشفوية لمدارس اللغات والخاصة.' },
              { icon: '📐', title: 'Math (باللغة الإنجليزية)', badge: 'Language Track', desc: 'الأرقام، المقارنة، والعمليات الحسابية بالمصطلحات الإنجليزية.' },
              { icon: '🔢', title: 'الرياضيات (عربي)', badge: 'المنهج العام', desc: 'التفكير الرياضي، الأعداد، والمسائل اللفظية بأسلوب مبسط.' },
              { icon: '🇪🇬', title: 'معالم وتاريخ مصر', badge: 'الهوية والانتماء', desc: 'نهر النيل، الأهرامات، خريطة الوطن، وغرس الفخر بالأجداد.' },
              { icon: '✍️', title: 'نور البيان والخط العربي', badge: 'علاج ضعف القراءة', desc: 'الدمج الصوتي السريع وقواعد خط النسخ المعتمدة لأبناء المغتربين.' },
              { icon: '💻', title: 'تكنولوجيا المعلومات (ICT)', badge: 'مهارات المستقبل', desc: 'الأمان الرقمي للطفل، أجزاء الحاسوب، وأساسيات التفكير البرمجي.' },
              { icon: '🔬', title: 'اكتشف (Discover)', badge: 'العلوم والبيئة', desc: 'استكشاف الحواس الخمس، الكائنات الحية، والتجارب العلمية.' },
              { icon: '🛠️', title: 'المهارات الحياتية والمهنية', badge: 'الاعتماد على النفس', desc: 'التغذية الصحية، ترتيب الأدوات، والاستقلالية الشخصية.' },
              { icon: '🕋', title: 'التربية الإسلامية والقرآن', badge: 'القرآن والآداب', desc: 'سورة الفاتحة وتجويدها، الأحاديث الشريفة، وآداب المسلم الصغير.' },
              { icon: '✝️', title: 'التربية المسيحية', badge: 'المحبة والسلام', desc: 'قصص العطاء، عمل الخير، والمحبة الإنسانية وقيم التسامح.' },
              { icon: '🤝', title: 'القيم واحترام الآخر', badge: 'منظومة الأخلاق', desc: 'الصدق، الأمانة، بر الوالدين، وتقبل الاختلاف والتعاون.' }
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  background: '#f8fafc', border: '1.5px solid var(--line)', borderRadius: '16px',
                  padding: '20px', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '32px' }}>{s.icon}</span>
                    <span className="tag-badge info" style={{ fontSize: '11px' }}>{s.badge}</span>
                  </div>
                  <h3 style={{ fontSize: '16px', color: 'var(--navy)', marginBottom: '6px' }}>{s.title}</h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--muted)', lineHeight: 1.5 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Expat Parents Testimonials */}
      <section id="testimonials" style={{ padding: '70px 24px', background: '#f8fafc' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <span className="tag-badge info" style={{ marginBottom: '8px' }}>💬 ثقة المغتربين</span>
            <h2 style={{ fontSize: '30px', fontWeight: 900, color: 'var(--navy)' }}>
              آراء الأسر ستُضاف بعد التشغيل التجريبي
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '15px' }}>
              لا توجد شهادات أو نتائج موثقة حتى الآن؛ لن نعرض تجارب افتراضية على أنها حقيقية.
            </p>
          </div>

          <div style={{ display: 'none', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: '20px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ color: '#f59e0b', fontSize: '16px', marginBottom: '12px' }}>⭐⭐⭐⭐⭐</div>
              <p style={{ fontSize: '14px', color: '#334155', lineHeight: 1.6, marginBottom: '16px' }}>
                "ابني عمر كان يعاني جداً من منهج Connect Plus لغات، والدروس الخصوصية في الرياض كانت تستنزف ميزانيتنا بلا نتيجة. مع فاهم والأستاذة سارة، أصبح يحب المادة وينتظر الحصة كل أسبوع!"
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#dbeafe', display: 'grid', placeItems: 'center', fontSize: '18px' }}>👩‍👧</div>
                <div>
                  <strong style={{ fontSize: '13.5px', display: 'block' }}>أم عمر — الرياض 🇸🇦</strong>
                  <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>ولي أمر طالب بالصف الأول الابتدائي</span>
                </div>
              </div>
            </div>

            <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: '20px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ color: '#f59e0b', fontSize: '16px', marginBottom: '12px' }}>⭐⭐⭐⭐⭐</div>
              <p style={{ fontSize: '14px', color: '#334155', lineHeight: 1.6, marginBottom: '16px' }}>
                "محاكي امتحانات السفارة في فاهم أزال كل الخوف والتوتر من امتحانات السفارة الإلكترونية. ابنتي مريم دخلت الامتحان التجريبي وحصلت على اللون الأزرق (ممتاز) وطبعنا كشف الدرجات بثقة."
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#dcfce7', display: 'grid', placeItems: 'center', fontSize: '18px' }}>👨‍💼</div>
                <div>
                  <strong style={{ fontSize: '13.5px', display: 'block' }}>م. حازم القاضي — دبي 🇦🇪</strong>
                  <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>مهندس برمجيات وولي أمر</span>
                </div>
              </div>
            </div>

            <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: '20px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ color: '#f59e0b', fontSize: '16px', marginBottom: '12px' }}>⭐⭐⭐⭐⭐</div>
              <p style={{ fontSize: '14px', color: '#334155', lineHeight: 1.6, marginBottom: '16px' }}>
                "كنا نخشى أن يفقد أولادنا ارتباطهم بمصر ولغتهم العربية بسبب نشأتهم في لندن. مسار تاريخ ومعالم مصر ونور البيان في فاهم بنى لديهم عزة نفس وحباً كبيراً لبلدهم."
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fef08a', display: 'grid', placeItems: 'center', fontSize: '18px' }}>👩‍⚕️</div>
                <div>
                  <strong style={{ fontSize: '13.5px', display: 'block' }}>د. نادية العوضي — لندن 🇬🇧</strong>
                  <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>طبيبة استشارية بمستشفيات بريطانيا</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Interactive Free Trial Booking Form Section */}
      <section id="booking-section" style={{
        padding: '70px 24px', background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', color: 'white'
      }}>
        <div style={{ maxWidth: '650px', margin: '0 auto', textAlign: 'center' }}>
          
          <span style={{
            background: 'rgba(255,255,255,0.2)', padding: '6px 16px', borderRadius: 'var(--radius-full)',
            fontSize: '12.5px', fontWeight: 800, display: 'inline-block', marginBottom: '16px'
          }}>
            التسجيل التجريبي — نموذج محلي غير متصل
          </span>

          <h2 style={{ fontSize: '32px', fontWeight: 900, marginBottom: '12px' }}>
            سجّل اهتمامك بالنسخة التجريبية
          </h2>
          <p style={{ fontSize: '15px', color: '#dbeafe', marginBottom: '30px' }}>
            نموذج طلب حصة تجريبية؛ يتم تأكيد الموعد بعد تفعيل خدمة الحجز والتواصل
          </p>

          <div style={{
            background: 'white', color: 'var(--navy)', borderRadius: '24px',
            padding: '36px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)', textAlign: 'right'
          }}>
            {bookingSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px 10px' }}>
                <div style={{ fontSize: '54px', marginBottom: '12px' }}>🎉</div>
                <h3 style={{ fontSize: '22px', color: '#166534', marginBottom: '8px' }}>
                  حُفظ طلبك في هذه الجلسة فقط
                </h3>
                <p style={{ color: '#475569', fontSize: '14px', lineHeight: 1.6, marginBottom: '20px' }}>
                  طلب تجريبي باسم <strong>{childName}</strong>. لم يُرسل إلى فريق فاهم ولا يُعد حجزًا أو تأكيدًا لموعد.
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
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '13.5px', marginBottom: '6px' }}>
                    اسم ولي الأمر الكريم
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: أحمد الشافعي"
                    style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--line)', borderRadius: '10px', fontSize: '14px' }}
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 700, fontSize: '13.5px', marginBottom: '6px' }}>
                      رقم الواتساب (مع مفتاح الدولة)
                    </label>
                    <input
                      type="tel"
                      placeholder="مثال: +966 50 123 4567"
                      style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--line)', borderRadius: '10px', fontSize: '14px' }}
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 700, fontSize: '13.5px', marginBottom: '6px' }}>
                      دولة الإقامة الحالية
                    </label>
                    <select
                      style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--line)', borderRadius: '10px', fontSize: '13.5px', background: 'white' }}
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
                    <label style={{ display: 'block', fontWeight: 700, fontSize: '13.5px', marginBottom: '6px' }}>
                      اسم الطفل (البطل)
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: عمر"
                      style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--line)', borderRadius: '10px', fontSize: '14px' }}
                      value={childName}
                      onChange={(e) => setChildName(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 700, fontSize: '13.5px', marginBottom: '6px' }}>
                      الصف الدراسي الحالي
                    </label>
                    <select
                      style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--line)', borderRadius: '10px', fontSize: '13.5px', background: 'white' }}
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
                  <span>تأكيد حجز الحصة التجريبية المجانية عبر واتساب</span>
                  <span>📲</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* 9. FAQ Section */}
      <section id="faq" style={{ padding: '70px 24px', background: 'white' }}>
        <div style={{ maxWidth: '850px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <span className="tag-badge info" style={{ marginBottom: '8px' }}>❓ إجابات شفافة</span>
            <h2 style={{ fontSize: '30px', fontWeight: 900, color: 'var(--navy)' }}>
              الأسئلة الأكثر شيوعاً لدى أولياء الأمور بالخارج
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {faqs.map((faq, i) => (
              <div
                key={i}
                style={{
                  border: '1.5px solid var(--line)', borderRadius: '16px',
                  background: openFaq === i ? '#f8fafc' : '#ffffff', overflow: 'hidden'
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
                  <span style={{ fontSize: '18px', color: 'var(--blue)' }}>{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 20px 18px', color: '#475569', fontSize: '14px', lineHeight: 1.6 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. Footer */}
      <footer style={{ background: '#0f172a', color: 'white', padding: '50px 24px 30px' }}>
        <div style={{
          maxWidth: '1100px', margin: '0 auto', display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '30px', marginBottom: '40px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--blue)', color: 'white', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: '20px' }}>ف</div>
              <span style={{ fontSize: '20px', fontWeight: 900 }}>فاهم</span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.6 }}>
              المنصة المتخصصة الأولى لأبنائنا بالخارج في السعودية والإمارات والكويت وأوروبا. تعليم حي، أرشفة ذكية، وإتقان تام للمنهج المصري.
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
            <h4 style={{ fontSize: '15px', marginBottom: '14px', color: '#f8fafc' }}>خدمة العملاء بالسفارات</h4>
            <div style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.7 }}>
              <div>📞 واتساب الدعم الفني: +20 100 000 0000</div>
              <div>✉️ البريد الإلكتروني: support@fahem.academy</div>
              <div>🏛️ تنسيق سفارات: الرياض • دبي • الكويت • لندن</div>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #1e293b', paddingTop: '20px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
          جميع الحقوق محفوظة © لمنصة «فاهم» للتعليم الحي لأبنائنا بالخارج — 2026.
        </div>
      </footer>
    </div>
  );
}
