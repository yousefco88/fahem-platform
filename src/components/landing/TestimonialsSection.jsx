import React from 'react';

export default function TestimonialsSection() {
  return (
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
      </div>
    </section>
  );
}
