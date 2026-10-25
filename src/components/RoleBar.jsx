import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { getNavForRole, resolveNavRole, ROLE_LABELS } from '../navigation/navConfig';

export default function RoleBar() {
  const { currentScreen, setCurrentScreen } = useApp();
  const { user, role } = useAuth();
  const navRole = resolveNavRole(user, role);
  const nav = getNavForRole(navRole);
  const NAV_GROUPS = [
    { label: ROLE_LABELS[navRole], items: nav.primary },
    ...(nav.more.length ? [{ label: 'المزيد', items: nav.more }] : [])
  ];
  const ALL_ITEMS = NAV_GROUPS.flatMap(g => g.items);
  const handleItem = (id) => setCurrentScreen(id);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('fahem_rolebar_collapsed') === '1');

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      localStorage.setItem('fahem_rolebar_collapsed', prev ? '0' : '1');
      return !prev;
    });
  };

  const current = ALL_ITEMS.find(i => i.id === currentScreen);

  return (
    <header className={`role-bar ${collapsed ? 'collapsed' : ''}`}>
      <div className="role-bar-top">
        <div className="role-bar-left">
          <span className="role-bar-title">منصة فاهم</span>
          <span className="role-bar-sub">التعليم الحي والمتقن لأبنائنا بالخارج</span>
        </div>

        {collapsed && current && (
          <span className="role-bar-current">
            {current.icon} {current.label}
          </span>
        )}

        <div className="role-bar-actions">
          <button
            className="role-bar-toggle"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            title={collapsed ? 'إظهار أقسام المنصة' : 'إخفاء أقسام المنصة'}
          >
            {collapsed ? '🧭 الأقسام' : '▲ إخفاء'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <nav className="role-pills" aria-label="أقسام منصة فاهم">
          {NAV_GROUPS.map(group => (
            <div className="role-group" key={group.label}>
              <span className="role-group-label">{group.label}</span>
              {group.items.map(item => (
                <button
                  key={item.id}
                  className={`role-pill-btn ${item.variant || ''} ${currentScreen === item.id ? 'active' : ''}`}
                  onClick={() => handleItem(item.id)}
                  aria-current={currentScreen === item.id ? 'page' : undefined}
                >
                  {item.icon} {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
      )}
    </header>
  );
}
