/**
 * ExamGate — بوابة محاكي امتحانات السفارة.
 * القاعدة (قرار يوسف 2026-10-27):
 * - الزائر غير المسجل: مرور حر (أداة تسويقية، نتائجه لا تُحفظ أصلاً).
 * - الأسرة المسجلة: يُفتح بإكمال كل دروس أي مادة (تقدم حقيقي من السجل)
 *   أو بفتح يدوي من المعلم المسند/الأدمن (children.exam_unlocked عبر RPC).
 * - مسجل بلا تقدم كافٍ: شاشة قفل صادقة تُظهر تقدمه الفعلي — لا وصول للأسئلة.
 */
import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { getExamUnlockProgress } from '../utils/childProgress';

export default function ExamGate({ children }) {
  const { user, role } = useAuth();
  const { activeChild, curriculumData, learningRecords, setCurrentScreen } = useApp();

  // زائر غير مسجل: تجربة تسويقية حرة (باسم «زائر»، بلا حفظ)
  if (!user) return children;

  // المعلم/الأدمن يعاين المحاكي دائماً (لمراجعة المحتوى)
  if (role === 'teacher' || role === 'admin' || role === 'content_editor') return children;

  // مسجل بلا ملف طفل: وجّهه لإنشاء الملف أولاً (بلا بيانات وهمية)
  if (!activeChild) {
    return (
      <div dir="rtl" style={wrap}>
        <div style={card}>
          <div style={{ fontSize: '44px', marginBottom: '10px' }}>👨‍👩‍👧</div>
          <h2 style={title}>أنشئ ملف طفلك أولاً</h2>
          <p style={text}>محاكي الامتحانات يرتبط بملف الطفل لحفظ نتائجه وتحليل مهاراته.</p>
          <button style={btnPrimary} onClick={() => setCurrentScreen('account')}>إنشاء ملف الطفل من مساحتي</button>
        </div>
      </div>
    );
  }

  const progress = getExamUnlockProgress(
    curriculumData,
    learningRecords?.[activeChild.id] || {},
    activeChild.masteredLessons || []
  );
  const unlocked = activeChild.examUnlocked || progress.unlocked;
  if (unlocked) return children;

  // شاشة قفل صادقة: تقدم حقيقي + طريقا الفتح الفعليان
  return (
    <div dir="rtl" style={wrap}>
      <div style={card}>
        <div style={{ fontSize: '44px', marginBottom: '10px' }}>🔒</div>
        <h2 style={title}>المحاكي يُفتح بإكمال مادة كاملة</h2>
        <p style={text}>
          أكمل {activeChild.name} كل دروس أي مادة ليفتح محاكي امتحانات السفارة تلقائياً —
          أو يفتحه له المعلم مباشرة.
        </p>
        {progress.subjectTitle && (
          <div style={{ margin: '14px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 800, color: 'var(--navy)', marginBottom: '6px' }}>
              <span>الأقرب للاكتمال: {progress.subjectTitle}</span>
              <span>{progress.done}/{progress.total} دروس</span>
            </div>
            <div style={{ height: '12px', background: '#e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: '8px',
                width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%`,
                background: 'linear-gradient(to left, #16a34a, #22c55e)', transition: 'width 0.4s ease'
              }} />
            </div>
          </div>
        )}
        <button style={btnPrimary} onClick={() => setCurrentScreen('child')}>🎓 متابعة التعلم لفتح المحاكي</button>
      </div>
    </div>
  );
}

const wrap = {
  minHeight: '60vh', display: 'grid', placeItems: 'center', padding: '30px 16px'
};
const card = {
  background: 'var(--card-bg, var(--card-bg))', border: '1px solid var(--line, var(--line))',
  borderRadius: '20px', padding: '34px 28px', maxWidth: '440px', width: '100%',
  textAlign: 'center', boxShadow: '0 10px 30px rgba(15,23,42,0.08)'
};
const title = { fontSize: '20px', fontWeight: 900, color: 'var(--navy, var(--navy))', marginBottom: '8px' };
const text = { fontSize: '13.5px', color: 'var(--muted, var(--muted))', lineHeight: 1.8, marginBottom: '8px' };
const btnPrimary = {
  marginTop: '10px', border: 'none', background: 'var(--blue)', color: '#fff',
  borderRadius: '12px', padding: '12px 24px', fontWeight: 800, fontSize: '14px',
  cursor: 'pointer', fontFamily: 'inherit'
};
