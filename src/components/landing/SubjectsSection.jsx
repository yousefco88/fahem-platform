import React from 'react';

const subjects = [
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
];

export default function SubjectsSection() {
  return (
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
          {subjects.map((s, i) => (
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
  );
}
