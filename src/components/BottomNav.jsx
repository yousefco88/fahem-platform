import React from 'react';
import { useApp } from '../context/AppContext';

export default function BottomNav() {
  const { currentScreen, setCurrentScreen, setShowLiveModal } = useApp();

  const navItems = [
    { id: 'landing', icon: '🏠', label: 'الرئيسية' },
    { id: 'child', icon: '🎓', label: 'التعلم' },
    { id: 'exam', icon: '📝', label: 'الامتحانات' },
    { id: 'parent', icon: '👨‍👩‍👦', label: 'ولي الأمر' },
    { id: 'more', icon: '☰', label: 'المزيد' },
  ];

  const [showMore, setShowMore] = React.useState(false);

  const moreItems = [
    { id: 'teacher', icon: '👩‍🏫', label: 'مساحة المعلم' },
    { id: 'admin', icon: '⚙️', label: 'الإدارة' },
    { id: 'pricing', icon: '💳', label: 'اشتراكي' },
    { id: 'account', icon: '🔐', label: 'حسابي' },
    { id: 'onboarding', icon: '📋', label: 'التسجيل' },
    { id: 'live', icon: '🔴', label: 'البث المباشر' },
  ];

  const handleNavClick = (id) => {
    if (id === 'more') {
      setShowMore(!showMore);
    } else if (id === 'live') {
      setShowLiveModal(true);
      setShowMore(false);
    } else {
      setCurrentScreen(id);
      setShowMore(false);
    }
  };

  return (
    <>
      {/* More Menu Overlay */}
      {showMore && (
        <div 
          className="bottom-nav-overlay"
          onClick={() => setShowMore(false)}
        >
          <div 
            className="bottom-nav-more-menu"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="more-menu-header">
              <span>المزيد من الخيارات</span>
              <button 
                className="more-menu-close"
                onClick={() => setShowMore(false)}
              >
                ✕
              </button>
            </div>
            <div className="more-menu-grid">
              {moreItems.map((item) => (
                <button
                  key={item.id}
                  className={`more-menu-item ${currentScreen === item.id ? 'active' : ''}`}
                  onClick={() => handleNavClick(item.id)}
                >
                  <span className="more-menu-icon">{item.icon}</span>
                  <span className="more-menu-label">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="bottom-nav" aria-label="التنقل الرئيسي">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`bottom-nav-item ${
              item.id === 'more' 
                ? (showMore ? 'active' : '') 
                : (currentScreen === item.id ? 'active' : '')
            }`}
            onClick={() => handleNavClick(item.id)}
            aria-current={currentScreen === item.id ? 'page' : undefined}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span className="bottom-nav-label">{item.label}</span>
            {item.id === currentScreen && <span className="bottom-nav-indicator" />}
          </button>
        ))}
      </nav>
    </>
  );
}
