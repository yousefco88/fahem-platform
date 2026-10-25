import React, { useEffect } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { getNextLesson, isLessonDone } from '../../utils/todayPlan';
import { getSubjectProgress } from '../../utils/childProgress';
import { CHILD_SUBJECTS, childPaths } from './childSubjects';

// /child/subject/:key — خريطة مغامرة المادة (محطات الدروس)
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
  const color = meta?.color || 'var(--blue)';

  const goLesson = (id, tab) => navigate(childPaths.lesson(id, tab), { state: { fromApp: true } });
  const playSound = (text) => { soundManager.speak(text); triggerToast(`🔊 استمع لنطق: ${text}`); };

  return (
    <div style={{
      background: 'var(--card-bg)', border: '3px solid #e0e7ff', borderRadius: '36px',
      padding: '28px 32px', boxShadow: '0 15px 30px rgba(99, 102, 241, 0.05)', marginBottom: '40px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate(childPaths.home)}
            style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 'var(--radius-full)', padding: '8px 16px', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}
          >→ كل المواد</button>
          <h2 style={{ fontSize: '21px', fontWeight: 900, color: 'var(--navy)' }}>
            خريطة مغامرة: {subject.title} {subject.icon}
          </h2>
          {subject.badge && <span className="tag-badge info" style={{ fontSize: '11px' }}>{subject.badge}</span>}
        </div>
        <div style={{ minWidth: '220px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 800, marginBottom: '6px' }}>
            <span style={{ color }}>{progress.percent}% من المادة</span>
            <span style={{ color: 'var(--muted)' }}>{progress.done}/{progress.total} درس</span>
          </div>
          <div style={{ height: '10px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ width: `${progress.percent}%`, height: '100%', background: color }} />
          </div>
        </div>
      </div>

      {lessons.length === 0 ? (
        <div style={{ background: 'var(--bg)', border: '2px dashed var(--line)', borderRadius: '20px', padding: '28px', textAlign: 'center', color: 'var(--muted)', fontWeight: 700 }}>
          لا توجد دروس منشورة في هذه المادة بعد.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
          {lessons.map(lesson => {
            const isMastered = isLessonDone(lesson.id, learningRecords, masteredLessons) || (lesson.id === 'baa' && activeChild.baaMastered);
            const isCurrent = !isMastered && lesson.id === currentLessonId;
            return (
              <div key={lesson.id} style={{
                border: isMastered ? '2px solid #86efac' : isCurrent ? '3px solid #4f46e5' : '2px solid var(--yellow)',
                borderRadius: '24px', padding: '24px 18px', textAlign: 'center',
                background: isMastered ? 'linear-gradient(180deg, var(--green-light) 0%, var(--card-bg) 100%)' : isCurrent ? 'var(--blue-light)' : 'var(--yellow-light)',
                boxShadow: isMastered ? 'none' : isCurrent ? '0 0 0 5px #c7d2fe' : '0 0 0 4px #fef08a',
                position: 'relative', opacity: !isMastered && !isCurrent ? 0.78 : 1
              }}>
                <span style={{
                  position: 'absolute', top: '14px', right: '14px',
                  background: isCurrent ? '#4f46e5' : 'var(--line)', color: isCurrent ? 'white' : 'var(--muted)',
                  borderRadius: '12px', padding: '2px 10px', fontSize: '11px', fontWeight: 800
                }}>محطة {lesson.order}</span>
                <button
                  style={{
                    position: 'absolute', top: '14px', left: '14px', background: isMastered ? '#dcfce7' : '#fef08a',
                    border: '1px solid var(--line)', borderRadius: '50%', width: '32px', height: '32px',
                    display: 'grid', placeItems: 'center', fontSize: '14px'
                  }}
                  onClick={() => playSound(`${lesson.letter}... ${lesson.title}`)}
                  title="استمع لصوت الدرس"
                >🔊</button>

                <span className={`tag-badge ${isMastered ? 'mastered' : 'review'}`} style={{ marginBottom: '10px' }}>
                  {isMastered ? '✓ متقن' : isCurrent ? '🎯 درسك الحالي' : '🔜 قادم في الرحلة'}
                </span>
                <div style={{
                  width: '72px', height: '72px', borderRadius: '50%', margin: '0 auto 16px',
                  display: 'grid', placeItems: 'center', fontSize: '24px', fontWeight: 900,
                  background: isMastered ? '#dcfce7' : '#fef08a', border: isMastered ? '3px solid #22c55e' : '3px solid #eab308'
                }}>{lesson.letter}</div>
                <h4 style={{ fontSize: '16px', marginBottom: '6px', color: 'var(--navy)' }}>{lesson.title}</h4>
                <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '16px', minHeight: '36px' }}>{lesson.objective}</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {isMastered ? (
                    <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => goLesson(lesson.id, 'video')}>
                      مشاهدة التسجيل ▶
                    </button>
                  ) : (
                    <>
                      <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => goLesson(lesson.id, 'video')}>
                        ابدأ الدرس ▶
                      </button>
                      <button
                        style={{ background: '#ea580c', color: 'white', width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '13px' }}
                        onClick={() => goLesson(lesson.id, 'quiz')}
                      >تحدي الإتقان (ابدأ الاختبار) 🎯</button>
                    </>
                  )}
                  <button className="btn-secondary" style={{ width: '100%', padding: '8px', fontSize: '12px' }} onClick={() => goLesson(lesson.id, 'guide')}>
                    💡 دليل المذاكرة للأهل
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
