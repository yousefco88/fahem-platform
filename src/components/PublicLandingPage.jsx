import React from 'react';
import LandingHeader from './landing/LandingHeader';
import HeroSection from './landing/HeroSection';
import TimezoneSection from './landing/TimezoneSection';
import ComparisonSection from './landing/ComparisonSection';
import SubjectsSection from './landing/SubjectsSection';
import TestimonialsSection from './landing/TestimonialsSection';
import BookingSection from './landing/BookingSection';
import FaqSection from './landing/FaqSection';
import FooterSection from './landing/FooterSection';

// صفحة الهبوط العامة — تركيب أقسام فقط؛ كل قسم يملك حالته ومحتواه
export default function PublicLandingPage() {
  return (
    <div style={{ background: '#f8fafc', color: 'var(--navy)', fontFamily: 'Cairo, sans-serif', minHeight: '100vh' }}>
      <LandingHeader />
      <HeroSection />
      <TimezoneSection />
      <ComparisonSection />
      <SubjectsSection />
      <TestimonialsSection />
      <BookingSection />
      <FaqSection />
      <FooterSection />
    </div>
  );
}
