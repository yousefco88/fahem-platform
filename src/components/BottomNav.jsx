import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { getNavForRole, resolveNavRole } from '../navigation/navConfig';

export default function BottomNav() {
  const { currentScreen, setCurrentScreen } = useApp();
  const { user, role } = useAuth();
  const nav = getNavForRole(resolveNavRole(user, role));
  const navItems = nav.mobile || nav.primary;

  const handleNavClick = (id) => setCurrentScreen(id);

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="bottom-nav" aria-label="التنقل الرئيسي">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`bottom-nav-item ${currentScreen === item.id ? 'active' : ''}`}
            onClick={() => handleNavClick(item.id)}
            aria-current={currentScreen === item.id ? 'page' : undefined}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span className="bottom-nav-label">{item.short || item.label}</span>
            {item.id === currentScreen && <span className="bottom-nav-indicator" />}
          </button>
        ))}
      </nav>
    </>
  );
}
