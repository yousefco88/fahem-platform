import React, { useState } from 'react';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import { useAuth } from '../../context/AuthContext';

/**
 * ⚙️ إعدادات الموقع — تعديل محتوى الموقع العام من لوحة الإدارة:
 * الشريط العلوي، الهيدر، الهيرو، الفوتر، SEO، الباقات والأسعار.
 * الحفظ في Supabase (site_settings) وتنعكس التغييرات فوراً على الموقع.
 */

const label = { display: 'block', fontSize: '12.5px', fontWeight: 800, color: 'var(--navy)', marginBottom: '6px' };
const input = { width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--line)', fontSize: '13.5px', fontFamily: 'inherit', background: 'var(--card-bg)', color: 'var(--navy)' };
const textarea = { ...input, minHeight: '70px', resize: 'vertical' };
const card = { background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '22px', boxShadow: 'var(--shadow-sm)', marginBottom: '20px' };
const sectionTitle = { fontSize: '16px', color: 'var(--navy)', marginBottom: '4px' };
const hint = { fontSize: '12px', color: 'var(--muted)', marginBottom: '16px' };

function SaveButton({ saving, saved, onClick }) {
  return (
    <button
      className="btn-accent"
      style={{ padding: '10px 22px', fontSize: '13px', marginTop: '14px', opacity: saving ? 0.6 : 1 }}
      disabled={saving}
      onClick={onClick}
    >
      {saving ? 'جارٍ الحفظ…' : saved ? '✓ تم الحفظ' : 'حفظ التغييرات'}
    </button>
  );
}

function useSectionSaver(saveSection) {
  const [state, setState] = useState({});
  const save = async (key, value) => {
    setState(s => ({ ...s, [key]: { saving: true } }));
    const res = await saveSection(key, value);
    setState(s => ({ ...s, [key]: { saving: false, saved: res.ok, error: res.ok ? null : res.reason } }));
    if (res.ok) setTimeout(() => setState(s => ({ ...s, [key]: {} })), 2500);
  };
  return [state, save];
}

// لا تُبنى المسودة قبل اكتمال تحميل الإعدادات — وإلا يكتب «حفظ» الافتراضيات فوق بيانات الإنتاج
export default function SiteSettingsPanel() {
  const { loading, loaded, loadError, reload } = useSiteSettings();
  if (loading) return <div role="status" style={{ padding: 24, color: 'var(--muted)' }}>جارٍ تحميل الإعدادات…</div>;
  if (loadError || !loaded) return (
    <div role="alert" style={{ padding: 24, color: 'var(--red-text)' }}>
      <p>{loadError || 'لم يتم تحميل الإعدادات المحفوظة بعد.'}</p>
      <button type="button" className="btn-outline" onClick={reload}>إعادة المحاولة</button>
    </div>
  );
  return <SiteSettingsEditor />;
}

function SiteSettingsEditor() {
  const { settings, tableMissing, saveSection } = useSiteSettings();
  // محرر المحتوى يرى ويحفظ أجندة الامتحانات فقط؛ بقية الأقسام للأدمن وحده
  // (الخادم يفرض ذلك فعلياً: RLS تسمح لمحرر المحتوى بمفتاح examCalendar حصراً)
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(settings)));
  const [saveState, save] = useSectionSaver(saveSection);

  const set = (section, field, value) =>
    setDraft(d => ({ ...d, [section]: { ...d[section], [field]: value } }));

  const setPlan = (idx, field, value) =>
    setDraft(d => {
      const plans = d.pricing.plans.map((p, i) => (i === idx ? { ...p, [field]: value } : p));
      return { ...d, pricing: { ...d.pricing, plans } };
    });

  // تعديل عنصر داخل قائمة (أسئلة شائعة / صفوف مقارنة / مواد)
  const setListItem = (section, listKey, idx, field, value) =>
    setDraft(d => {
      const list = d[section][listKey].map((item, i) => (i === idx ? { ...item, [field]: value } : item));
      return { ...d, [section]: { ...d[section], [listKey]: list } };
    });

  const addListItem = (section, listKey, template) =>
    setDraft(d => ({ ...d, [section]: { ...d[section], [listKey]: [...d[section][listKey], template] } }));

  const removeListItem = (section, listKey, idx) =>
    setDraft(d => ({ ...d, [section]: { ...d[section], [listKey]: d[section][listKey].filter((_, i) => i !== idx) } }));

  const removeBtn = (onClick) => (
    <button
      style={{ background: 'var(--red-light)', color: 'var(--red-text)', border: '1px solid var(--line)', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
      onClick={onClick}
    >
      🗑 حذف
    </button>
  );

  const addBtn = (text, onClick) => (
    <button
      style={{ background: 'var(--green-light)', color: 'var(--green-text)', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '8px 16px', fontSize: '12.5px', fontWeight: 800, cursor: 'pointer' }}
      onClick={onClick}
    >
      + {text}
    </button>
  );

  const err = (key) => saveState[key]?.error && (
    <div style={{ color: 'var(--red-text)', fontSize: '12px', marginTop: '8px' }}>⚠️ {saveState[key].error}</div>
  );

  return (
    <div>
      {tableMissing && (
        <div style={{ background: 'var(--yellow-light)', border: '1px solid var(--yellow)', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', fontSize: '13px', color: 'var(--orange-text)', fontWeight: 700 }}>
          ⚠️ جدول site_settings غير موجود بعد في Supabase — طبّق الـ migration:
          <code style={{ display: 'block', marginTop: '6px', direction: 'ltr', textAlign: 'left', fontSize: '12px' }}>supabase/migrations/20261024210000_site_settings.sql</code>
          حتى ذلك الحين يعرض الموقع القيم الافتراضية ولن يُحفظ أي تعديل.
        </div>
      )}

      {isAdmin && (<>
      {/* الشريط العلوي */}
      <div style={card}>
        <h3 style={sectionTitle}>📣 الشريط العلوي (البانر التسويقي)</h3>
        <p style={hint}>يظهر أعلى الصفحة الرئيسية فوق الهيدر.</p>
        <div style={{ display: 'grid', gap: '14px' }}>
          <div>
            <label style={label}>نص الشريط</label>
            <textarea style={textarea} value={draft.banner.text} onChange={e => set('banner', 'text', e.target.value)} />
          </div>
          <div>
            <label style={label}>نص الزر</label>
            <input style={input} value={draft.banner.buttonLabel} onChange={e => set('banner', 'buttonLabel', e.target.value)} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: 'var(--navy)' }}>
            <input type="checkbox" checked={draft.banner.visible !== false} onChange={e => set('banner', 'visible', e.target.checked)} />
            إظهار الشريط
          </label>
        </div>
        <SaveButton {...saveState.banner} onClick={() => save('banner', draft.banner)} />
        {err('banner')}
      </div>

      {/* الهيدر */}
      <div style={card}>
        <h3 style={sectionTitle}>🔝 الهيدر</h3>
        <p style={hint}>اسم العلامة والسطر التعريفي وزر الحجز (سطح المكتب).</p>
        <div className="u-19">
          <div>
            <label style={label}>اسم العلامة</label>
            <input style={input} value={draft.header.brandName} onChange={e => set('header', 'brandName', e.target.value)} />
          </div>
          <div>
            <label style={label}>السطر التعريفي</label>
            <input style={input} value={draft.header.tagline} onChange={e => set('header', 'tagline', e.target.value)} />
          </div>
          <div>
            <label style={label}>نص زر الحجز</label>
            <input style={input} value={draft.header.ctaLabel} onChange={e => set('header', 'ctaLabel', e.target.value)} />
          </div>
        </div>
        <SaveButton {...saveState.header} onClick={() => save('header', draft.header)} />
        {err('header')}
      </div>

      {/* الهيرو */}
      <div style={card}>
        <h3 style={sectionTitle}>🦸 قسم الهيرو (الرئيسية)</h3>
        <p style={hint}>العنوان الرئيسي والنص التسويقي وأزرار الدعوة لاتخاذ إجراء.</p>
        <div style={{ display: 'grid', gap: '14px' }}>
          <div>
            <label style={label}>الشارة العلوية</label>
            <input style={input} value={draft.hero.badge} onChange={e => set('hero', 'badge', e.target.value)} />
          </div>
          <div>
            <label style={label}>العنوان — السطر الأول</label>
            <input style={input} value={draft.hero.titleLine1} onChange={e => set('hero', 'titleLine1', e.target.value)} />
          </div>
          <div>
            <label style={label}>العنوان — السطر المميز (متدرج اللون)</label>
            <input style={input} value={draft.hero.titleHighlight} onChange={e => set('hero', 'titleHighlight', e.target.value)} />
          </div>
          <div>
            <label style={label}>النص التعريفي</label>
            <textarea style={textarea} value={draft.hero.subtitle} onChange={e => set('hero', 'subtitle', e.target.value)} />
          </div>
          <div className="u-19">
            <div>
              <label style={label}>الزر الأساسي 🎁</label>
              <input style={input} value={draft.hero.ctaPrimary} onChange={e => set('hero', 'ctaPrimary', e.target.value)} />
            </div>
            <div>
              <label style={label}>الزر الثانوي 🦊</label>
              <input style={input} value={draft.hero.ctaSecondary} onChange={e => set('hero', 'ctaSecondary', e.target.value)} />
            </div>
          </div>
        </div>
        <SaveButton {...saveState.hero} onClick={() => save('hero', draft.hero)} />
        {err('hero')}
      </div>

      {/* الفوتر */}
      <div style={card}>
        <h3 style={sectionTitle}>🔻 الفوتر</h3>
        <p style={hint}>النبذة التعريفية وبيانات التواصل وحقوق النشر. كل سطر تواصل في سطر مستقل.</p>
        <div style={{ display: 'grid', gap: '14px' }}>
          <div>
            <label style={label}>نبذة عن المنصة</label>
            <textarea style={textarea} value={draft.footer.about} onChange={e => set('footer', 'about', e.target.value)} />
          </div>
          <div>
            <label style={label}>سطور التواصل (سطر لكل بند)</label>
            <textarea
              style={{ ...textarea, minHeight: '90px' }}
              value={(draft.footer.contactLines || []).join('\n')}
              onChange={e => set('footer', 'contactLines', e.target.value.split('\n').filter(l => l.trim()))}
            />
          </div>
          <div>
            <label style={label}>سطر حقوق النشر</label>
            <input style={input} value={draft.footer.copyright} onChange={e => set('footer', 'copyright', e.target.value)} />
          </div>
        </div>
        <SaveButton {...saveState.footer} onClick={() => save('footer', draft.footer)} />
        {err('footer')}
      </div>

      {/* SEO */}
      <div style={card}>
        <h3 style={sectionTitle}>🔎 SEO (الصفحة الرئيسية)</h3>
        <p style={hint}>عنوان ووصف الصفحة الرئيسية في محركات البحث (وسم title وmeta description).</p>
        <div style={{ display: 'grid', gap: '14px' }}>
          <div>
            <label style={label}>عنوان الصفحة (Title)</label>
            <input style={input} value={draft.seo.landingTitle} onChange={e => set('seo', 'landingTitle', e.target.value)} />
          </div>
          <div>
            <label style={label}>الوصف (Description)</label>
            <textarea style={textarea} value={draft.seo.landingDescription} onChange={e => set('seo', 'landingDescription', e.target.value)} />
          </div>
        </div>
        <SaveButton {...saveState.seo} onClick={() => save('seo', draft.seo)} />
        {err('seo')}
      </div>

      {/* حاسبة التوقيت */}
      <div style={card}>
        <h3 style={sectionTitle}>⏰ قسم حاسبة فروق التوقيت</h3>
        <p style={hint}>ترويسة القسم فقط — بيانات الدول والفروق تُحسب آلياً في الكود.</p>
        <div style={{ display: 'grid', gap: '14px' }}>
          <div>
            <label style={label}>الشارة</label>
            <input style={input} value={draft.timezone.badge} onChange={e => set('timezone', 'badge', e.target.value)} />
          </div>
          <div>
            <label style={label}>العنوان</label>
            <input style={input} value={draft.timezone.title} onChange={e => set('timezone', 'title', e.target.value)} />
          </div>
          <div>
            <label style={label}>النص التوضيحي</label>
            <textarea style={textarea} value={draft.timezone.subtitle} onChange={e => set('timezone', 'subtitle', e.target.value)} />
          </div>
        </div>
        <SaveButton {...saveState.timezone} onClick={() => save('timezone', draft.timezone)} />
        {err('timezone')}
      </div>

      {/* المقارنة */}
      <div style={card}>
        <h3 style={sectionTitle}>⚖️ قسم المقارنة (فاهم مقابل الدروس الخصوصية)</h3>
        <p style={hint}>الترويسة ورؤوس الأعمدة وكل صفوف الجدول.</p>
        <div style={{ display: 'grid', gap: '14px', marginBottom: '18px' }}>
          <div className="u-19">
            <div>
              <label style={label}>الشارة</label>
              <input style={input} value={draft.comparison.badge} onChange={e => set('comparison', 'badge', e.target.value)} />
            </div>
            <div>
              <label style={label}>عمود فاهم</label>
              <input style={input} value={draft.comparison.fahemColumn} onChange={e => set('comparison', 'fahemColumn', e.target.value)} />
            </div>
            <div>
              <label style={label}>عمود البديل</label>
              <input style={input} value={draft.comparison.otherColumn} onChange={e => set('comparison', 'otherColumn', e.target.value)} />
            </div>
          </div>
          <div>
            <label style={label}>العنوان</label>
            <input style={input} value={draft.comparison.title} onChange={e => set('comparison', 'title', e.target.value)} />
          </div>
          <div>
            <label style={label}>النص التوضيحي</label>
            <input style={input} value={draft.comparison.subtitle} onChange={e => set('comparison', 'subtitle', e.target.value)} />
          </div>
        </div>
        {(draft.comparison.rows || []).map((row, idx) => (
          <div key={idx} className="u-20">
            <div className="u-21">
              <span style={{ fontWeight: 900, fontSize: '12.5px', color: 'var(--navy)' }}>صف #{idx + 1}</span>
              {removeBtn(() => removeListItem('comparison', 'rows', idx))}
            </div>
            <div style={{ display: 'grid', gap: '10px' }}>
              <div>
                <label style={label}>وجه المقارنة</label>
                <input style={input} value={row.aspect} onChange={e => setListItem('comparison', 'rows', idx, 'aspect', e.target.value)} />
              </div>
              <div>
                <label style={label}>✓ في فاهم</label>
                <textarea style={{ ...textarea, minHeight: '48px' }} value={row.fahem} onChange={e => setListItem('comparison', 'rows', idx, 'fahem', e.target.value)} />
              </div>
              <div>
                <label style={label}>❌ في البديل</label>
                <textarea style={{ ...textarea, minHeight: '48px' }} value={row.other} onChange={e => setListItem('comparison', 'rows', idx, 'other', e.target.value)} />
              </div>
            </div>
          </div>
        ))}
        {addBtn('صف مقارنة جديد', () => addListItem('comparison', 'rows', { aspect: '', fahem: '', other: '' }))}
        <div><SaveButton {...saveState.comparison} onClick={() => save('comparison', draft.comparison)} /></div>
        {err('comparison')}
      </div>

      {/* المواد والمسارات */}
      <div style={card}>
        <h3 style={sectionTitle}>📚 قسم المواد والمسارات (الرئيسية)</h3>
        <p style={hint}>العداد في العنوان يُحسب تلقائياً من عدد البطاقات. هذا عرض تسويقي — المناهج الفعلية تُدار من تبويب إدارة المناهج.</p>
        <div style={{ display: 'grid', gap: '14px', marginBottom: '18px' }}>
          <div className="u-19">
            <div>
              <label style={label}>الشارة</label>
              <input style={input} value={draft.subjects.badge} onChange={e => set('subjects', 'badge', e.target.value)} />
            </div>
            <div>
              <label style={label}>تكملة العنوان (بعد العدد)</label>
              <input style={input} value={draft.subjects.titleSuffix} onChange={e => set('subjects', 'titleSuffix', e.target.value)} />
            </div>
          </div>
          <div>
            <label style={label}>النص التوضيحي</label>
            <input style={input} value={draft.subjects.subtitle} onChange={e => set('subjects', 'subtitle', e.target.value)} />
          </div>
        </div>
        {(draft.subjects.items || []).map((s, idx) => (
          <div key={idx} className="u-20">
            <div className="u-21">
              <span style={{ fontWeight: 900, fontSize: '12.5px', color: 'var(--navy)' }}>{s.icon} {s.title || `مادة #${idx + 1}`}</span>
              {removeBtn(() => removeListItem('subjects', 'items', idx))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={label}>أيقونة</label>
                <input style={{ ...input, textAlign: 'center' }} value={s.icon} onChange={e => setListItem('subjects', 'items', idx, 'icon', e.target.value)} />
              </div>
              <div>
                <label style={label}>اسم المادة</label>
                <input style={input} value={s.title} onChange={e => setListItem('subjects', 'items', idx, 'title', e.target.value)} />
              </div>
              <div>
                <label style={label}>الشارة</label>
                <input style={input} value={s.badge} onChange={e => setListItem('subjects', 'items', idx, 'badge', e.target.value)} />
              </div>
            </div>
            <div>
              <label style={label}>الوصف</label>
              <textarea style={{ ...textarea, minHeight: '48px' }} value={s.desc} onChange={e => setListItem('subjects', 'items', idx, 'desc', e.target.value)} />
            </div>
          </div>
        ))}
        {addBtn('مادة جديدة', () => addListItem('subjects', 'items', { icon: '📘', title: '', badge: '', desc: '' }))}
        <div><SaveButton {...saveState.subjects} onClick={() => save('subjects', draft.subjects)} /></div>
        {err('subjects')}
      </div>

      {/* الشهادات */}
      <div style={card}>
        <h3 style={sectionTitle}>💬 قسم آراء الأسر</h3>
        <p style={hint}>حالياً نص صادق «ستُضاف بعد التشغيل التجريبي» — عدّله عند توفر شهادات حقيقية موثقة.</p>
        <div style={{ display: 'grid', gap: '14px' }}>
          <div>
            <label style={label}>الشارة</label>
            <input style={input} value={draft.testimonials.badge} onChange={e => set('testimonials', 'badge', e.target.value)} />
          </div>
          <div>
            <label style={label}>العنوان</label>
            <input style={input} value={draft.testimonials.title} onChange={e => set('testimonials', 'title', e.target.value)} />
          </div>
          <div>
            <label style={label}>النص التوضيحي</label>
            <textarea style={textarea} value={draft.testimonials.subtitle} onChange={e => set('testimonials', 'subtitle', e.target.value)} />
          </div>
        </div>
        <SaveButton {...saveState.testimonials} onClick={() => save('testimonials', draft.testimonials)} />
        {err('testimonials')}
      </div>

      {/* نموذج الحجز */}
      <div style={card}>
        <h3 style={sectionTitle}>📋 قسم نموذج الحجز التجريبي</h3>
        <p style={hint}>نصوص الترويسة وزر الإرسال — حقول النموذج نفسها ثابتة (ترتبط بقاعدة البيانات).</p>
        <div style={{ display: 'grid', gap: '14px' }}>
          <div>
            <label style={label}>الشارة</label>
            <input style={input} value={draft.booking.badge} onChange={e => set('booking', 'badge', e.target.value)} />
          </div>
          <div>
            <label style={label}>العنوان</label>
            <input style={input} value={draft.booking.title} onChange={e => set('booking', 'title', e.target.value)} />
          </div>
          <div>
            <label style={label}>النص التوضيحي</label>
            <textarea style={textarea} value={draft.booking.subtitle} onChange={e => set('booking', 'subtitle', e.target.value)} />
          </div>
          <div>
            <label style={label}>نص زر الإرسال</label>
            <input style={input} value={draft.booking.submitLabel} onChange={e => set('booking', 'submitLabel', e.target.value)} />
          </div>
        </div>
        <SaveButton {...saveState.booking} onClick={() => save('booking', draft.booking)} />
        {err('booking')}
      </div>

      {/* الأسئلة الشائعة */}
      <div style={card}>
        <h3 style={sectionTitle}>❓ الأسئلة الشائعة</h3>
        <p style={hint}>الترويسة وكل الأسئلة والإجابات — أضف أو احذف أسئلة بحرية.</p>
        <div style={{ display: 'grid', gap: '14px', marginBottom: '18px' }}>
          <div>
            <label style={label}>الشارة</label>
            <input style={input} value={draft.faq.badge} onChange={e => set('faq', 'badge', e.target.value)} />
          </div>
          <div>
            <label style={label}>العنوان</label>
            <input style={input} value={draft.faq.title} onChange={e => set('faq', 'title', e.target.value)} />
          </div>
        </div>
        {(draft.faq.items || []).map((f, idx) => (
          <div key={idx} className="u-20">
            <div className="u-21">
              <span style={{ fontWeight: 900, fontSize: '12.5px', color: 'var(--navy)' }}>سؤال #{idx + 1}</span>
              {removeBtn(() => removeListItem('faq', 'items', idx))}
            </div>
            <div style={{ display: 'grid', gap: '10px' }}>
              <div>
                <label style={label}>السؤال</label>
                <input style={input} value={f.q} onChange={e => setListItem('faq', 'items', idx, 'q', e.target.value)} />
              </div>
              <div>
                <label style={label}>الإجابة</label>
                <textarea style={{ ...textarea, minHeight: '60px' }} value={f.a} onChange={e => setListItem('faq', 'items', idx, 'a', e.target.value)} />
              </div>
            </div>
          </div>
        ))}
        {addBtn('سؤال جديد', () => addListItem('faq', 'items', { q: '', a: '' }))}
        <div><SaveButton {...saveState.faq} onClick={() => save('faq', draft.faq)} /></div>
        {err('faq')}
      </div>

      {/* الباقات والأسعار */}
      <div style={card}>
        <h3 style={sectionTitle}>💳 الباقات والأسعار</h3>
        <p style={hint}>ترويسة صفحة الأسعار والباقات الثلاث بكامل محتواها. الميزات: سطر لكل ميزة.</p>
        <div style={{ display: 'grid', gap: '14px', marginBottom: '20px' }}>
          <div>
            <label style={label}>شارة الصفحة</label>
            <input style={input} value={draft.pricing.badge} onChange={e => set('pricing', 'badge', e.target.value)} />
          </div>
          <div>
            <label style={label}>عنوان الصفحة</label>
            <input style={input} value={draft.pricing.title} onChange={e => set('pricing', 'title', e.target.value)} />
          </div>
          <div>
            <label style={label}>تنويه الشفافية (يُترك فارغاً لإخفائه)</label>
            <textarea style={textarea} value={draft.pricing.disclaimer} onChange={e => set('pricing', 'disclaimer', e.target.value)} />
          </div>
        </div>

        {(draft.pricing.plans || []).map((plan, idx) => (
          <div key={plan.id} style={{ border: '1px dashed var(--line)', borderRadius: '14px', padding: '16px', marginBottom: '14px', background: plan.featured ? 'var(--blue-light)' : 'var(--bg)' }}>
            <div style={{ fontWeight: 900, fontSize: '13.5px', color: 'var(--navy)', marginBottom: '12px' }}>
              {plan.featured ? '⭐' : '▫️'} باقة #{idx + 1} — {plan.name}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={label}>الاسم</label>
                <input style={input} value={plan.name} onChange={e => setPlan(idx, 'name', e.target.value)} />
              </div>
              <div>
                <label style={label}>السعر</label>
                <input style={input} value={plan.price} onChange={e => setPlan(idx, 'price', e.target.value)} />
              </div>
              <div>
                <label style={label}>ملاحظة السعر</label>
                <input style={input} value={plan.priceNote || ''} onChange={e => setPlan(idx, 'priceNote', e.target.value)} />
              </div>
              <div>
                <label style={label}>شريط مميز (ribbon)</label>
                <input style={input} value={plan.ribbon || ''} onChange={e => setPlan(idx, 'ribbon', e.target.value)} />
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={label}>الوصف</label>
              <textarea style={{ ...textarea, minHeight: '50px' }} value={plan.description} onChange={e => setPlan(idx, 'description', e.target.value)} />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={label}>الميزات (سطر لكل ميزة)</label>
              <textarea
                style={{ ...textarea, minHeight: '100px' }}
                value={(plan.features || []).join('\n')}
                onChange={e => setPlan(idx, 'features', e.target.value.split('\n').filter(l => l.trim()))}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div>
                <label style={label}>نص زر الباقة</label>
                <input style={input} value={plan.ctaLabel} onChange={e => setPlan(idx, 'ctaLabel', e.target.value)} />
              </div>
              <label style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', fontSize: '13px', fontWeight: 700, color: 'var(--navy)', paddingBottom: '10px' }}>
                <input type="checkbox" checked={!!plan.featured} onChange={e => setPlan(idx, 'featured', e.target.checked)} />
                باقة مميزة (تصميم بارز)
              </label>
            </div>
          </div>
        ))}
        <SaveButton {...saveState.pricing} onClick={() => save('pricing', draft.pricing)} />
        {err('pricing')}
      </div>

      {/* م4: ترتيب أقسام الرئيسية + ويدجات مخصصة */}
      <div style={card}>
        <h3 style={sectionTitle}>🧩 أقسام الصفحة الرئيسية والويدجات</h3>
        <p style={hint}>
          رتّب الأقسام بالأسهم، أخفِ أي قسم بإلغاء التحديد، وأضف ويدجات نصية مخصصة بينها.
          الهيدر والفوتر ثابتان دائماً.
        </p>
        {(draft.landingLayout?.sections || []).map((sec, idx, arr) => {
          const builtinLabels = {
            hero: '🦸 الهيرو', timezone: '⏰ حاسبة فروق التوقيت', comparison: '⚖️ المقارنة',
            subjects: '📚 المواد والمسارات', testimonials: '💬 آراء الأسر', booking: '📋 نموذج الحجز', faq: '❓ الأسئلة الشائعة',
          };
          const moveSec = (dir) => setDraft(d => {
            const list = [...d.landingLayout.sections];
            const j = idx + dir;
            if (j < 0 || j >= list.length) return d;
            [list[idx], list[j]] = [list[j], list[idx]];
            return { ...d, landingLayout: { ...d.landingLayout, sections: list } };
          });
          const setSec = (field, value) => setDraft(d => {
            const list = d.landingLayout.sections.map((s, i) => (i === idx ? { ...s, [field]: value } : s));
            return { ...d, landingLayout: { ...d.landingLayout, sections: list } };
          });
          const removeSec = () => setDraft(d => ({
            ...d,
            landingLayout: { ...d.landingLayout, sections: d.landingLayout.sections.filter((_, i) => i !== idx) },
          }));
          const isCustom = sec.type === 'custom';
          return (
            <div key={sec.id} style={{ border: '1px dashed var(--line)', borderRadius: '12px', padding: '12px 14px', marginBottom: '10px', background: 'var(--bg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button type="button" onClick={() => moveSec(-1)} disabled={idx === 0} style={{ border: '1px solid var(--line)', background: 'var(--card-bg)', borderRadius: '6px', cursor: idx === 0 ? 'default' : 'pointer', padding: '2px 8px' }}>↑</button>
                  <button type="button" onClick={() => moveSec(1)} disabled={idx === arr.length - 1} style={{ border: '1px solid var(--line)', background: 'var(--card-bg)', borderRadius: '6px', cursor: idx === arr.length - 1 ? 'default' : 'pointer', padding: '2px 8px' }}>↓</button>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '13px', color: 'var(--navy)', flex: 1, cursor: 'pointer' }}>
                  <input type="checkbox" checked={sec.visible !== false} onChange={e => setSec('visible', e.target.checked)} />
                  {isCustom ? `🧩 ويدجت مخصصة: ${sec.title || 'بلا عنوان'}` : (builtinLabels[sec.id] || sec.id)}
                </label>
                {isCustom && removeBtn(removeSec)}
              </div>
              {isCustom && (
                <div style={{ display: 'grid', gap: '8px', marginTop: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: '8px' }}>
                    <input style={input} value={sec.emoji || ''} onChange={e => setSec('emoji', e.target.value)} placeholder="🎉" />
                    <input style={input} value={sec.title || ''} onChange={e => setSec('title', e.target.value)} placeholder="عنوان الويدجت" />
                  </div>
                  <textarea style={{ ...input, minHeight: '70px' }} value={sec.body || ''} onChange={e => setSec('body', e.target.value)} placeholder="نص الويدجت (يدعم أسطراً متعددة)" />
                </div>
              )}
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => setDraft(d => ({
            ...d,
            landingLayout: {
              ...d.landingLayout,
              sections: [...(d.landingLayout?.sections || []), { id: `custom-${Date.now()}`, type: 'custom', emoji: '✨', title: '', body: '', visible: true }],
            },
          }))}
          style={{ border: '1px dashed var(--line)', background: 'var(--bg)', borderRadius: '10px', padding: '8px 16px', cursor: 'pointer', fontWeight: 800, fontSize: '13px', color: 'var(--navy)', marginBottom: '14px' }}
        >
          + إضافة ويدجت مخصصة
        </button>
        <div>
          <SaveButton {...saveState.landingLayout} onClick={() => save('landingLayout', draft.landingLayout)} />
          {err('landingLayout')}
        </div>
      </div>
      </>)}

      {/* م4: تقويم امتحانات المغتربين — كان ثابتاً في الكود، الآن يُدار من هنا (أدمن + محرر محتوى) */}
      <div style={card}>
        <h3 style={sectionTitle}>🗓 تقويم امتحانات المغتربين</h3>
        <p style={hint}>المحطات الرسمية التي تظهر في لوحة ولي الأمر — حدّث المواعيد مع كل عام دراسي.</p>
        <div style={{ display: 'grid', gap: '10px', marginBottom: '14px' }}>
          <input style={input} value={draft.examCalendar?.subtitle || ''} onChange={e => set('examCalendar', 'subtitle', e.target.value)} placeholder="العنوان الفرعي تحت عنوان الأجندة" />
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
            <input style={input} dir="ltr" value={draft.examCalendar?.officialUrl || ''} onChange={e => set('examCalendar', 'officialUrl', e.target.value)} placeholder="رابط بوابة التسجيل الرسمية (https://...)" />
            <input style={input} value={draft.examCalendar?.officialUrlLabel || ''} onChange={e => set('examCalendar', 'officialUrlLabel', e.target.value)} placeholder="نص زر الرابط" />
          </div>
        </div>
        {(draft.examCalendar?.events || []).map((ev, idx) => (
          <div key={idx} className="u-20">
            <div className="u-21">
              <span style={{ fontWeight: 900, fontSize: '12.5px', color: 'var(--navy)' }}>محطة #{idx + 1}</span>
              {removeBtn(() => removeListItem('examCalendar', 'events', idx))}
            </div>
            <div style={{ display: 'grid', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px' }}>
                <input style={input} value={ev.stage || ''} onChange={e => setListItem('examCalendar', 'events', idx, 'stage', e.target.value)} placeholder="اسم المحطة" />
                <input style={input} value={ev.period || ''} onChange={e => setListItem('examCalendar', 'events', idx, 'period', e.target.value)} placeholder="الفترة (مثال: يناير 2027)" />
                <input style={input} value={ev.status || ''} onChange={e => setListItem('examCalendar', 'events', idx, 'status', e.target.value)} placeholder="الحالة (مجدول/قريباً)" />
              </div>
              <textarea style={{ ...input, minHeight: '55px' }} value={ev.details || ''} onChange={e => setListItem('examCalendar', 'events', idx, 'details', e.target.value)} placeholder="التفاصيل" />
              <input style={input} value={ev.officialNote || ''} onChange={e => setListItem('examCalendar', 'events', idx, 'officialNote', e.target.value)} placeholder="ملاحظة فاهم (اختياري)" />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => addListItem('examCalendar', 'events', { stage: '', period: '', status: 'مجدول', details: '', officialNote: '' })}
          style={{ border: '1px dashed var(--line)', background: 'var(--bg)', borderRadius: '10px', padding: '8px 16px', cursor: 'pointer', fontWeight: 800, fontSize: '13px', color: 'var(--navy)', marginBottom: '14px' }}
        >
          + إضافة محطة
        </button>
        <div>
          <SaveButton {...saveState.examCalendar} onClick={() => save('examCalendar', draft.examCalendar)} />
          {err('examCalendar')}
        </div>
      </div>
    </div>
  );
}
