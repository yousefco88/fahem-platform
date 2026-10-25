import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ChildTopBar from './child/ChildTopBar';

// مساحة الطفل — تخطيط ثابت + مسارات فرعية، كل جزء في حزمة مستقلة
const ChildHome = lazy(() => import('./child/ChildHome'));
const SubjectLessons = lazy(() => import('./child/SubjectLessons'));
const ChildLessonRoute = lazy(() => import('./child/ChildLessonRoute'));

function ChildFallback() {
  return <div className="u-6">جارٍ التحميل… 🚀</div>;
}

export default function ChildUniverse() {
  return (
    <div style={{
      background: 'radial-gradient(circle at 10% 20%, var(--blue-light) 0%, var(--green-light) 90%)',
      padding: '24px', minHeight: 'calc(100vh - 46px)'
    }}>
      <ChildTopBar />
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <Suspense fallback={<ChildFallback />}>
          <Routes>
            <Route index element={<ChildHome />} />
            <Route path="subject/:key" element={<SubjectLessons />} />
            <Route path="lesson/:id" element={<ChildLessonRoute />} />
            <Route path="*" element={<Navigate to="/child" replace />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
}
