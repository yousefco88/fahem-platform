/**
 * SideNav.jsx — القائمة الجانبية الديناميكية (ويب ≥769px فقط)
 * تحل محل RoleBar العلوي. تُبنى بالكامل من navConfig حسب الدور الحالي،
 * قابلة للطي إلى أيقونات (يُحفظ التفضيل في localStorage)،
 * والجوال لا يتأثر: BottomNav يبقى كما هو (≤768px).
 */
import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { getNavForRole, resolveNavRole, ROLE_LABELS } from '../navigation/navConfig';

export default function SideNav() {
  const { currentScreen, setCurrentScreen } = useApp();
  const { user, role } = useAuth();
  const navRole = resolveNavRole(user, role);
  const nav = getNavForRole(navRole);

  const NAV_GROUPS = [
    { label: ROLE_LABELS[navRole], items: nav.primary },
    ...(nav.more.length ? [{ label: 'المزيد', items: nav.more }] : [])
  ];

  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('fahem_sidenav_collapsed') === '1');

  // إزاحة المحتوى حسب حالة الطي — عبر كلاس على body تتحكم به CSS (ويب فقط)
  useEffect(() => {
    document.body.classList.add('has-sidenav');
    document.body.classList.toggle('sidenav-collapsed', collapsed);
    return () => {
      document.body.classList.remove('has-sidenav', 'sidenav-collapsed');
    };
  }, [collapsed]);

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      localStorage.setItem('fahem_sidenav_collapsed', prev ? '0' : '1');
      return !prev;
    });
  };

  return (
    <aside className={`side-nav ${collapsed ? 'collapsed' : ''}`} aria-label="أقسام منصة فاهم">
      <div className="side-nav-brand">
        <span className="side-nav-logo">🎓</span>
        {!collapsed && (
          <div className="side-nav-brand-text">
            <strong>منصة فاهم</strong>
            <small>التعليم الحي لأبنائنا بالخارج</small>
          </div>
        )}
      </div>

      <nav className="side-nav-groups">
        {NAV_GROUPS.map(group => (
          <div className="side-nav-group" key={group.label}>
            {!collapsed && <span className="side-nav-group-label">{group.label}</span>}
            {group.items.map(item => (
              <button
                key={item.id}
                className={`side-nav-item ${item.variant || ''} ${currentScreen === item.id ? 'active' : ''}`}
                onClick={() => setCurrentScreen(item.id)}
                aria-current={currentScreen === item.id ? 'page' : undefined}
                title={collapsed ? item.label : undefined}
              >
                <span className="side-nav-icon" aria-hidden="true">{item.icon}</span>
                {!collapsed && <span className="side-nav-label">{item.label}</span>}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <button
        className="side-nav-toggle"
        onClick={toggleCollapsed}
        aria-expanded={!collapsed}
        title={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
      >
        {collapsed ? '⏴' : '⏵'}
        {!collapsed && <span>طي القائمة</span>}
      </button>
    </aside>
  );
}
