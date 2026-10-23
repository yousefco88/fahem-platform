import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { launchConfetti } from '../utils/confetti';

export default function EmbassyExamSimulator() {
  const {
    activeChild,
    soundManager,
    triggerToast,
    setCurrentScreen,
    saveExamAttempt
  } = useApp();

  // Exam States: 'lobby' | 'testing' | 'result'
  const [examState, setExamState] = useState('lobby');
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState('combined'); // 'combined' | 'arabic' | 'languages'

  // Comprehensive Exam Questions Bank (Official Egyptian Ministry Curriculum Style)
  const examQuestions = [
    // 1. اللغة العربية
    {
      id: 1,
      subject: 'اللغة العربية',
      subjectIcon: '📖',
      subjectColor: '#2563eb',
      question: 'أي من الكلمات التالية بها صوت المد بالألف (ـَا)؟',
      options: [
        { text: 'بَابٌ (بـَـا)', correct: true, icon: '🚪' },
        { text: 'بَطَّةٌ (بـَ)', correct: false, icon: '🦆' },
        { text: 'قَلَمٌ', correct: false, icon: '✏️' },
        { text: 'شَمْسٌ', correct: false, icon: '☀️' }
      ],
      explanation: 'كلمة (باب) تمتد فيها الفتحة مع الألف لتشكل مدّاً طويلاً.'
    },
    {
      id: 2,
      subject: 'اللغة العربية',
      subjectIcon: '📖',
      subjectColor: '#2563eb',
      question: 'رتب الحروف لتكون كلمة صحيحة ومفيدة: [ أ - رْ - نـَ - بْ ]',
      options: [
        { text: 'أَرْنَبٌ 🐇', correct: true, icon: '🐇' },
        { text: 'نَبْرَأُ', correct: false, icon: '❌' },
        { text: 'بَأْرَنُ', correct: false, icon: '❌' }
      ],
      explanation: 'الترتيب الصحيح يبدأ بحرف الألف المفتوحة ثم الراء الساكنة لتكوين (أَرْنَب).'
    },

    // 2. الرياضيات (Math)
    {
      id: 3,
      subject: 'الرياضيات',
      subjectIcon: '🔢',
      subjectColor: '#059669',
      question: 'قارن بين المجموعتين باستخدام الرمز الصحيح: ( 8 ... 5 )',
      options: [
        { text: '8 > 5 (أكبر من)', correct: true, icon: '🐊' },
        { text: '8 < 5 (أصغر من)', correct: false, icon: '❌' },
        { text: '8 = 5 (يساوي)', correct: false, icon: '➖' }
      ],
      explanation: 'العدد 8 أكبر من العدد 5، وفم التمساح يتجه دائماً للعدد الأكبر.'
    },
    {
      id: 4,
      subject: 'الرياضيات',
      subjectIcon: '🔢',
      subjectColor: '#059669',
      question: 'كم حاصل جمع: ( 4 + 3 ) على إطار العشر خانات؟',
      options: [
        { text: '7', correct: true, icon: '⭐' },
        { text: '6', correct: false, icon: '✨' },
        { text: '8', correct: false, icon: '🌟' }
      ],
      explanation: 'عند إضافة 3 إلى 4 نعد تصاعدياً: 5، 6، 7.'
    },

    // 3. اللغة الإنجليزية (Connect 1)
    {
      id: 5,
      subject: 'Connect 1 (English)',
      subjectIcon: '🔤',
      subjectColor: '#7c3aed',
      question: 'Complete the sentence: "Hello, I am Busy Bee! This is my _____ (حقيبة)"',
      options: [
        { text: 'Bag (حقيبة) 🎒', correct: true, icon: '🎒' },
        { text: 'Book (كتاب) 📖', correct: false, icon: '📖' },
        { text: 'Bus (حافلة) 🚌', correct: false, icon: '🚌' }
      ],
      explanation: 'In Unit 1: Bag starts with the sound /b/ and means حقيبة.'
    },
    {
      id: 6,
      subject: 'Connect Plus (لغات)',
      subjectIcon: '🌟',
      subjectColor: '#6d28d9',
      question: 'Which sense do we use to listen to our teacher? "I hear with my _____"',
      options: [
        { text: 'Ears (الأذنان) 👂', correct: true, icon: '👂' },
        { text: 'Eyes (العينان) 👁️', correct: false, icon: '👁️' },
        { text: 'Hands (اليدان) ✋', correct: false, icon: '✋' }
      ],
      explanation: 'Hearing is done using our ears.'
    },

    // 4. متعدد التخصصات: اكتشف (Discover)
    {
      id: 7,
      subject: 'اكتشف (Discover)',
      subjectIcon: '🔬',
      subjectColor: '#0284c7',
      question: 'أي من الكائنات التالية يعتبر "كائناً حياً" يحتاج للغذاء والماء لينمو؟',
      options: [
        { text: 'الشجرة والنخيل 🌴', correct: true, icon: '🌴' },
        { text: 'السيارة 🚗', correct: false, icon: '🚗' },
        { text: 'الكرسي الخشبي 🪑', correct: false, icon: '🪑' }
      ],
      explanation: 'النباتات كائنات حية تتنفس وتنمو وتتغذى على الماء وضوء الشمس.'
    },

    // 5. الهوية وتاريخ مصر
    {
      id: 8,
      subject: 'معالم وتاريخ مصر',
      subjectIcon: '🇪🇬',
      subjectColor: '#b91c1c',
      question: 'ما هو النهر العظيم الذي يجري في مصر ويزرع حوله المصريون أراضيهم؟',
      options: [
        { text: 'نهر النيل العظيم ⛵', correct: true, icon: '🌊' },
        { text: 'نهر دجلة والفرات', correct: false, icon: '🌴' },
        { text: 'البحر الأحمر', correct: false, icon: '🌊' }
      ],
      explanation: 'نهر النيل هو شريان الحياة وأطول أنهار العالم ويمنح مصر حضارتها العريقة.'
    },

    // 6. تكنولوجيا المعلومات (ICT)
    {
      id: 9,
      subject: 'تكنولوجيا المعلومات (ICT)',
      subjectIcon: '💻',
      subjectColor: '#4f46e5',
      question: 'من قواعد الأمان الرقمي للأطفال على الإنترنت:',
      options: [
        { text: 'عدم مشاركة كلمة المرور مع أي شخص غريب 🛡️', correct: true, icon: '🔒' },
        { text: 'إعطاء عنوان منزلي لأي شخص يطلبه ❌', correct: false, icon: '🚫' },
        { text: 'الضغط على أي رابط مجهول يظهر فجأة ❌', correct: false, icon: '🚫' }
      ],
      explanation: 'كلمات المرور والمعلومات الشخصية يجب أن تظل سرية لحماية أمان الطفل.'
    },

    // 7. التربية الدينية والقيم
    {
      id: 10,
      subject: 'التربية الدينية والأخلاق',
      subjectIcon: '🕌',
      subjectColor: '#d97706',
      question: 'عندما أخطئ دون قصد في حق زميلي أو والدي، السلوك الأخلاقي الصحيح هو:',
      options: [
        { text: 'الاعتراف بالخطأ والاعتذار بصدق 🤝', correct: true, icon: '⭐' },
        { text: 'إنكار الخطأ وإلقاء اللوم على غيري ❌', correct: false, icon: '🚫' },
        { text: 'الغضب والخصام ❌', correct: false, icon: '🚫' }
      ],
      explanation: 'الاعتذار والصدق من شيم الأبطال والمؤمنين ويعبر عن حسن الخلق.'
    }
  ];

  // Timer countdown hook
  useEffect(() => {
    let interval = null;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      handleSubmitExam();
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartExam = () => {
    setExamState('testing');
    setCurrentQuestionIdx(0);
    setSelectedAnswers({});
    setTimeLeft(25 * 60);
    setIsTimerRunning(true);
    soundManager.playSuccess();
    soundManager.speak(`بالتوفيق يا بطل! بدأ الاختبار التدريبي. اقرأ كل سؤال بعناية.`);
    triggerToast('بدأ الاختبار التدريبي من فاهم — بالتوفيق!');
  };

  const handleSelectOption = (qIdx, optIdx) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [qIdx]: optIdx
    }));
    soundManager.playSuccess();
  };

  const handleSubmitExam = () => {
    setIsTimerRunning(false);
    setExamState('result');
    launchConfetti();
    soundManager.playSuccess();
    soundManager.speak(`أحسنت يا ${activeChild.name}! أتممت الاختبار التدريبي.`);
    triggerToast(`انتهى الاختبار التدريبي: أجبت عن ${Object.keys(selectedAnswers).length} من ${examQuestions.length} أسئلة. التقرير غير رسمي.`);

    // حفظ المحاولة سحابياً (إن كان ولي الأمر مسجلاً دخوله)
    let correct = 0;
    examQuestions.forEach((q, idx) => {
      const chosen = selectedAnswers[idx];
      if (chosen !== undefined && q.options[chosen]?.correct) correct++;
    });
    const pct = Math.round((correct / examQuestions.length) * 100);
    saveExamAttempt({
      childKey: activeChild?.id,
      childName: activeChild?.name,
      totalQuestions: examQuestions.length,
      attemptedCount: Object.keys(selectedAnswers).length,
      correctCount: correct,
      percentage: pct,
      band: pct >= 85 ? 'متميز' : pct >= 65 ? 'جيد' : pct >= 50 ? 'مراجعة' : 'دعم',
      answers: selectedAnswers
    }).then(res => {
      if (res.saved) triggerToast('💾 حُفظت نتيجة المحاولة في حساب ولي الأمر');
    });
  };

  // Calculate scores
  const totalQuestions = examQuestions.length;
  let correctCount = 0;
  examQuestions.forEach((q, idx) => {
    const chosenIdx = selectedAnswers[idx];
    if (chosenIdx !== undefined && q.options[chosenIdx]?.correct) {
      correctCount++;
    }
  });

  const percentage = Math.round((correctCount / totalQuestions) * 100);
  const attemptedCount = Object.keys(selectedAnswers).length;

  // Egyptian Color Band Assessment (Edu 2.0 system)
  const getAssessmentColorBand = (score) => {
    if (score >= 85) return { title: 'أداء متميز', color: '#2563eb', bg: '#eff6ff', tag: 'متميز' };
    if (score >= 65) return { title: 'أداء جيد', color: '#16a34a', bg: '#f0fdf4', tag: 'جيد' };
    if (score >= 50) return { title: 'يحتاج إلى مراجعة بسيطة', color: '#ca8a04', bg: '#fefce8', tag: 'مراجعة' };
    return { title: 'يحتاج إلى دعم ومراجعة', color: '#dc2626', bg: '#fef2f2', tag: 'دعم' };
  };

  const currentBand = getAssessmentColorBand(percentage);
  const currentQ = examQuestions[currentQuestionIdx];

  return (
    <div style={{ maxWidth: '1200px', margin: '24px auto', padding: '0 20px', width: '100%' }}>
      
      {/* 1. LOBBY VIEW */}
      {examState === 'lobby' && (
        <div>
          {/* Header Badge */}
          <div style={{
            background: 'linear-gradient(135deg, #881337 0%, #be123c 60%, #e11d48 100%)',
            color: 'white', borderRadius: 'var(--radius-lg)', padding: '32px',
            marginBottom: '26px', boxShadow: '0 20px 40px rgba(136, 19, 55, 0.3)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px'
          }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.2)', padding: '5px 14px', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: 700, marginBottom: '12px' }}>
                <span>🇪🇬 جمهورية مصر العربية</span>
                <span>•</span>
                <span>تدريب على نمط المنهج المصري</span>
              </div>
              <h1 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '8px' }}>
                اختبار تدريبي لأبناء المصريين بالخارج
              </h1>
              <p style={{ fontSize: '15px', color: '#ffe4e6', maxWidth: '650px', lineHeight: 1.6 }}>
                النموذج الإلكتروني المتطابق مع المنصة الوزارية لتقييمات الصف الأول الابتدائي بالسفارات والقنصليات المصرية. يشمل جميع المواد الأساسية واللغات والهوية وفق نظام التقييم بالألوان Edu 2.0.
              </p>
            </div>

            <div style={{
              background: 'white', color: 'var(--navy)', padding: '20px', borderRadius: '20px',
              textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', minWidth: '220px'
            }}>
              <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 700 }}>بيانات الطالب المتقدم:</span>
              <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--blue)', marginTop: '4px' }}>{activeChild.name}</div>
              <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>{activeChild.grade}</div>
              <div style={{ fontSize: '11px', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', marginTop: '10px', color: '#334155' }}>
                رقم الجلوس التجريبي: <strong>EG-2026-1045</strong>
              </div>
            </div>
          </div>

          {/* Exam Rules & Instructions Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div style={{ background: 'white', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏱️</div>
              <h4 style={{ fontSize: '16px', color: 'var(--navy)', marginBottom: '6px' }}>زمن الامتحان: 25 دقيقة</h4>
              <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>
                مؤقت تنازلي يحاكي زمن المنصة الوزارية لتعويد الطفل على إنجاز الإجابات بهدوء وتركيز.
              </p>
            </div>

            <div style={{ background: 'white', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>📚</div>
              <h4 style={{ fontSize: '16px', color: 'var(--navy)', marginBottom: '6px' }}>10 أسئلة مجمعة وشاملة</h4>
              <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>
                تغطي: العربية، الرياضيات، Connect، Connect Plus، اكتشف، تكنولوجيا المعلومات، والهوية الوطنية.
              </p>
            </div>

            <div style={{ background: 'white', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>🖨️</div>
              <h4 style={{ fontSize: '16px', color: 'var(--navy)', marginBottom: '6px' }}>تقرير نتيجة الاختبار التدريبي</h4>
              <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>
                ملخص تدريبي لنتيجة الطالب، ولا يمثل شهادة أو مستندًا رسميًا.
              </p>
            </div>
          </div>

          {/* Launch Exam CTA */}
          <div style={{
            background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: 'var(--radius-lg)',
            padding: '30px', textAlign: 'center'
          }}>
            <h3 style={{ fontSize: '20px', color: 'var(--navy)', marginBottom: '10px' }}>
              جاهز لخوض الاختبار التجريبي الآن يا {activeChild.name}؟ 🚀
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--muted)', maxWidth: '500px', margin: '0 auto 20px' }}>
              تذكر: فلسفة «فاهم» تضمن لك الإعادة والتصحيح دون خوف. هدفنا هو الفهم التام والإتقان بنسبة 100%.
            </p>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center' }}>
              <button
                className="btn-accent"
                style={{
                  background: 'linear-gradient(135deg, #e11d48, #be123c)',
                  fontSize: '17px', padding: '16px 40px', borderRadius: 'var(--radius-full)'
                }}
                onClick={handleStartExam}
              >
                <span>ابدأ الاختبار التدريبي</span>
                <span>✍️</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. ACTIVE EXAM ROOM VIEW */}
      {examState === 'testing' && (
        <div>
          {/* Top Sticky Official Exam Bar */}
          <div style={{
            background: 'white', border: '2px solid #e2e8f0', borderRadius: '20px',
            padding: '14px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', boxShadow: '0 8px 20px rgba(0,0,0,0.06)', flexWrap: 'wrap', gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#fef2f2', color: '#be123c', display: 'grid', placeItems: 'center', fontSize: '20px', fontWeight: 900 }}>
                🇪🇬
              </div>
              <div>
                <strong style={{ fontSize: '14px', color: 'var(--navy)', display: 'block' }}>
                  امتحان «أبنائنا بالخارج» — نصف العام الدراسي
                </strong>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  الطالب: {activeChild.name} • السؤال {currentQuestionIdx + 1} من {totalQuestions}
                </span>
              </div>
            </div>

            {/* Countdown Timer */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px', background: timeLeft < 300 ? '#fef2f2' : '#f0fdf4',
              border: timeLeft < 300 ? '2px solid #ef4444' : '2px solid #86efac',
              padding: '8px 18px', borderRadius: 'var(--radius-full)'
            }}>
              <span style={{ fontSize: '18px' }}>⏰</span>
              <span style={{ fontSize: '16px', fontWeight: 900, color: timeLeft < 300 ? '#dc2626' : '#166534', fontFamily: 'monospace' }}>
                الوقت المتبقي: {formatTimer(timeLeft)}
              </span>
            </div>

            <button
              style={{
                background: '#be123c', color: 'white', border: 'none', padding: '9px 18px',
                borderRadius: 'var(--radius-full)', fontWeight: 800, fontSize: '12.5px', cursor: 'pointer'
              }}
              onClick={handleSubmitExam}
            >
              تسليم الامتحان وإنهاء المحاولة 📤
            </button>
          </div>

          {/* Questions Navigation Palette */}
          <div style={{
            background: 'white', border: '1px solid var(--line)', borderRadius: '16px',
            padding: '12px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px'
          }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)' }}>خريطة الأسئلة:</span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {examQuestions.map((q, idx) => {
                const isAnswered = selectedAnswers[idx] !== undefined;
                const isCurrent = currentQuestionIdx === idx;

                return (
                  <button
                    key={q.id}
                    style={{
                      width: '34px', height: '34px', borderRadius: '50%', fontWeight: 800, fontSize: '13px',
                      border: isCurrent ? '2.5px solid var(--blue)' : '1px solid var(--line)',
                      background: isCurrent ? 'var(--blue)' : isAnswered ? '#dcfce7' : '#f8fafc',
                      color: isCurrent ? 'white' : isAnswered ? '#166534' : '#475569',
                      cursor: 'pointer'
                    }}
                    onClick={() => setCurrentQuestionIdx(idx)}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Question Box */}
          <div style={{
            background: 'white', border: '2px solid var(--line)', borderRadius: '24px',
            padding: '32px', boxShadow: 'var(--shadow-md)', marginBottom: '24px'
          }}>
            {/* Subject Tag */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span
                style={{
                  background: `${currentQ.subjectColor}15`, color: currentQ.subjectColor,
                  border: `1px solid ${currentQ.subjectColor}40`, padding: '6px 14px',
                  borderRadius: 'var(--radius-full)', fontWeight: 800, fontSize: '12.5px',
                  display: 'inline-flex', alignItems: 'center', gap: '6px'
                }}
              >
                <span>{currentQ.subjectIcon}</span>
                <span>مادة: {currentQ.subject}</span>
              </span>

              <button
                style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => soundManager.speak(currentQ.question)}
              >
                <span>🔊 استمع للسؤال بصوت واضح</span>
              </button>
            </div>

            {/* Question Text */}
            <h2 style={{ fontSize: '22px', color: 'var(--navy)', marginBottom: '26px', lineHeight: 1.5, fontWeight: 800 }}>
              {currentQuestionIdx + 1}. {currentQ.question}
            </h2>

            {/* Options List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '30px' }}>
              {currentQ.options.map((opt, oIdx) => {
                const isSelected = selectedAnswers[currentQuestionIdx] === oIdx;

                return (
                  <div
                    key={oIdx}
                    style={{
                      border: isSelected ? '2.5px solid var(--blue)' : '1.5px solid var(--line)',
                      background: isSelected ? 'var(--blue-light)' : '#ffffff',
                      borderRadius: '16px', padding: '16px 20px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '16px', transition: 'all 0.2s',
                      boxShadow: isSelected ? '0 4px 12px rgba(37,99,235,0.15)' : 'none'
                    }}
                    onClick={() => handleSelectOption(currentQuestionIdx, oIdx)}
                  >
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      border: isSelected ? '7px solid var(--blue)' : '2px solid #94a3b8',
                      background: 'white'
                    }}></div>
                    <span style={{ fontSize: '20px' }}>{opt.icon}</span>
                    <span style={{ fontSize: '16px', fontWeight: isSelected ? 800 : 600, color: isSelected ? 'var(--blue)' : 'var(--navy)' }}>
                      {opt.text}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Bottom Question Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '18px', borderTop: '1px solid var(--line)' }}>
              <button
                className="btn-secondary"
                disabled={currentQuestionIdx === 0}
                style={{ opacity: currentQuestionIdx === 0 ? 0.4 : 1 }}
                onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev - 1))}
              >
                السابق ⬅️
              </button>

              <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>
                {Object.keys(selectedAnswers).length} من {totalQuestions} أسئلة تمت الإجابة عليها
              </span>

              {currentQuestionIdx < totalQuestions - 1 ? (
                <button
                  className="btn-accent"
                  onClick={() => setCurrentQuestionIdx(prev => Math.min(totalQuestions - 1, prev + 1))}
                >
                  التالي ➡️
                </button>
              ) : (
                <button
                  className="btn-accent"
                  style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
                  onClick={handleSubmitExam}
                >
                  مراجعة وتسليم الامتحان 🏁
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. OFFICIAL REPORT CARD & RESULT VIEW */}
      {examState === 'result' && (
        <div>
          {/* Official Diploma Header */}
          <div style={{
            background: 'white', border: '4px double #d97706', borderRadius: '24px',
            padding: '36px', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', marginBottom: '30px',
            position: 'relative'
          }}>
            {/* Watermark Banner */}
            <div style={{ textAlign: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: '20px', marginBottom: '24px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '26px' }}>🦅</span>
                <span style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '0.5px', color: '#1e293b' }}>
                  منصة فاهم — تقرير تدريبي
                </span>
                <span style={{ fontSize: '26px' }}>🇪🇬</span>
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--navy)' }}>
                تقرير نتيجة الاختبار التدريبي
              </h2>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                نتيجة تدريب محلية • لا تمثل تقييمًا وزاريًا أو شهادة رسمية
              </span>
            </div>

            {/* Student & Assessment Color Ribbon */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '18px', marginBottom: '26px'
            }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid var(--line)' }}>
                <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block' }}>اسم الطالب:</span>
                <strong style={{ fontSize: '17px', color: 'var(--navy)' }}>{activeChild.name}</strong>
                <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>المرحلة: {activeChild.grade} (المنهج المصري)</div>
              </div>

              <div style={{ background: currentBand.bg, padding: '16px', borderRadius: '12px', border: `2px solid ${currentBand.color}` }}>
                <span style={{ fontSize: '12px', color: currentBand.color, fontWeight: 700, display: 'block' }}>نتيجة التدريب:</span>
                <strong style={{ fontSize: '18px', color: currentBand.color }}>{currentBand.title}</strong>
                <div style={{ fontSize: '12px', fontWeight: 700, marginTop: '4px', color: currentBand.color }}>
                  {currentBand.tag} • {correctCount} من {totalQuestions} إجابات صحيحة
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid var(--line)' }}>
                <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block' }}>حالة المحاولة:</span>
                <strong style={{ fontSize: '17px', color: '#16a34a' }}>✓ أجاب عن {attemptedCount} من {totalQuestions}</strong>
                <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>ملخص تعليمي غير رسمي</div>
              </div>
            </div>

            {/* Detailed Subject Scores Breakdown */}
            <h4 style={{ fontSize: '15px', color: 'var(--navy)', marginBottom: '12px' }}>
              ملخص الأداء التدريبي:
            </h4>
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '14px', marginBottom: '24px' }}>
              <strong style={{ color: '#1e3a8a' }}>نتيجة المحاولة الحالية: {correctCount} من {totalQuestions} ({percentage}%)</strong>
              <p style={{ color: '#475569', fontSize: '13px', margin: '6px 0 0' }}>يعرض التقرير نتيجة الاختبار الذي أجراه الطالب فقط.</p>
            </div>

            {/* Official Stamp & Signatures */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px', borderTop: '2px dashed #cbd5e1', flexWrap: 'wrap', gap: '20px' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block' }}>نوع التقرير:</span>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px', border: '2px solid #2563eb',
                  color: '#2563eb', padding: '6px 14px', borderRadius: '8px', fontWeight: 900, fontSize: '12px', marginTop: '6px'
                }}>
                  <span>★</span> نتيجة اختبار تدريبي من فاهم <span>★</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  style={{
                    background: '#1e293b', color: 'white', border: 'none', padding: '12px 24px',
                    borderRadius: 'var(--radius-full)', fontWeight: 800, fontSize: '13.5px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}
                  onClick={() => {
                    window.print();
              triggerToast('تم فتح نافذة طباعة تقرير التدريب.');
                  }}
                >
                  <span>🖨️ طباعة تقرير التدريب</span>
                </button>

                <button
                  className="btn-accent"
                  style={{ padding: '12px 24px', borderRadius: 'var(--radius-full)', fontSize: '13.5px' }}
                  onClick={handleStartExam}
                >
                  <span>إعادة المحاولة لتحسين الأداء ↺</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
