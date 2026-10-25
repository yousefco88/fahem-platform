import React from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getNavForRole, resolveNavRole } from '../navigation/navConfig';

export default function BottomNav() {
  const { currentScreen, setCurrentScreen } = useApp();
  const { lang, setLang, languages } = useLanguage();
  const { isDark, toggle: toggleTheme } = useTheme();

  const { user, role } = useAuth();
  const nav = getNavForRole(resolveNavRole(user, role));
  const navItems = [...nav.primary, { id: 'more', icon: '☰', label: 'المزيد' }];
  const moreItems = nav.more;

  const [showMore, setShowMore] = React.useState(false);

  const handleNavClick = (id) => {
    if (id === 'more') {
      setShowMore(!showMore);
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
            
            {/* Settings Row */}
            <div className="more-menu-settings">
              {/* Language Toggle */}
              <div className="settings-row">
                <span className="settings-label">🌐 اللغة</span>
                <div className="settings-buttons">
                  {Object.entries(languages).map(([code, info]) => (
                    <button
                      key={code}
                      onClick={() => setLang(code)}
                      className={`settings-btn ${lang === code ? 'active' : ''}`}
                    >
                      {info.flag} {info.name}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Theme Toggle */}
              <div className="settings-row">
                <span className="settings-label">🎨 المظهر</span>
                <button
                  onClick={toggleTheme}
                  className="settings-btn theme-toggle"
                >
                  {isDark ? '☀️ فاتح' : '🌙 داكن'}
                </button>
              </div>
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
