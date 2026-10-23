import React from 'react';

const rows = [
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
];

export default function ComparisonSection() {
  return (
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
              {rows.map((row, idx) => (
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
  );
}
