import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { UIProvider, useUIState } from './context/UIContext';
import AuthGate from './components/AuthGate';
import RoleBar from './components/RoleBar';
import BottomNav from './components/BottomNav';
import Modals from './components/Modals';

// تقسيم الكود: كل شاشة في حزمة مستقلة تُحمَّل عند الطلب
const PublicLandingPage = lazy(() => import('./components/PublicLandingPage'));
const ParentDashboard = lazy(() => import('./components/ParentDashboard'));
const ChildUniverse = lazy(() => import('./components/ChildUniverse'));
const TeacherStudio = lazy(() => import('./components/TeacherStudio'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const EmbassyExamSimulator = lazy(() => import('./components/EmbassyExamSimulator'));
const OnboardingFlow = lazy(() => import('./components/OnboardingFlow'));
const PricingPlans = lazy(() => import('./components/PricingPlans'));
const ParentAccount = lazy(() => import('./components/ParentAccount'));

function ScreenFallback() {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 16px', color: 'var(--text-muted, #64748b)' }}>
      جارٍ التحميل…
    </div>
  );
}

function ToastBanner() {
  const { toastMessage } = useUIState();
  if (!toastMessage) return null;
  return <div className="toast-banner">{toastMessage}</div>;
}

function MainAppContent() {
  return (
    <div className="app-container">
      {/* Top Role & View Switcher */}
      <RoleBar />

      {/* Main View Router — URL هو مصدر الحقيقة */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Suspense fallback={<ScreenFallback />}>
          <Routes>
            <Route path="/" element={<PublicLandingPage />} />
            <Route path="/parent" element={<ParentDashboard />} />
            <Route path="/child" element={<ChildUniverse />} />
            <Route
              path="/teacher"
              element={
                <AuthGate roles={['teacher', 'admin']}>
                  <TeacherStudio />
                </AuthGate>
              }
            />
            <Route
              path="/admin"
              element={
                <AuthGate roles={['admin']}>
                  <AdminDashboard />
                </AuthGate>
              }
            />
            <Route path="/exam" element={<EmbassyExamSimulator />} />
            <Route path="/onboarding" element={<OnboardingFlow />} />
            <Route path="/pricing" element={<PricingPlans />} />
            <Route path="/account" element={<ParentAccount />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>

      {/* Global Interactive Modals */}
      <Modals />

      {/* Mobile Bottom Navigation */}
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
          <MainAppContent />
        </AppProvider>
      </UIProvider>
    </AuthProvider>
  );
}
