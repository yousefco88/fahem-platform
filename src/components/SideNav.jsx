/**
 * SideNav.jsx — القائمة الجانبية الديناميكية (ويب ≥769px فقط)
 * تحل محل RoleBar العلوي. تُبنى بالكامل من navConfig حسب الدور الحالي،
 * قابلة للطي إلى أيقونات (يُحفظ التفضيل في localStorage)،
 * والجوال لا يتأثر: BottomNav يبقى كما هو (≤768px).
 */
import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { getNavForRole, resolveNavRole, ROLE_LABELS, adminSectionsForRole, adminSectionPath, resolveAdminLocation, ADMIN_HUBS, hubViewsForRole } from '../navigation/navConfig';
import { supabase } from '../lib/supabase';
import { fetchHubPendingCounts } from '../lib/hubPendingCounts';
import Emoji from '../ui/Emoji';

export default function SideNav() {
  const { currentScreen, setCurrentScreen } = useApp();
  const { user, role, caps } = useAuth();
  const navRole = resolveNavRole(user, role);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const adminSections = adminSectionsForRole(navRole, caps);
  const [adminOpen, setAdminOpen] = useState(false);
  const onAdmin = currentScreen === 'admin';
  const activeSectionId = onAdmin
    ? resolveAdminLocation(navRole, location.pathname, searchParams.get('tab'), caps).section
    : null;
  // مجموع ما بانتظار الإجراء لكل مركز؛ يُجلب فقط والقائمة مفتوحة، ويتحدّث مع كل تنقّل داخل الإدارة.
  const [hubTotals, setHubTotals] = useState({});
  const showSub = onAdmin && adminOpen;
  useEffect(() => {
    if (!showSub) return undefined;
    let alive = true;
    const hubs = adminSections.filter(sec => ADMIN_HUBS[sec.id]).map(sec => sec.id);
    Promise.all(hubs.map(h => fetchHubPendingCounts(supabase, hubViewsForRole(h, navRole, caps))))
      .then(all => {
        if (!alive) return;
        setHubTotals(Object.fromEntries(hubs.map((h, i) => [h, Object.values(all[i]).reduce((a, b) => a + b, 0)])));
      });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSub, navRole, caps, location.search]);
  // «الإدارة»: من خارجها تفتح اللوحة والقائمة، وداخلها كل ضغطة تُظهر القائمة أو تخفيها
  const clickAdmin = () => {
    if (!onAdmin) { navigate('/admin'); setAdminOpen(true); return; }
    setAdminOpen(o => !o);
  };
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
        <span className="side-nav-logo"><Emoji>🎓</Emoji></span>
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
            {group.items.map(item => item.id === 'admin' && adminSections.length ? (
              <React.Fragment key={item.id}>
                <button
                  className={`side-nav-item ${item.variant || ''} ${onAdmin ? 'active' : ''}`}
                  onClick={clickAdmin}
                  aria-expanded={!collapsed && onAdmin && adminOpen}
                  aria-current={onAdmin ? 'page' : undefined}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="side-nav-icon" aria-hidden="true"><Emoji>{item.icon}</Emoji></span>
                  {!collapsed && <span className="side-nav-label">{item.label}</span>}
                  {!collapsed && <span className="side-nav-caret" aria-hidden="true">{onAdmin && adminOpen ? '▴' : '▾'}</span>}
                </button>
                {!collapsed && onAdmin && adminOpen && (
                  <div className="side-nav-sub" role="menu" aria-label="أقسام الإدارة">
                    {adminSections.map(sec => (
                      <button key={sec.id} role="menuitem"
                        className={`side-nav-sub-item ${activeSectionId === sec.id ? 'active' : ''}`}
                        onClick={() => navigate(adminSectionPath(sec))}>
                        <span aria-hidden="true"><Emoji>{sec.icon}</Emoji></span><span>{sec.label}</span>
                        {hubTotals[sec.id] > 0 && (
                          <span className="side-nav-badge" aria-label={`${hubTotals[sec.id]} بانتظار الإجراء`}>{hubTotals[sec.id]}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </React.Fragment>
            ) : (
              <button
                key={item.id}
                className={`side-nav-item ${item.variant || ''} ${currentScreen === item.id ? 'active' : ''}`}
                onClick={() => setCurrentScreen(item.id)}
                aria-current={currentScreen === item.id ? 'page' : undefined}
                title={collapsed ? item.label : undefined}
              >
                <span className="side-nav-icon" aria-hidden="true"><Emoji>{item.icon}</Emoji></span>
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
