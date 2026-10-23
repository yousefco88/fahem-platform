import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

// ترتيب منطقي بمجموعات حسب الجمهور — بدل صف واحد طويل يُقصّ أفقياً
const NAV_GROUPS = [
  {
    label: 'عام',
    items: [
      { screen: 'landing', icon: '🌐', text: 'صفحة الهبوط' },
      { screen: 'pricing', icon: '💳', text: 'الباقات' },
      { screen: 'onboarding', icon: '📝', text: 'تسجيل الأسر' }
    ]
  },
  {
    label: 'ولي الأمر',
    items: [
      { screen: 'parent', icon: '👨‍👩‍👦', text: 'لوحة ولي الأمر' },
      { screen: 'account', icon: '🔐', text: 'الحساب' },
      { screen: 'exam', icon: '🇪🇬', text: 'محاكي الامتحانات', variant: 'exam' }
    ]
  },
  {
    label: 'التعلّم',
    items: [
      { screen: 'child', icon: '🚀', text: 'مساحة الطفل', variant: 'child' },
      { screen: 'teacher', icon: '👩‍🏫', text: 'مساحة المعلم', variant: 'teacher' }
    ]
  },
  {
    label: 'الإدارة',
    items: [
      { screen: 'admin', icon: '⚙️', text: 'الإدارة (Admin)', variant: 'admin' }
    ]
  }
];

const ALL_ITEMS = NAV_GROUPS.flatMap(g => g.items);

export default function RoleBar() {
  const { currentScreen, setCurrentScreen, setShowLiveModal } = useApp();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('fahem_rolebar_collapsed') === '1');

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      localStorage.setItem('fahem_rolebar_collapsed', prev ? '0' : '1');
      return !prev;
    });
  };

  const current = ALL_ITEMS.find(i => i.screen === currentScreen);

  return (
    <header className={`role-bar ${collapsed ? 'collapsed' : ''}`}>
      <div className="role-bar-top">
        <div className="role-bar-left">
          <span className="role-bar-title">منصة فاهم</span>
          <span className="role-bar-sub">التعليم الحي والمتقن لأبنائنا بالخارج</span>
        </div>

        {collapsed && current && (
          <span className="role-bar-current">
            {current.icon} {current.text}
          </span>
        )}

        <div className="role-bar-actions">
          <button className="role-pill-btn live" onClick={() => setShowLiveModal(true)}>
            🔴 الفصل الحي
          </button>
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
                  key={item.screen}
                  className={`role-pill-btn ${item.variant || ''} ${currentScreen === item.screen ? 'active' : ''}`}
                  onClick={() => setCurrentScreen(item.screen)}
                  aria-current={currentScreen === item.screen ? 'page' : undefined}
                >
                  {item.icon} {item.text}
                </button>
              ))}
            </div>
          ))}
        </nav>
      )}
    </header>
  );
}
