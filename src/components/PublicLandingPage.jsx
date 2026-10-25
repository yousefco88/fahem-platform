import React from 'react';
import { useSiteSettings } from '../context/SiteSettingsContext';
import LandingHeader from './landing/LandingHeader';
import HeroSection from './landing/HeroSection';
import TimezoneSection from './landing/TimezoneSection';
import ComparisonSection from './landing/ComparisonSection';
import SubjectsSection from './landing/SubjectsSection';
import TestimonialsSection from './landing/TestimonialsSection';
import BookingSection from './landing/BookingSection';
import FaqSection from './landing/FaqSection';
import FooterSection from './landing/FooterSection';
import StickyMobileCta from './landing/StickyMobileCta';

// خريطة الأقسام المدمجة — ترتيبها وإظهارها يأتيان من إعدادات الموقع (landing_layout)
const SECTION_COMPONENTS = {
  hero: HeroSection,
  timezone: TimezoneSection,
  comparison: ComparisonSection,
  subjects: SubjectsSection,
  testimonials: TestimonialsSection,
  booking: BookingSection,
  faq: FaqSection,
};

// ويدجت مخصصة من لوحة الإدارة: { id, type: 'custom', emoji, title, body }
function CustomWidget({ widget }) {
  if (!widget.title?.trim() && !widget.body?.trim()) return null;
  return (
    <section style={{ padding: '48px 20px', maxWidth: 960, margin: '0 auto' }} dir="rtl">
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 20, padding: '28px 32px', textAlign: 'center', boxShadow: '0 4px 16px rgba(15,23,42,0.05)' }}>
        {widget.emoji && <div style={{ fontSize: 36, marginBottom: 10 }}>{widget.emoji}</div>}
        {widget.title?.trim() && <h2 style={{ fontSize: 24, color: 'var(--navy)', margin: '0 0 10px', fontWeight: 900 }}>{widget.title}</h2>}
        {widget.body?.trim() && <p style={{ fontSize: 15.5, color: 'var(--muted)', lineHeight: 1.9, margin: 0, whiteSpace: 'pre-line' }}>{widget.body}</p>}
      </div>
    </section>
  );
}

// صفحة الهبوط العامة — الأقسام البينية تُبنى من إعدادات الموقع؛ الهيدر/الفوتر/الشريط ثابتون
export default function PublicLandingPage() {
  const { settings } = useSiteSettings();
  const layout = Array.isArray(settings.landingLayout?.sections) && settings.landingLayout.sections.length
    ? settings.landingLayout.sections
    : Object.keys(SECTION_COMPONENTS).map(id => ({ id, visible: true }));

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--navy)', fontFamily: 'Cairo, sans-serif', minHeight: '100vh' }}>
      <LandingHeader />
      {layout.map(entry => {
        if (entry.visible === false) return null;
        if (entry.type === 'custom') return <CustomWidget key={entry.id} widget={entry} />;
        const Section = SECTION_COMPONENTS[entry.id];
        return Section ? <Section key={entry.id} /> : null;
      })}
      <FooterSection />
      <StickyMobileCta />
    </div>
  );
}
