import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import RoleBar from './components/RoleBar';
import ParentDashboard from './components/ParentDashboard';
import ChildUniverse from './components/ChildUniverse';
import TeacherStudio from './components/TeacherStudio';
import OnboardingFlow from './components/OnboardingFlow';
import PricingPlans from './components/PricingPlans';
import AdminDashboard from './components/AdminDashboard';
import EmbassyExamSimulator from './components/EmbassyExamSimulator';
import PublicLandingPage from './components/PublicLandingPage';
import Modals from './components/Modals';

function MainAppContent() {
  const { currentScreen, toastMessage } = useApp();

  return (
    <div className="app-container">
      {/* Top Role & View Switcher */}
      <RoleBar />

      {/* Main View Router */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {currentScreen === 'landing' && <PublicLandingPage />}
        {currentScreen === 'parent' && <ParentDashboard />}
        {currentScreen === 'child' && <ChildUniverse />}
        {currentScreen === 'teacher' && <TeacherStudio />}
        {currentScreen === 'admin' && <AdminDashboard />}
        {currentScreen === 'exam' && <EmbassyExamSimulator />}
        {currentScreen === 'onboarding' && <OnboardingFlow />}
        {currentScreen === 'pricing' && <PricingPlans />}
      </div>

      {/* Global Interactive Modals */}
      <Modals />

      {/* Global Toast Alert */}
      {toastMessage && (
        <div className="toast-banner">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
