import React, { useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useUIState } from '../../context/UIContext';
import { findLessonSubject } from '../../utils/childProgress';
import SubjectLessons from './SubjectLessons';
import { childPaths } from './childSubjects';
import Emoji from '../../ui/Emoji';

const VALID_TABS = ['video', 'quiz', 'pdf', 'guide'];

// /child/lesson/:id?tab= — رابط مباشر لدرس: يفتح مشغل الدرس فوق خريطة مادته.
// زر الرجوع (المتصفح/الجوال) يغلق الدرس ويبقى داخل مساحة الطفل.
export default function ChildLessonRoute() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { curriculumData, openLesson, setShowStudioModal } = useApp();
  const { showStudioModal } = useUIState();

  const tabParam = searchParams.get('tab');
  const tab = VALID_TABS.includes(tabParam) ? tabParam : 'video';
  const found = findLessonSubject(curriculumData, id);
  const subjectId = found?.subjectId;

  const openLessonRef = useRef(openLesson);
  openLessonRef.current = openLesson;
  const wasOpen = useRef(false);

  // افتح المشغل عند الدخول أو تغيّر الدرس/التبويب
  useEffect(() => {
    if (!subjectId) return;
    wasOpen.current = false;
    openLessonRef.current(subjectId, id, tab);
  }, [subjectId, id, tab]);

  // أُغلق المشغل (زر ✕ أو إتقان الدرس) → ارجع لخريطة المادة
  useEffect(() => {
    if (showStudioModal) { wasOpen.current = true; return; }
    if (wasOpen.current && subjectId) {
      wasOpen.current = false;
      if (location.state?.fromApp) navigate(-1);
      else navigate(childPaths.subject(subjectId), { replace: true });
    }
  }, [showStudioModal, subjectId, navigate, location.state]);

  // مغادرة المسار (زر الرجوع) → أغلق المشغل
  useEffect(() => () => setShowStudioModal(false), [setShowStudioModal]);

  if (!found) {
    return (
      <div style={{ background: 'var(--card-bg)', border: '2px dashed var(--line)', borderRadius: '28px', padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '8px' }}><Emoji>🔍</Emoji></div>
        <div style={{ fontWeight: 900, color: 'var(--navy)', marginBottom: '6px' }}>هذا الدرس غير موجود في المنهج</div>
        <Link to={childPaths.home} style={{ color: 'var(--blue-text)', fontWeight: 800 }}>ارجع إلى مساحتك</Link>
      </div>
    );
  }

  return <SubjectLessons subjectKey={subjectId} />;
}
