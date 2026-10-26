import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const linkStyle = ({ isActive }) => ({
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '10px 14px', borderRadius: 10,
  color: isActive ? 'var(--blue-text)' : 'var(--muted)',
  background: isActive ? 'var(--blue-light)' : 'transparent',
  textDecoration: 'none', fontWeight: 800, whiteSpace: 'nowrap',
});

export default function TeacherLayout() {
  const { role } = useAuth();
  const location = useLocation();
  const curriculumActive = location.pathname.startsWith('/teacher/curriculum');

  return (
    <main className="teacher-page" dir="rtl">
      <header className="teacher-workspace-header">
        <div>
          <p className="teacher-workspace-kicker">مساحة العمل</p>
          <h1>مساحة المعلم</h1>
          <p>حصصك وطلابك ومناهجك المسندة إليك في مكان واحد.</p>
        </div>
        {role === 'admin' && <NavLink className="teacher-admin-link" to="/admin">إدارة الجداول والإسناد ←</NavLink>}
      </header>
      <nav className="teacher-workspace-nav" aria-label="أقسام مساحة المعلم">
        <NavLink end to="/teacher" style={linkStyle}>🏠 الرئيسية</NavLink>
        <NavLink to="/teacher/classes" style={({ isActive }) => linkStyle({ isActive })}>🗓️ الحصص والطلاب</NavLink>
        <NavLink to="/teacher/curriculum" style={() => linkStyle({ isActive: curriculumActive })}>📚 مناهجي</NavLink>
      </nav>
      <Outlet />
    </main>
  );
}
