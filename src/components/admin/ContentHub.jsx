/**
 * ContentHub — مركز المحتوى: المناهج ← مراجعة الدروس ← مراجعة التسجيلات
 * غلاف فقط: يعرض المكونات القائمة كما هي ضمن خطوات مرتّبة حسب دورة حياة الدرس.
 * الصلاحيات: الخطوات تُصفّى حسب الدور، والخادم يفرضها فعلياً (RLS / review_lesson).
 */
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import AdminHub from './AdminHub';
import { useAuth } from '../../context/AuthContext';
import { GradesPanel, SubjectsPanel, LessonsPanel, LessonEditor, TeacherSubjectsPanel } from './curriculum';
import Emoji from '../../ui/Emoji';
import LessonReview from './LessonReview';
import RecordingsReview from './RecordingsReview';
import './curriculum/CurriculumAdmin.css';

// قسما المناهج: شجرة المحتوى (صف ← مادة ← درس) ثم من يدرّس كل مادة — الثاني للمدير فقط.
function CurriculumSections({ role }) {
  const { pathname } = useLocation();
  const { caps } = useAuth();
  if (role !== 'admin' && !caps?.has('teachers.assign')) return null;
  const onTeachers = pathname.replace(/\/+$/, '') === '/admin/teachers';
  return (
    <nav className="content-hub-sections" aria-label="أقسام المناهج">
      <NavLink to="/admin/grades" className={() => `content-hub-section ${onTeachers ? '' : 'active'}`} aria-current={onTeachers ? undefined : 'page'}>
        <Emoji>🌳</Emoji> الصفوف والمواد والدروس
      </NavLink>
      <NavLink to="/admin/teachers" className={() => `content-hub-section ${onTeachers ? 'active' : ''}`} aria-current={onTeachers ? 'page' : undefined}>
        <Emoji>🎓</Emoji> المعلمون والمواد
      </NavLink>
    </nav>
  );
}

export default function ContentHub({ role, view }) {
  return (
    <AdminHub
      hubId="content"
      role={role}
      view={view}
      renderView={active => (
        <>
          {active === 'curriculum' && (
            <div className="u-3">
              <CurriculumSections role={role} />
              <Routes>
                <Route index element={<GradesPanel />} />
                <Route path="grades" element={<GradesPanel />} />
                <Route path="subjects" element={<SubjectsPanel />} />
                <Route path="lessons" element={<LessonsPanel />} />
                <Route path="lesson/:id" element={<LessonEditor />} />
                <Route path="teachers" element={<TeacherSubjectsPanel />} />
              </Routes>
            </div>
          )}
          {active === 'lessonReview' && <LessonReview />}
          {active === 'recordings' && <RecordingsReview />}
        </>
      )}
    />
  );
}
