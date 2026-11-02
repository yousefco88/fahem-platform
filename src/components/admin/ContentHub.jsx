/**
 * ContentHub — مركز المحتوى: المناهج ← مراجعة الدروس ← مراجعة التسجيلات
 * غلاف فقط: يعرض المكونات القائمة كما هي ضمن خطوات مرتّبة حسب دورة حياة الدرس.
 * الصلاحيات: الخطوات تُصفّى حسب الدور، والخادم يفرضها فعلياً (RLS / review_lesson).
 */
import { Routes, Route } from 'react-router-dom';
import AdminHub from './AdminHub';
import { GradesPanel, SubjectsPanel, LessonsPanel, LessonEditor } from './curriculum';
import LessonReview from './LessonReview';
import RecordingsReview from './RecordingsReview';
import './curriculum/CurriculumAdmin.css';

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
              <Routes>
                <Route index element={<GradesPanel />} />
                <Route path="grades" element={<GradesPanel />} />
                <Route path="subjects" element={<SubjectsPanel />} />
                <Route path="lessons" element={<LessonsPanel />} />
                <Route path="lesson/:id" element={<LessonEditor />} />
              </Routes>
            </div>
          )}
          {active === 'lessonReview' && <LessonReview />}
          {active === 'recordings' && role === 'admin' && <RecordingsReview />}
        </>
      )}
    />
  );
}
