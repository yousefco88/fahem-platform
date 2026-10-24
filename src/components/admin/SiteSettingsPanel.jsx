import React, { useState } from 'react';
import { useSiteSettings } from '../../context/SiteSettingsContext';

/**
 * ⚙️ إعدادات الموقع — تعديل محتوى الموقع العام من لوحة الإدارة:
 * الشريط العلوي، الهيدر، الهيرو، الفوتر، SEO، الباقات والأسعار.
 * الحفظ في Supabase (site_settings) وتنعكس التغييرات فوراً على الموقع.
 */

const label = { display: 'block', fontSize: '12.5px', fontWeight: 800, color: 'var(--navy)', marginBottom: '6px' };
const input = { width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--line)', fontSize: '13.5px', fontFamily: 'inherit', background: 'white', color: 'var(--navy)' };
const textarea = { ...input, minHeight: '70px', resize: 'vertical' };
const card = { background: 'white', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '22px', boxShadow: 'var(--shadow-sm)', marginBottom: '20px' };
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

export default function SiteSettingsPanel() {
  const { settings, tableMissing, saveSection } = useSiteSettings();
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(settings)));
  const [saveState, save] = useSectionSaver(saveSection);

  const set = (section, field, value) =>
    setDraft(d => ({ ...d, [section]: { ...d[section], [field]: value } }));

  const setPlan = (idx, field, value) =>
    setDraft(d => {
      const plans = d.pricing.plans.map((p, i) => (i === idx ? { ...p, [field]: value } : p));
      return { ...d, pricing: { ...d.pricing, plans } };
    });

  const err = (key) => saveState[key]?.error && (
    <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '8px' }}>⚠️ {saveState[key].error}</div>
  );

  return (
    <div>
      {tableMissing && (
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', fontSize: '13px', color: '#92400e', fontWeight: 700 }}>
          ⚠️ جدول site_settings غير موجود بعد في Supabase — طبّق الـ migration:
          <code style={{ display: 'block', marginTop: '6px', direction: 'ltr', textAlign: 'left', fontSize: '12px' }}>supabase/migrations/20261024210000_site_settings.sql</code>
          حتى ذلك الحين يعرض الموقع القيم الافتراضية ولن يُحفظ أي تعديل.
        </div>
      )}

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
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
          <div key={plan.id} style={{ border: '1px dashed var(--line)', borderRadius: '14px', padding: '16px', marginBottom: '14px', background: plan.featured ? '#eff6ff' : '#fafafa' }}>
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
    </div>
  );
}
