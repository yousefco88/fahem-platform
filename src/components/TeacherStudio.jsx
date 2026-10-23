import React from 'react';
import { useApp } from '../context/AppContext';

export default function TeacherStudio() {
  const { setShowLiveModal, setShowScheduleModal, triggerToast } = useApp();

  return (
    <div style={{ maxWidth: '1350px', margin: '30px auto', padding: '0 30px', width: '100%' }}>
      {/* Teacher Hero Banner */}
      <section style={{
        background: 'linear-gradient(135deg, #064e3b, #059669 60%, #10b981)',
        color: 'white', borderRadius: 'var(--radius-lg)', padding: '28px 32px',
        marginBottom: '30px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', boxShadow: '0 15px 30px rgba(16, 185, 129, 0.25)',
        flexWrap: 'wrap', gap: '16px'
      }}>
        <div>
          <h1 style={{ fontSize: '26px', marginBottom: '6px' }}>مرحباً أ/ سارة أحمد 👋</h1>
          <p style={{ opacity: 0.9, fontSize: '14px', maxWidth: '600px' }}>
            معلمة المنهج المصري — تغطية متكاملة لجميع مواد الصف الأول الابتدائي (عربي، ماث، إنجليزي كونكت، ديسكفر، وقيم وأخلاق).
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn-accent"
            style={{ background: '#fef08a', color: '#064e3b' }}
            onClick={() => setShowScheduleModal(true)}
          >
            <span>+ جدولة حصة في أي مادة</span>
          </button>
          <button
            style={{
              background: 'rgba(255, 255, 255, 0.15)', color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)', padding: '12px 20px',
              borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '14px'
            }}
            onClick={() => setShowLiveModal(true)}
          >
            <span>بدء الفصل الحي (السبورة التفاعلية) 🔴</span>
          </button>
        </div>
      </section>

      {/* Metrics Grid */}
      <section style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '18px', marginBottom: '30px'
      }}>
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '20px', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>الحصص المجدولة هذا الأسبوع</span>
            <h3 style={{ fontSize: '28px', color: 'var(--navy)', marginBottom: '6px' }}>8 حصص</h3>
            <small style={{ color: 'var(--green)', fontWeight: 600 }}>✓ عبر 5 مواد مختلفة</small>
          </div>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#ecfdf5', color: '#10b981', display: 'grid', placeItems: 'center', fontSize: '22px' }}>🗓</div>
        </div>

        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '20px', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>الطلاب المسجلون بمجموعاتي</span>
            <h3 style={{ fontSize: '28px', color: 'var(--navy)', marginBottom: '6px' }}>24 طالباً</h3>
            <small style={{ color: 'var(--blue)', fontWeight: 600 }}>👥 6 مجموعات مصغرة</small>
          </div>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#eff6ff', color: '#2563eb', display: 'grid', placeItems: 'center', fontSize: '22px' }}>🎒</div>
        </div>

        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '20px', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>نسبة إتقان المهارات</span>
            <h3 style={{ fontSize: '28px', color: 'var(--navy)', marginBottom: '6px' }}>91%</h3>
            <small style={{ color: 'var(--green)', fontWeight: 600 }}>⭐ معدل تجاوز ممتاز</small>
          </div>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#fefce8', color: '#ca8a04', display: 'grid', placeItems: 'center', fontSize: '22px' }}>🏆</div>
        </div>

        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '20px', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>المواد المشمولة بالتدريس</span>
            <h3 style={{ fontSize: '28px', color: '#0284c7', marginBottom: '6px' }}>12 مادة</h3>
            <small style={{ color: '#0284c7', fontWeight: 600 }}>شاملة مسار اللغات والهوية والتقنية</small>
          </div>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#f0f9ff', color: '#0284c7', display: 'grid', placeItems: 'center', fontSize: '22px' }}>📚</div>
        </div>
      </section>

      {/* Attention List Box */}
      <div style={{
        background: '#fff7ed', border: '2px solid #fed7aa', borderRadius: 'var(--radius-lg)',
        padding: '24px', marginBottom: '30px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '18px', color: '#9a3412' }}>⚠️ قائمة المتابعة الخاصة: طلاب بحاجة لتشجيع في الحصة القادمة</h3>
            <span style={{ fontSize: '12.5px', color: '#c2410c' }}>مرصودون تلقائياً عبر نتائج محاولات الإتقان في مختلف المواد:</span>
          </div>
          <button
            className="tag-badge"
            style={{ background: '#ffedd5', color: '#9a3412', border: '1px solid #fed7aa' }}
            onClick={() => triggerToast('الإرسال للأسر غير متصل بخدمة إشعارات بعد.')}
          >
            إرسال رسائل تشجيع لأولياء الأمور
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'white', border: '1px solid #fed7aa', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h4 style={{ fontSize: '15px', color: 'var(--navy)', marginBottom: '4px' }}>👦 أحمد محمد (اللغة العربية)</h4>
              <p style={{ fontSize: '12.5px', color: 'var(--muted)', marginBottom: '12px' }}>المهارة: تمييز المد الطويل (بَا) عن الحركة القصيرة (بَـ).</p>
            </div>
            <button className="btn-secondary" style={{ width: '100%' }} onClick={() => triggerToast('تخصيص الأسئلة للحصص غير محفوظ بعد.')}>
              تخصيص سؤال في الحصة القادمة
            </button>
          </div>

          <div style={{ background: 'white', border: '1px solid #fed7aa', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h4 style={{ fontSize: '15px', color: 'var(--navy)', marginBottom: '4px' }}>👧 مريم خالد (Connect 1)</h4>
              <p style={{ fontSize: '12.5px', color: 'var(--muted)', marginBottom: '12px' }}>المهارة: تمييز صوت حرف B في كلمات (Bus, Bag, Book).</p>
            </div>
            <button className="btn-secondary" style={{ width: '100%' }} onClick={() => triggerToast('إشعار ولي الأمر غير متصل بخدمة التنبيهات بعد.')}>
              تذكير بمراجعة التسجيل
            </button>
          </div>

          <div style={{ background: 'white', border: '1px solid #fed7aa', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h4 style={{ fontSize: '15px', color: 'var(--navy)', marginBottom: '4px' }}>👦 يوسف حسام (اكتشف Discover)</h4>
              <p style={{ fontSize: '12.5px', color: 'var(--muted)', marginBottom: '12px' }}>المهارة: التمييز بين الكائنات الحية وغير الحية.</p>
            </div>
            <button className="btn-secondary" style={{ width: '100%' }} onClick={() => triggerToast('لا توجد ورقة PDF مرفقة للإرسال بعد.') }>
              إرسال ورقة تدريب PDF
            </button>
          </div>
        </div>
      </div>

      {/* Two Column Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--line)' }}>
            <h3 style={{ fontSize: '18px', color: 'var(--navy)' }}><span>🗓️</span> جدول حصصي المباشرة اليوم (جميع المواد)</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '14px', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--line)', background: 'white', alignItems: 'center' }}>
              <div style={{ width: '60px', height: '48px', borderRadius: '8px', background: '#059669', display: 'grid', placeItems: 'center', color: 'white', fontWeight: 800, fontSize: '12px' }}>
                🔴 مباشر
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h5 style={{ fontSize: '13.5px', marginBottom: '2px' }}>حصة اللغة العربية: حرف الباء بالحركات والمدود</h5>
                <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>المجموعة (أ) · 4 طلاب · موعد البدء: 6:00 م بتوقيت مصر</span>
              </div>
              <button className="btn-accent" style={{ padding: '8px 14px', fontSize: '12px' }} onClick={() => setShowLiveModal(true)}>
                فتح الفصل والسبورة
              </button>
            </div>

            <div style={{ display: 'flex', gap: '14px', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--line)', background: 'white', alignItems: 'center' }}>
              <div style={{ width: '60px', height: '48px', borderRadius: '8px', background: '#8b5cf6', display: 'grid', placeItems: 'center', color: 'white', fontWeight: 800, fontSize: '12px' }}>
                🗓 غداً
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h5 style={{ fontSize: '13.5px', marginBottom: '2px' }}>حصة Connect 1: Unit 1 Phonics & Classroom Greetings</h5>
                <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>المجموعة (ج) · غداً 5:00 م بتوقيت مصر</span>
              </div>
              <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => triggerToast('رابط الحصة تجريبي؛ لم يتم إنشاء غرفة بث بعد.')}>
                تجهيز الحصة
              </button>
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--line)' }}>
            <h3 style={{ fontSize: '18px', color: 'var(--navy)' }}><span>📄</span> رفع وتجهيز أوراق عمل الدروس (PDF)</h3>
          </div>
          <div style={{ border: '2px dashed var(--line)', borderRadius: '16px', padding: '24px', textAlign: 'center', background: '#fafafa' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>📤</div>
            <h5 style={{ fontSize: '14px', marginBottom: '4px' }}>اسحب أوراق العمل التفاعلية لأي من المواد الخمس</h5>
            <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '14px' }}>عربي، ماث، كونكت إنجليزي، ديسكفر، أو كتاب القيم والأخلاق</p>
            <button className="btn-secondary" onClick={() => triggerToast('تم اختيار ورفع ورقة العمل للمادة بنجاح')}>
              اختيار ملف PDF من الجهاز
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}