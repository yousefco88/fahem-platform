import React, { useEffect } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { getNextLesson, isLessonDone } from '../../utils/todayPlan';
import { getSubjectProgress } from '../../utils/childProgress';
import { CHILD_SUBJECTS, childPaths } from './childSubjects';
import './ChildHome.css';

// /child/subject/:key — خريطة المادة (محطات الدروس): زر رئيسي واحد لكل درس + روابط ثانوية
export default function SubjectLessons({ subjectKey: subjectKeyProp }) {
  const params = useParams();
  const subjectKey = subjectKeyProp || params.key;
  const navigate = useNavigate();
  const { activeChild, curriculumData, activeSubject, setActiveSubject, soundManager, triggerToast, learningRecords } = useApp();

  const subject = curriculumData[subjectKey];

  // المادة في الرابط هي مصدر الحقيقة — نزامن activeSubject معها
  useEffect(() => {
    if (subject && activeSubject !== subjectKey) setActiveSubject(subjectKey);
  }, [subject, subjectKey, activeSubject, setActiveSubject]);

  if (!subject) return <Navigate to={childPaths.home} replace />;

  const meta = CHILD_SUBJECTS.find(s => s.id === subjectKey);
  const masteredLessons = activeChild.masteredLessons || [];
  const lessons = [...(subject.lessons || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const currentLessonId = getNextLesson(subject, learningRecords, masteredLessons)?.id || null;
  const progress = getSubjectProgress(subject, learningRecords, masteredLessons);
  const color = meta?.color || subject.color || 'var(--blue)';

  const goLesson = (id, tab) => navigate(childPaths.lesson(id, tab), { state: { fromApp: true } });
  const playSound = (text) => { soundManager.speak(text); triggerToast(`🔊 استمع لنطق: ${text}`); };

  return (
    <div className="sl-wrap" style={{ '--subj': color }}>
      <div className="sl-head">
        <div className="sl-title">
          <button className="sl-back" onClick={() => navigate(childPaths.home)}>→ كل المواد</button>
          <h2>{subject.icon} {subject.title}</h2>
          {subject.badge && <span className="tag-badge info" style={{ fontSize: '11px' }}>{subject.badge}</span>}
        </div>
        <div className="sl-progress">
          <div className="sl-progress-row">
            <span className="pct">{progress.percent}% من المادة</span>
            <span>{progress.done}/{progress.total} درس</span>
          </div>
          <div className="sl-track"><div className="sl-fill" style={{ '--p': `${progress.percent}%` }} /></div>
        </div>
      </div>

      {lessons.length === 0 ? (
        <div className="sl-empty">لا توجد دروس منشورة في هذه المادة بعد.</div>
      ) : (
        <div className="sl-grid">
          {lessons.map(lesson => {
            const isMastered = isLessonDone(lesson.id, learningRecords, masteredLessons) || (lesson.id === 'baa' && activeChild.baaMastered);
            const isCurrent = !isMastered && lesson.id === currentLessonId;
            const state = isMastered ? 'done' : isCurrent ? 'current' : 'next';
            return (
              <div key={lesson.id} className={`sl-card ${state}`}>
                <span className="sl-station">محطة {lesson.order}</span>
                <button className="sl-sound" onClick={() => playSound(lesson.letter ? `${lesson.letter}... ${lesson.title}` : lesson.title)} title="استمع لعنوان الدرس">🔊</button>
                <span className="sl-badge">{isMastered ? '✓ متقن' : isCurrent ? '🎯 درسك الحالي' : '🔜 قادم'}</span>
                {lesson.letter && <div className="sl-letter">{lesson.letter}</div>}
                <h4>{lesson.title}</h4>
                {lesson.objective && <p className="sl-obj">{lesson.objective}</p>}
                <div className="sl-actions">
                  <button className="btn-primary sl-main" onClick={() => goLesson(lesson.id, 'video')}>
                    {isMastered ? 'شاهد مرة أخرى ▶' : 'ابدأ الدرس ▶'}
                  </button>
                  <div className="sl-links">
                    {!isMastered && <button className="sl-link" onClick={() => goLesson(lesson.id, 'quiz')}>🎯 تحدي الإتقان</button>}
                    <button className="sl-link" onClick={() => goLesson(lesson.id, 'guide')}>💡 دليل الأهل</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
