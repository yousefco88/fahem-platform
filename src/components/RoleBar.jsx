import React from 'react';
import { useApp } from '../context/AppContext';

export default function RoleBar() {
  const { currentScreen, setCurrentScreen, setShowLiveModal } = useApp();

  return (
    <header className="role-bar">
      <div className="role-bar-left">
        <span className="role-bar-title">منصة فاهم (React App)</span>
        <span style={{ opacity: 0.4 }}>|</span>
        <span className="role-bar-sub">نظام التعليم الحي والمتقن لأبنائنا بالخارج</span>
      </div>

      <div className="role-pills">
        <span style={{ fontSize: '11px', opacity: 0.8, marginLeft: '4px' }}>الواجهة الحالية:</span>
        
        <button
          className={`role-pill-btn ${currentScreen === 'parent' ? 'active' : ''}`}
          onClick={() => setCurrentScreen('parent')}
        >
          👨‍👩‍👦 لوحة ولي الأمر
        </button>

        <button
          className={`role-pill-btn child ${currentScreen === 'child' ? 'active' : ''}`}
          onClick={() => setCurrentScreen('child')}
        >
          🚀 مساحة الطفل
        </button>

        <button
          className={`role-pill-btn teacher ${currentScreen === 'teacher' ? 'active' : ''}`}
          onClick={() => setCurrentScreen('teacher')}
        >
          👩‍🏫 مساحة المعلم (أ/ سارة)
        </button>

        <button
          className={`role-pill-btn ${currentScreen === 'admin' ? 'active' : ''}`}
          style={{
            background: currentScreen === 'admin' ? '#0f172a' : 'rgba(255,255,255,0.12)',
            color: currentScreen === 'admin' ? '#38bdf8' : '#e2e8f0',
            border: currentScreen === 'admin' ? '1.5px solid #38bdf8' : '1px solid rgba(255,255,255,0.2)'
          }}
          onClick={() => setCurrentScreen('admin')}
        >
          ⚙️ الإدارة العامة (Admin)
        </button>

        <button
          className={`role-pill-btn ${currentScreen === 'exam' ? 'active' : ''}`}
          style={{
            background: currentScreen === 'exam' ? '#be123c' : 'rgba(255,255,255,0.12)',
            color: currentScreen === 'exam' ? '#ffe4e6' : '#f8fafc',
            border: currentScreen === 'exam' ? '1.5px solid #fb7185' : '1px solid rgba(255,255,255,0.2)'
          }}
          onClick={() => setCurrentScreen('exam')}
        >
          🇪🇬 محاكي امتحانات السفارة
        </button>

        <button
          className={`role-pill-btn ${currentScreen === 'onboarding' ? 'active' : ''}`}
          onClick={() => setCurrentScreen('onboarding')}
        >
          📝 تسجيل الأسر والمنطقة
        </button>

        <button
          className={`role-pill-btn ${currentScreen === 'pricing' ? 'active' : ''}`}
          onClick={() => setCurrentScreen('pricing')}
        >
          💳 الباقات والاشتراك
        </button>

        <button
          className="role-pill-btn live"
          onClick={() => setShowLiveModal(true)}
        >
          🔴 الفصل الحي المباشر
        </button>
      </div>
    </header>
  );
}
