import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { screenFromPath, SCREEN_META } from './routes';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { UIProvider, useUIState } from './context/UIContext';
import { SiteSettingsProvider, useSiteSettings } from './context/SiteSettingsContext';
import AuthGate from './components/AuthGate';
import SideNav from './components/SideNav';
import BottomNav from './components/BottomNav';
import { ThemeToggle } from './context/ThemeContext';
import RequireChild from './components/RequireChild';
import ExamGate from './components/ExamGate';
import Modals from './components/Modals';

// تقسيم الكود: كل شاشة في حزمة مستقلة تُحمَّل عند الطلب
const PublicLandingPage = lazy(() => import('./components/PublicLandingPage'));
const ParentDashboard = lazy(() => import('./components/ParentDashboard'));
const ChildUniverse = lazy(() => import('./components/ChildUniverse'));
const TeacherStudio = lazy(() => import('./components/TeacherStudio'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const EmbassyExamSimulator = lazy(() => import('./components/EmbassyExamSimulator'));
const PricingPlans = lazy(() => import('./components/PricingPlans'));
const MySpace = lazy(() => import('./components/myspace/MySpace'));
const AITutor = lazy(() => import('./components/ai/AITutor'));
const AnalyticsDashboard = lazy(() => import('./components/analytics/AnalyticsDashboard'));

function ScreenFallback() {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 16px', color: 'var(--muted)' }}>
      جارٍ التحميل…
    </div>
  );
}

function ToastBanner() {
  const { toastMessage } = useUIState();
  if (!toastMessage) return null;
  return <div className="toast-banner">{toastMessage}</div>;
}

// SEO: عنوان ووصف ديناميكيان لكل مسار (الرئيسية قابلة للتعديل من إعدادات الموقع)
function DocumentMeta() {
  const { pathname } = useLocation();
  const { settings } = useSiteSettings();
  useEffect(() => {
    const screen = screenFromPath(pathname);
    const meta = SCREEN_META[screen] || SCREEN_META.landing;
    const title = screen === 'landing' ? (settings.seo?.landingTitle || meta.title) : meta.title;
    const description = screen === 'landing' ? (settings.seo?.landingDescription || meta.description) : meta.description;
    document.title = title;
    if (description) {
      document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    }
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', `https://fahem-platform.vercel.app${pathname === '/' ? '/' : pathname}`);
  }, [pathname, settings.seo]);
  return null;
}

function MainAppContent() {
  return (
    <div className="app-container">
      <DocumentMeta />
      {/* القائمة الجانبية الديناميكية (ويب) — الجوال يستخدم BottomNav */}
      <SideNav />

      {/* Main View Router — URL هو مصدر الحقيقة */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Suspense fallback={<ScreenFallback />}>
          <Routes>
            <Route path="/" element={<PublicLandingPage />} />
            <Route
              path="/parent"
              element={
                <AuthGate roles={['parent', 'admin']}>
                  <RequireChild><ParentDashboard /></RequireChild>
                </AuthGate>
              }
            />
            <Route path="/ai-tutor" element={<AITutor />} />
            <Route
              path="/analytics"
              element={
                <AnalyticsDashboard />
              }
            />
            <Route path="/lessons" element={<Navigate to="/child" replace />} />
            <Route path="/child/*" element={<RequireChild><ChildUniverse /></RequireChild>} />
            <Route
              path="/teacher"
              element={
                <AuthGate roles={['teacher', 'admin']}>
                  <TeacherStudio />
                </AuthGate>
              }
            />
            <Route
              path="/admin/*"
              element={
                <AuthGate roles={['admin', 'content_editor']}>
                  <AdminDashboard />
                </AuthGate>
              }
            />
            <Route path="/exam" element={<ExamGate><EmbassyExamSimulator /></ExamGate>} />
            {/* التسجيل الحقيقي موحّد في /account (حساب Supabase) — المعالج المحلي القديم أُلغي */}
            <Route path="/onboarding" element={<Navigate to="/account" replace />} />
            <Route path="/pricing" element={<PricingPlans />} />
            <Route path="/account" element={<MySpace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>

      {/* Global Interactive Modals */}
      <Modals />

      {/* Mobile Bottom Navigation */}
      <ThemeToggle />
      <BottomNav />

      {/* Global Toast Alert */}
      <ToastBanner />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <UIProvider>
        <AppProvider>
          <SiteSettingsProvider>
            <MainAppContent />
          </SiteSettingsProvider>
        </AppProvider>
      </UIProvider>
    </AuthProvider>
  );
}
