import React from 'react';
import { useApp } from '../context/AppContext';

export default function PricingPlans() {
  const { triggerToast } = useApp();

  return (
    <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 24px', textAlign: 'center' }}>
      <div style={{ marginBottom: '36px' }}>
        <div style={{
          display: 'inline-block', background: '#eff6ff', color: 'var(--blue)',
          fontWeight: 800, fontSize: '13px', padding: '6px 16px', borderRadius: 'var(--radius-full)', marginBottom: '12px'
        }}>
          باقات مخصصة لأسر المصريين بالخارج 🌍
        </div>
        <h1 style={{ fontSize: '34px', marginBottom: '12px', color: 'var(--navy)' }}>
          استثمر في فهم طفلك للمنهج المصري وهوية لغته
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '16px', maxWidth: '650px', margin: '0 auto' }}>
          هذه تصورات أولية وليست عروضًا متاحة للبيع. لم تُحدد الأسعار أو الحصص أو الخدمات بعد، ولا توجد بوابة دفع مرتبطة.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', alignItems: 'stretch' }}>
        {/* Free Trial */}
        <div style={{ background: 'white', border: '2px solid var(--line)', borderRadius: '28px', padding: '36px 28px', display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
          <h3 style={{ fontSize: '22px', marginBottom: '8px', color: 'var(--navy)' }}>الحصة التجريبية المجانية</h3>
          <p style={{ fontSize: '13.5px', color: 'var(--muted)', marginBottom: '24px', minHeight: '42px' }}>
            جرب الفصل الحي وتفاعل طفلك مع المعلمة بدون أي التزام مالي.
          </p>
          <div style={{ fontSize: '38px', fontWeight: 900, color: 'var(--navy)', marginBottom: '4px' }}>
            قيد الدراسة <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--muted)' }}>/ تجربة أولية</span>
          </div>
          <ul style={{ listStyle: 'none', margin: '28px 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            <li style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: 'var(--green)', fontWeight: 900 }}>✓</span> حضور حصة مباشرة تفاعلية (40 دقيقة)
            </li>
            <li style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: 'var(--green)', fontWeight: 900 }}>✓</span> تجربة الفصل المصغر (4 طلاب فقط)
            </li>
            <li style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: 'var(--green)', fontWeight: 900 }}>✓</span> تقرير تقييم مستوى مبدئي من المعلمة
            </li>
            <li style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: 'var(--green)', fontWeight: 900 }}>✓</span> وصول للتسجيل والاختبار لمدة 48 ساعة
            </li>
          </ul>
          <button
            style={{ background: '#f1f5f9', color: 'var(--navy)', border: 'none', width: '100%', padding: '14px', borderRadius: 'var(--radius-md)', fontWeight: 700 }}
            onClick={() => triggerToast('الحجز غير متاح بعد؛ لا يُرسل هذا النموذج طلبًا فعليًا.')}
          >
            احجز حصة تجريبية الآن
          </button>
        </div>

        {/* Featured Foundation Plan */}
        <div style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #eff6ff 100%)', border: '2px solid var(--blue)',
          borderRadius: '28px', padding: '36px 28px', display: 'flex', flexDirection: 'column',
          position: 'relative', textAlign: 'right', boxShadow: '0 20px 35px -5px rgba(37,99,235,0.2)'
        }}>
          <div style={{
            position: 'absolute', top: '-14px', right: '50%', transform: 'translateX(50%)',
            background: 'var(--blue)', color: 'white', padding: '5px 18px', borderRadius: 'var(--radius-full)',
            fontSize: '12px', fontWeight: 800
          }}>
            تصور أولي — غير متاح للاشتراك
          </div>
          <h3 style={{ fontSize: '22px', marginBottom: '8px', color: 'var(--navy)' }}>باقة التأسيس الحي</h3>
          <p style={{ fontSize: '13.5px', color: 'var(--muted)', marginBottom: '24px', minHeight: '42px' }}>
            الخيار الأمثل لتغطية المنهج المصري أسبوعياً وضمان الإتقان المستمر.
          </p>
          <div style={{ fontSize: '38px', fontWeight: 900, color: 'var(--navy)', marginBottom: '4px' }}>
            — <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--muted)' }}>السعر لم يُحدد</span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>(أو ما يعادله بالدرهم أو الدولار)</span>
          <ul style={{ listStyle: 'none', margin: '28px 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            <li style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: 'var(--green)', fontWeight: 900 }}>✓</span> <strong>8 حصص حية مباشرة</strong> شهرياً مع معلم مصري
            </li>
            <li style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: 'var(--green)', fontWeight: 900 }}>✓</span> مجموعات مصغرة لضمان تفاعل كل طفل
            </li>
            <li style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: 'var(--green)', fontWeight: 900 }}>✓</span> أرشفة دائمة للتسجيلات لإعادة المشاهدة
            </li>
            <li style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: 'var(--green)', fontWeight: 900 }}>✓</span> نظام اختبارات الإتقان المتكررة حتى 100%
            </li>
            <li style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: 'var(--green)', fontWeight: 900 }}>✓</span> تقرير أسبوعي ومتابعة واتساب لأولياء الأمور
            </li>
          </ul>
          <button
            className="btn-accent"
            style={{ width: '100%', justifyContent: 'center', padding: '15px' }}
            onClick={() => triggerToast('الاشتراك والدفع غير متاحين في النموذج التجريبي.')}
          >
            اشترك الآن في باقة التأسيس
          </button>
        </div>

        {/* VIP Intensive */}
        <div style={{ background: 'white', border: '2px solid var(--line)', borderRadius: '28px', padding: '36px 28px', display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
          <h3 style={{ fontSize: '22px', marginBottom: '8px', color: 'var(--navy)' }}>باقة التفوق الفردي (VIP)</h3>
          <p style={{ fontSize: '13.5px', color: 'var(--muted)', marginBottom: '24px', minHeight: '42px' }}>
            متابعة مكثفة ومعلم خاص لطفلك للمراجعة والتحضير للامتحانات.
          </p>
          <div style={{ fontSize: '38px', fontWeight: 900, color: 'var(--navy)', marginBottom: '4px' }}>
            — <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--muted)' }}>السعر لم يُحدد</span>
          </div>
          <ul style={{ listStyle: 'none', margin: '28px 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            <li style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: 'var(--green)', fontWeight: 900 }}>✓</span> <strong>حصص فردية (1-on-1)</strong> أو ثنائية مكثفة
            </li>
            <li style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: 'var(--green)', fontWeight: 900 }}>✓</span> مرونة في اختيار وتغيير المواعيد أسبوعياً
            </li>
            <li style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: 'var(--green)', fontWeight: 900 }}>✓</span> تجهيز خاص لامتحانات «أبنائنا في الخارج»
            </li>
            <li style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: 'var(--green)', fontWeight: 900 }}>✓</span> متابعة صوتية يومية للطفل وولي الأمر
            </li>
          </ul>
          <button
            style={{ background: '#f1f5f9', color: 'var(--navy)', border: 'none', width: '100%', padding: '14px', borderRadius: 'var(--radius-md)', fontWeight: 700 }}
            onClick={() => triggerToast('طلبات الاستشارة غير متصلة بفريق أو نظام حجز بعد.')}
          >
            طلب استشارة وتنسيق المواعيد
          </button>
        </div>
      </div>
    </div>
  );
}
