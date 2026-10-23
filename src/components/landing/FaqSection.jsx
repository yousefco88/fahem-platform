import React, { useState } from 'react';

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

export default function FaqSection() {
  const [openFaq, setOpenFaq] = useState(0);

  return (
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
  );
}
