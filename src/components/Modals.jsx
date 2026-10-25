import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { useApp } from '../context/AppContext';
import { useUIState } from '../context/UIContext';
import { supabase } from '../lib/supabase';
import { resolveVideo, safeFileUrl } from '../utils/videoEmbed';
import { useLessonRecordings } from '../hooks/useLessonRecordings';

// حزمة ثقيلة (~42KB) — تُحمَّل فقط عند فتح البث المباشر

export default function Modals() {
  const {
    showGateModal,
    showStudioModal,
    studioActiveTab
  } = useUIState();
  const {
    setShowGateModal,
    setShowStudioModal,
    setStudioActiveTab,
    activeChild,
    activeLesson,
    activeSubject,
    learningRecords,
    recordVideoProgress,
    completeLessonMastery,
    recordQuizAttempt,
    soundManager,
    setCurrentScreen,
    triggerToast
  } = useApp();
  const video = resolveVideo(activeLesson?.videoUrl);
  const liveRecordings = useLessonRecordings(activeLesson?.id);
  const pdfUrl = safeFileUrl(activeLesson?.pdfUrl);

  // Whiteboard Canvas State

  // Lesson Studio State
  const [quizAnswered, setQuizAnswered] = useState(null); // 'correct' | 'wrong' | null
  const [qIndex, setQIndex] = useState(0); // مؤشر السؤال الحالي من بنك الأسئلة
  const [builtSyllables, setBuiltSyllables] = useState([]);
  const [builderCompleted, setBuilderCompleted] = useState(false);

  // بنك الأسئلة يتقدم على السؤال القديم المفرد؛ السؤال القديم يبقى احتياطاً للدروس التي لم تُنقل بعد
  const bankQuestions = activeLesson?.questions?.length ? activeLesson.questions : null;
  const currentQ = bankQuestions
    ? bankQuestions[Math.min(qIndex, bankQuestions.length - 1)]
    : (activeLesson?.question
        ? { question: activeLesson.question, options: activeLesson.options || [], celebration: activeLesson.celebration || '' }
        : null);
  const isLastQuestion = !bankQuestions || qIndex >= bankQuestions.length - 1;

  // Parent Gate math
  const [gateNum1] = useState(5);
  const [gateNum2] = useState(4);
  const [gateInput, setGateInput] = useState('');

  // Teacher Post-Class Feedback Modal State
  const [showPostClassFeedback, setShowPostClassFeedback] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState(`أحمد شارك بنشاط ونطق الحرف بشكل رائع اليوم.`);

  // Reset quiz/builder state when activeLesson changes
  useEffect(() => {
    setQuizAnswered(null);
    setQIndex(0);
    setBuiltSyllables([]);
    setBuilderCompleted(false);
  }, [activeLesson?.id]);

  const handleFinishTeacherFeedback = (e) => {
    e.preventDefault();
    setShowPostClassFeedback(false);
    triggerToast('تم إنهاء الحصة التجريبية. إرسال التقرير وأرشفة التسجيل غير متصلين بخادم بعد.');
  };

  // Parent Gate handler
  const handleVerifyGate = () => {
    if (parseInt(gateInput.trim()) === gateNum1 + gateNum2) {
      setShowGateModal(false);
      setGateInput('');
      setCurrentScreen('parent');
      triggerToast('تم التحقق بنجاح — مرحباً بك في مساحة ولي الأمر');
    } else {
      triggerToast('إجابة غير صحيحة، حاول مجدداً');
      setGateInput('');
    }
  };

  // Quiz evaluation
  const handleEvalQuiz = (isCorrect) => {
    if (quizAnswered !== null) return;
    if (isCorrect) {
      setQuizAnswered('correct');
      soundManager.playSuccess();
      soundManager.speak('أحسنت يا بطل! إجابة صحيحة ومتقنة تماماً.');
    } else {
      setQuizAnswered('wrong');
      soundManager.playRetry();
      soundManager.speak('محاولة جيدة! استمع للشرح وجرب مرة ثانية.');
    }
    recordQuizAttempt(activeLesson.id, isCorrect);
    // تسجيل محاولة سؤال البنك في القاعدة (لتقرير مهارات ولي الأمر)
    // يفشل بصمت لغير المسجلين — RLS يرفض والدرس يستمر طبيعياً
    if (bankQuestions && currentQ?.id && supabase) {
      supabase.from('lesson_question_attempts').insert({
        question_id: currentQ.id,
        lesson_id: String(activeLesson.id),
        child_key: activeChild?.id != null ? String(activeChild.id) : null,
        child_name: activeChild?.name || null,
        is_correct: !!isCorrect,
        skill: currentQ.skill || null,
        quiz_type: currentQ.quizType || null,
      }).then(({ error }) => {
        if (error) console.warn('lesson question attempt not saved:', error.message);
      });
    }
  };

  // Syllable Builder Tap/Drag handler
  const handleTapSyllable = (syl) => {
    if (builtSyllables.includes(syl)) return;
    const nextList = [...builtSyllables, syl];
    setBuiltSyllables(nextList);

    soundManager.speak(syl);

    const expected = activeLesson?.interactiveBuilder?.correctOrder || [];
    if (nextList.length === expected.length) {
      const isMatch = nextList.every((val, idx) => val === expected[idx]);
      if (isMatch) {
        setBuilderCompleted(true);
        soundManager.playSuccess();
        soundManager.speak(`ممتاز! ركبت الكلمة بنجاح: ${activeLesson?.interactiveBuilder?.targetWord}`);
      } else {
        triggerToast('ترتيب المقاطع يحتاج مراجعة، اضغط مسح وحاول ثانية ↺');
        soundManager.playRetry();
      }
    }
  };

  const handleResetBuilder = () => {
    setBuiltSyllables([]);
    setBuilderCompleted(false);
  };

  return (
    <>
      {/* Post-Class Teacher Feedback Modal */}
      {showPostClassFeedback && (
        <div className="modal-overlay">
          <div style={{ background: 'white', borderRadius: '24px', padding: '30px', maxWidth: '480px', width: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>📝</div>
              <h3 style={{ fontSize: '20px', color: 'var(--navy)' }}>تقييم وملاحظة ما بعد الحصة</h3>
              <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
                اكتملت الحصة وأُرشفت بنجاح! شارك ولي أمر الطالب <strong>{activeChild?.name || 'الطالب'}</strong> بملاحظتك لترسل له فوراً:
              </p>
            </div>

            <form onSubmit={handleFinishTeacherFeedback}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '13.5px', marginBottom: '6px' }}>مستوى تفاعل الطالب</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn-secondary" style={{ flex: 1, padding: '8px' }}>ممتاز ⭐</button>
                  <button type="button" className="btn-secondary" style={{ flex: 1, padding: '8px' }}>جيد جداً 👍</button>
                  <button type="button" className="btn-secondary" style={{ flex: 1, padding: '8px' }}>يحتاج متابعة 💡</button>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '13.5px', marginBottom: '6px' }}>ملاحظة المعلمة لولي الأمر</label>
                <textarea
                  rows="3"
                  style={{ width: '100%', padding: '12px', border: '2px solid var(--line)', borderRadius: '10px', fontSize: '14px', resize: 'vertical' }}
                  value={feedbackNote}
                  onChange={(e) => setFeedbackNote(e.target.value)}
                />
              </div>

              <button className="btn-accent" style={{ width: '100%', justifyContent: 'center' }} type="submit">
                إرسال لولي الأمر وحفظ الأرشيف ✓
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Interactive Lesson Studio Modal */}
      {showStudioModal && activeLesson && (
        <div className="modal-overlay">
          <div style={{
            background: '#ffffff', width: '100%', maxWidth: '1150px',
            borderRadius: '28px', overflow: 'hidden', maxHeight: '92vh',
            display: 'flex', flexDirection: 'column'
          }}>
            <header style={{
              background: 'var(--navy-dark)', color: 'white', padding: '16px 28px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="tag-badge mastered" style={{ fontSize: '12px' }}>{activeLesson.letter}</span>
                <span>{activeLesson.title}</span>
              </h3>
              <button style={{ background: 'none', color: 'white', fontSize: '22px' }} onClick={() => setShowStudioModal(false)}>
                ✕
              </button>
            </header>

            <nav style={{ display: 'flex', background: 'var(--bg)', borderBottom: '2px solid var(--line)', padding: '0 24px', gap: '12px', overflowX: 'auto' }}>
              <button
                className={`studio-tab-btn ${studioActiveTab === 'video' ? 'active' : ''}`}
                onClick={() => setStudioActiveTab('video')}
              >
                🎥 تسجيل الحصة المباشرة
              </button>
              <button
                className={`studio-tab-btn ${studioActiveTab === 'quiz' ? 'active' : ''}`}
                onClick={() => setStudioActiveTab('quiz')}
              >
                🎯 تحدي الإتقان وبناء الكلمة
              </button>
              <button
                className={`studio-tab-btn ${studioActiveTab === 'pdf' ? 'active' : ''}`}
                onClick={() => setStudioActiveTab('pdf')}
              >
                📄 ورقة العمل PDF
              </button>
              <button
                className={`studio-tab-btn ${studioActiveTab === 'guide' ? 'active' : ''}`}
                onClick={() => setStudioActiveTab('guide')}
              >
                💡 دليل ولي الأمر للمذاكرة
              </button>
            </nav>

            <div style={{ padding: '28px', overflowY: 'auto', flex: 1 }}>
              {/* Tab 1: Video */}
              {studioActiveTab === 'video' && (
                <div>
                  {video ? (
                    <div style={{ background: '#0f172a', borderRadius: '20px', padding: '10px', maxWidth: '850px', margin: '0 auto 20px' }}>
                      {video.kind === 'iframe' ? (
                        <iframe
                          src={video.src} title={activeLesson.title} loading="lazy" allowFullScreen
                          allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
                          referrerPolicy="strict-origin-when-cross-origin"
                          style={{ width: '100%', aspectRatio: '16 / 9', border: 0, borderRadius: '14px' }}
                        />
                      ) : (
                        <video
                          controls
                          playsInline
                          preload="metadata"
                          src={video.src}
                          style={{ width: '100%', maxHeight: '440px', borderRadius: '14px' }}
                          onLoadedMetadata={event => {
                            const savedPercent = learningRecords[activeLesson.id]?.videoProgress || 0;
                            if (savedPercent > 0 && event.currentTarget.duration) event.currentTarget.currentTime = event.currentTarget.duration * savedPercent / 100;
                          }}
                          onTimeUpdate={event => recordVideoProgress(activeLesson.id, event.currentTarget.currentTime, event.currentTarget.duration, activeSubject)}
                        />
                      )}
                    </div>
                  ) : (
                                      <div style={{
                                        background: 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%)',
                                        borderRadius: '20px', aspectRatio: '16 / 9',
                                        maxHeight: '440px', margin: '0 auto 20px', display: 'flex',
                                        flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white',
                                        textAlign: 'center', padding: '24px'
                                      }}>
                                        <span style={{ fontSize: '48px', marginBottom: '16px' }}>🎬</span>
                                        <span style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>الفيديو قيد التحضير</span>
                                        <span style={{ fontSize: '14px', opacity: 0.9, marginBottom: '16px' }}>سيتوفر قريباً — تابع الإشعارات</span>
                                        <div style={{ 
                                          background: 'rgba(255,255,255,0.15)', padding: '12px 20px', borderRadius: '12px',
                                          fontSize: '13px', maxWidth: '500px'
                                        }}>
                                          <strong>🎯 هدف الدرس:</strong> {activeLesson.objective}
                                        </div>
                                      </div>
                                    )}

                  {liveRecordings.map((r, i) => (
                    <div key={r.id} style={{ background: '#0f172a', borderRadius: '20px', padding: '10px', maxWidth: '850px', margin: '0 auto 20px' }}>
                      <div style={{ color: 'white', fontSize: '13.5px', padding: '4px 8px 8px' }}>🎥 تسجيل الحصة المباشرة{liveRecordings.length > 1 ? ` (${i + 1})` : ''}</div>
                      <video controls playsInline preload="metadata" src={r.url} style={{ width: '100%', maxHeight: '440px', borderRadius: '14px' }} />
                    </div>
                  ))}

                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid var(--line)' }}>
                    <strong>محطات الحصة المسجلة للقفز السريع:</strong>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                      {activeLesson.videoChapters?.map((ch, idx) => (
                        <span
                          key={idx}
                          className="tag-badge info"
                          style={{ cursor: 'pointer' }}
                          onClick={() => triggerToast(`القفز إلى الدقيقة ${ch.time}: ${ch.label}`)}
                        >
                          ⏱ {ch.time} {ch.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Interactive Mastery Challenge & Syllable Builder */}
              {studioActiveTab === 'quiz' && (
                <div style={{ maxWidth: '780px', margin: '0 auto', textAlign: 'center' }}>
                  
                  {/* Part 1: Interactive Syllable Puzzle / Word Builder */}
                  {activeLesson.interactiveBuilder && (
                    <div style={{ background: 'var(--blue-light)', border: '2px solid var(--line)', borderRadius: '20px', padding: '22px', marginBottom: '28px' }}>
                      <h4 style={{ color: 'var(--blue)', fontSize: '18px', marginBottom: '6px' }}>
                        🧩 نشاط تركيبي: اضغط على المقاطع لبناء: «{activeLesson.interactiveBuilder.targetWord}»
                      </h4>
                      <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>
                        استمع لصوت كل مقطع عند الضغط عليه، ورتبها بالترتيب الصحيح:
                      </p>

                      {/* Drop Zone Box */}
                      <div style={{
                        minHeight: '60px', background: 'white', border: '2px dashed var(--blue)',
                        borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: '12px', padding: '10px', marginBottom: '16px'
                      }}>
                        {builtSyllables.length === 0 ? (
                          <span style={{ color: 'var(--muted)', fontSize: '14px' }}>اضغط على المقاطع بالأسفل لوضعها هنا...</span>
                        ) : (
                          builtSyllables.map((s, idx) => (
                            <span
                              key={idx}
                              style={{
                                background: '#dbeafe', color: 'var(--blue)', padding: '8px 18px',
                                borderRadius: '10px', fontSize: '22px', fontWeight: 800, border: '1px solid var(--line)'
                              }}
                            >
                              {s}
                            </span>
                          ))
                        )}
                      </div>

                      {/* Syllable Options */}
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {activeLesson.interactiveBuilder.syllables.map((syl, i) => (
                          <button
                            key={i}
                            style={{
                              background: builtSyllables.includes(syl) ? '#e2e8f0' : 'white',
                              color: builtSyllables.includes(syl) ? '#94a3b8' : 'var(--navy)',
                              border: '2px solid var(--line)', padding: '10px 20px',
                              borderRadius: '12px', fontSize: '20px', fontWeight: 800,
                              cursor: builtSyllables.includes(syl) ? 'not-allowed' : 'pointer'
                            }}
                            disabled={builtSyllables.includes(syl)}
                            onClick={() => handleTapSyllable(syl)}
                          >
                            {syl}
                          </button>
                        ))}
                        <button
                          style={{ background: 'var(--bg)', color: 'var(--muted)', padding: '10px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 700 }}
                          onClick={handleResetBuilder}
                        >
                          مسح ↺
                        </button>
                      </div>

                      {builderCompleted && (
                        <div style={{ marginTop: '14px', color: '#16a34a', fontWeight: 800, fontSize: '15px' }}>
                          ✓ رائع جداً! تم تركيب «{activeLesson.interactiveBuilder.targetWord}» بنجاح!
                        </div>
                      )}
                    </div>
                  )}

                  {/* Part 2: أسئلة الإتقان — من بنك الأسئلة إن وُجد، وإلا السؤال القديم المفرد */}
                  {!currentQ ? (
                    <div style={{ textAlign: 'center', padding: '28px 16px', border: '1px dashed var(--line)', borderRadius: '18px', color: 'var(--muted)' }}>
                      <div style={{ fontSize: '28px', marginBottom: '8px' }}>❓</div>
                      <div style={{ fontWeight: 700, marginBottom: '4px' }}>لا توجد أسئلة لهذا الدرس بعد</div>
                      <div style={{ fontSize: '13px' }}>سيضيف المعلم أسئلة الإتقان قريباً من لوحة المنهج</div>
                    </div>
                  ) : (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
                      <div style={{
                        display: 'inline-block', background: 'var(--blue-light)', color: 'var(--blue)',
                        padding: '4px 14px', borderRadius: '20px', fontWeight: 700, fontSize: '13px'
                      }}>
                        {bankQuestions
                          ? `سؤال ${qIndex + 1} من ${bankQuestions.length}`
                          : 'سؤال الإتقان (إعادة الاختبار متاحة حتى 100%)'}
                      </div>
                      <button
                        style={{
                          background: '#fef08a', border: '1px solid #facc15', borderRadius: 'var(--radius-full)',
                          padding: '4px 12px', fontSize: '12px', fontWeight: 800, color: '#713f12', display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                        onClick={() => soundManager.speak(currentQ.question)}
                        title="استمع للسؤال بصوت ناطق"
                      >
                        <span>🔊</span>
                        <span>اقرأ لي السؤال</span>
                      </button>
                    </div>

                    <h3 style={{ fontSize: '22px', marginBottom: '8px' }}>{currentQ.question}</h3>
                    <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>
                      استمع وتذكر شرح المعلمة في الحصة المسجلة
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', margin: '20px 0' }}>
                      {currentQ.options?.map((opt, i) => (
                        <div
                          key={`${qIndex}-${i}`}
                          className={`quiz-option-card ${quizAnswered === 'correct' && opt.correct ? 'correct' : ''} ${quizAnswered === 'wrong' && !opt.correct ? 'wrong' : ''}`}
                          onClick={() => handleEvalQuiz(opt.correct)}
                        >
                          <span>{opt.icon}</span> {opt.text}
                        </div>
                      ))}
                    </div>

                    {quizAnswered === 'correct' && !isLastQuestion && (
                      <div style={{ background: '#ecfdf5', border: '2px solid #86efac', borderRadius: '18px', padding: '20px', marginTop: '20px' }}>
                        <h4 style={{ color: '#166534', fontSize: '20px', marginBottom: '6px' }}>
                          {currentQ.celebration || 'إجابة صحيحة! أحسنت 🌟'}
                        </h4>
                        <button className="btn-accent" style={{ background: '#16a34a', color: 'white' }} onClick={() => { setQIndex(qIndex + 1); setQuizAnswered(null); }}>
                          السؤال التالي ←
                        </button>
                      </div>
                    )}

                    {quizAnswered === 'correct' && isLastQuestion && (
                      <div style={{ background: '#ecfdf5', border: '2px solid #86efac', borderRadius: '18px', padding: '20px', marginTop: '20px' }}>
                        <h4 style={{ color: '#166534', fontSize: '20px', marginBottom: '6px' }}>أحسنت يا بطل! أتقنت المهارة بنسبة 100% ⭐</h4>
                        <p style={{ color: '#166534', fontSize: '14px', marginBottom: '14px' }}>
                          تم منحك شارة الإتقان الذهبية وإضافة 30 نقطة فهم لحسابك!
                        </p>
                        <button className="btn-accent" style={{ background: '#16a34a', color: 'white' }} onClick={() => completeLessonMastery(activeLesson.id)}>
                          حفظ الإتقان والعودة للخريطة ✓
                        </button>
                      </div>
                    )}

                    {quizAnswered === 'wrong' && (
                      <div style={{ background: '#fff7ed', border: '2px solid #fed7aa', borderRadius: '18px', padding: '20px', marginTop: '20px' }}>
                        <h4 style={{ color: '#9a3412', fontSize: '18px', marginBottom: '6px' }}>محاولة جيدة! قرّبت جداً من الحل الصحيح 💡</h4>
                        <p style={{ color: '#9a3412', fontSize: '13.5px', marginBottom: '14px' }}>
                          راجع فيديو الحصة المسجلة ثم أعد المحاولة دون أي قلق.
                        </p>
                        <button className="btn-secondary" onClick={() => setQuizAnswered(null)}>
                          أعد المحاولة الآن ↺
                        </button>
                      </div>
                    )}
                  </div>
                  )}

                </div>
              )}

              {/* Tab 3: PDF */}
              {studioActiveTab === 'pdf' && (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{ fontSize: '56px', marginBottom: '12px' }}>📄</div>
                  <h3 style={{ fontSize: '20px', marginBottom: '6px' }}>{activeLesson.pdfTitle || 'ورقة العمل'}</h3>
                  {pdfUrl ? (
                    <a className="btn-accent" href={pdfUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', textDecoration: 'none', marginTop: '16px' }}>
                      فتح ملف PDF المرتبط
                    </a>
                  ) : (
                    <p style={{ color: 'var(--muted)', marginBottom: '20px' }}>لا يوجد ملف PDF مرفق بهذا الدرس بعد.</p>
                  )}
                </div>
              )}

              {/* Tab 4: Parent Companion Guide */}
              {studioActiveTab === 'guide' && activeLesson.parentGuide && (
                <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'right' }}>
                  <div style={{
                    background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '16px',
                    padding: '20px', marginBottom: '24px'
                  }}>
                    <h4 style={{ color: '#166534', fontSize: '16px', marginBottom: '6px' }}>
                      💡 خلاصة الهدف التربوي لولي الأمر:
                    </h4>
                    <p style={{ color: '#15803d', fontSize: '14px', lineHeight: 1.6 }}>
                      {activeLesson.parentGuide.summary}
                    </p>
                  </div>

                  <h4 style={{ fontSize: '16px', marginBottom: '14px', color: 'var(--navy)' }}>
                    3 نصائح سريعة للمذاكرة في 5 دقائق بدون ضغط عصبي:
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {activeLesson.parentGuide.tips.map((tip, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: '#f8fafc', border: '1px solid var(--line)', borderRadius: '12px',
                          padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px'
                        }}
                      >
                        <span style={{
                          width: '28px', height: '28px', borderRadius: '50%', background: 'var(--blue)',
                          color: 'white', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: '13px', flexShrink: 0
                        }}>
                          {idx + 1}
                        </span>
                        <span style={{ fontSize: '13.5px', color: 'var(--navy)' }}>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Parent Gate Modal */}
      {showGateModal && (
        <div className="modal-overlay">
          <div style={{ background: 'white', borderRadius: '24px', padding: '30px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>🔒</div>
            <h3 style={{ fontSize: '20px', color: 'var(--navy)' }}>بوابة ولي الأمر</h3>
            <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '16px' }}>
              لحماية الطفل، يُرجى حل المسألة الرياضية للعودة:
            </p>
            <div style={{
              fontSize: '24px', fontWeight: 800, color: 'var(--blue)', background: 'var(--blue-light)',
              padding: '12px', borderRadius: '12px', marginBottom: '16px'
            }}>
              كم حاصل: {gateNum1} + {gateNum2} ؟
            </div>
            <input
              type="number"
              value={gateInput}
              onChange={(e) => setGateInput(e.target.value)}
              placeholder="اكتب الناتج هنا"
              style={{
                width: '100%', padding: '12px', textAlign: 'center', fontSize: '18px',
                border: '2px solid var(--line)', borderRadius: '12px', marginBottom: '16px'
              }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-accent" style={{ flex: 1, justifyContent: 'center' }} onClick={handleVerifyGate}>
                دخول
              </button>
              <button
                style={{ background: '#e2e8f0', color: 'var(--navy)', border: 'none', padding: '12px 20px', borderRadius: 'var(--radius-md)', fontWeight: 700 }}
                onClick={() => setShowGateModal(false)}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
