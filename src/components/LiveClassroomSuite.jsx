import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { launchConfetti } from '../utils/confetti';

export default function LiveClassroomSuite({ onClose }) {
  const {
    activeChild,
    activeSubject,
    curriculumData,
    activeLesson,
    soundManager,
    triggerToast,
    setCurrentScreen
  } = useApp();

  const currentSubjectObj = curriculumData[activeSubject] || curriculumData.arabic;
  const lessonObj = activeLesson || currentSubjectObj.lessons?.[0] || {
    title: 'أصوات الحروف والمدود — مراجعة حية',
    letter: 'ب'
  };

  // Student Controls State
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [handRaised, setHandRaised] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState('teacher'); // 'teacher' | 'ahmed' | 'mariam'

  // Whiteboard States & Canvas Ref
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#facc15');
  const [brushSize, setBrushSize] = useState(4);
  const [activeTool, setActiveTool] = useState('pen'); // 'pen' | 'eraser' | 'star'
  const [studentDrawAllowed, setStudentDrawAllowed] = useState(true);
  const [whiteboardBackground, setWhiteboardBackground] = useState('blank'); // 'blank' | 'challenge' | 'grid'

  // Live Pop Quiz Challenge (Option A + B Integration)
  const [showLivePopQuiz, setShowLivePopQuiz] = useState(false);
  const [quizAnswered, setQuizAnswered] = useState(null);
  const [quizScores, setQuizScores] = useState({ ahmed: null, mariam: true, youssef: true, nour: true });

  // Floating reactions array
  const [reactions, setReactions] = useState([]);

  // Session timer
  const [elapsedSeconds, setElapsedSeconds] = useState(14 * 60 + 20); // 14:20 elapsed
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatElapsed = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;

    // Draw initial whiteboard guide text
    ctx.font = 'bold 20px Cairo, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.fillText('✏️ سبورة الفصل التفاعلية المشتركة — اكتب أو ارسم مع المعلمة وزملائك', canvas.width / 2, 40);

    // Initial letters demo
    ctx.font = 'bold 48px Cairo, sans-serif';
    ctx.fillStyle = '#facc15';
    ctx.fillText('بـَـا  •  بُـ  •  بِـ', canvas.width / 2, canvas.height / 2);
  }, [whiteboardBackground]);

  // Whiteboard drawing handlers
  const startDrawing = (e) => {
    if (!studentDrawAllowed) {
      triggerToast('⚠️ المعلمة قامت بتجميد السبورة للشرح حالياً');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    const ctx = canvas.getContext('2d');

    if (activeTool === 'star') {
      ctx.font = '32px sans-serif';
      ctx.fillText('⭐', x - 16, y + 12);
      soundManager.playSuccess();
      return;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = activeTool === 'eraser' ? '#0f172a' : brushColor;
    ctx.lineWidth = activeTool === 'eraser' ? 24 : brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    soundManager.playSuccess();
    triggerToast('🧹 تم مسح السبورة');
  };

  // Reactions trigger
  const triggerReaction = (emoji, text) => {
    const id = Date.now() + Math.random();
    setReactions(prev => [...prev, { id, emoji, text, x: 20 + Math.random() * 60 }]);
    soundManager.playSuccess();
    triggerToast(`${emoji} أرسلت تفاعلاً للفصل: ${text}`);

    if (emoji === '🎉') {
      launchConfetti();
    }

    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id));
    }, 2400);
  };

  // Hand raise toggle
  const toggleHandRaise = () => {
    const nextState = !handRaised;
    setHandRaised(nextState);
    if (nextState) {
      soundManager.playSuccess();
      soundManager.speak(`أستاذة سارة، البطل ${activeChild.name} يرفع يده للمشاركة.`);
      triggerToast(`✋ رفعت يدك للمشاركة! المعلمة ستعطيك الكلمة.`);
      setActiveSpeaker('ahmed');
    } else {
      triggerToast('خفضت يدك');
    }
  };

  // Trigger live pop quiz
  const handleLaunchPopQuiz = () => {
    setShowLivePopQuiz(true);
    setQuizAnswered(null);
    soundManager.speak('تحدي السفارة السريع في الفصل! أجب على السؤال الذي ظهر على شاشتك.');
    triggerToast('🚨 أطلقت المعلمة سارة تحدي السفارة السريع!');
  };

  const handleAnswerPopQuiz = (isCorrect) => {
    setQuizAnswered(isCorrect);
    if (isCorrect) {
      soundManager.playSuccess();
      launchConfetti();
      triggerToast('🎉 أحسنت يا بطل! إجابة صحيحة 100% وحصلت على شارة التميز ⭐');
      setQuizScores(prev => ({ ...prev, ahmed: true }));
    } else {
      soundManager.playRetry();
      triggerToast('↺ حاول ثانية بهدوء يا بطل');
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#090d16', zIndex: 650,
      display: 'flex', flexDirection: 'column', color: 'white', fontFamily: 'Cairo, sans-serif'
    }}>
      {/* 1. Classroom Top Navigation Header */}
      <header style={{
        background: '#111827', borderBottom: '1px solid #1f2937', padding: '10px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'
      }}>
        {/* Left: Live status and lesson info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.2)', border: '1.5px solid #ef4444',
            color: '#fca5a5', padding: '5px 12px', borderRadius: 'var(--radius-full)',
            fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span>
            <span>بث حي فائق الدقة (HD)</span>
          </div>

          <div>
            <strong style={{ fontSize: '15px', color: '#f8fafc' }}>
              {currentSubjectObj.icon} {currentSubjectObj.title} — {lessonObj.title}
            </strong>
            <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block' }}>
              المجموعة (أ) • 4 طلاب فقط • المعلمة: أ/ سارة أحمد
            </span>
          </div>
        </div>

        {/* Center: Live Timer and Quick Pop-Quiz Challenge Launcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: '#1f2937', padding: '6px 14px', borderRadius: 'var(--radius-full)',
            fontSize: '13px', fontWeight: 800, color: '#38bdf8', fontFamily: 'monospace'
          }}>
            ⏱️ {formatElapsed(elapsedSeconds)}
          </div>

          <button
            style={{
              background: 'linear-gradient(135deg, #e11d48, #be123c)', color: 'white',
              border: 'none', padding: '6px 14px', borderRadius: 'var(--radius-full)',
              fontSize: '12px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: '0 4px 12px rgba(190, 18, 60, 0.35)'
            }}
            onClick={handleLaunchPopQuiz}
          >
            <span>🇪🇬 تحدي السفارة السريع (Pop Quiz)</span>
          </button>
        </div>

        {/* Right: Leave and End buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            style={{
              background: '#059669', color: 'white', border: 'none', padding: '8px 16px',
              borderRadius: 'var(--radius-md)', fontWeight: 800, fontSize: '12.5px', cursor: 'pointer'
            }}
            onClick={() => {
              triggerToast('✓ تم أرشفة الحصة وإرسال كشف الأداء لواتساب ولي الأمر');
              onClose();
            }}
          >
            إنهاء الحصة والأرشفة 💾
          </button>
          <button
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '24px', cursor: 'pointer' }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>
      </header>

      {/* 2. Main Classroom Center: Video Micro-Group Grid + Interactive Whiteboard */}
      <div style={{
        flex: 1, display: 'grid', gridTemplateColumns: '1fr 340px', gap: '14px',
        padding: '14px', minHeight: 0, position: 'relative'
      }}>
        
        {/* Left Column: Interactive Collaborative Whiteboard Stage */}
        <div style={{
          background: '#0f172a', borderRadius: '20px', border: '2px solid #1e293b',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative'
        }}>
          {/* Whiteboard Toolbar Header */}
          <div style={{
            background: '#1e293b', padding: '8px 16px', display: 'flex',
            justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155'
          }}>
            {/* Drawing Tools */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>أداة الكتابة:</span>
              <button
                style={{
                  background: activeTool === 'pen' ? 'var(--blue)' : '#334155', color: 'white',
                  border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                }}
                onClick={() => setActiveTool('pen')}
              >
                ✏️ قلم
              </button>
              <button
                style={{
                  background: activeTool === 'star' ? '#ca8a04' : '#334155', color: 'white',
                  border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                }}
                onClick={() => setActiveTool('star')}
              >
                ⭐ نجمة تميز
              </button>
              <button
                style={{
                  background: activeTool === 'eraser' ? '#dc2626' : '#334155', color: 'white',
                  border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                }}
                onClick={() => setActiveTool('eraser')}
              >
                🧼 ممحاة
              </button>

              <span style={{ height: '18px', width: '1px', background: '#475569', margin: '0 4px' }}></span>

              {/* Colors */}
              {['#facc15', '#38bdf8', '#22c55e', '#ef4444', '#ec4899', '#ffffff'].map(c => (
                <button
                  key={c}
                  style={{
                    width: '22px', height: '22px', borderRadius: '50%', background: c,
                    border: brushColor === c ? '2.5px solid white' : '1px solid #475569', cursor: 'pointer'
                  }}
                  onClick={() => { setBrushColor(c); setActiveTool('pen'); }}
                />
              ))}
            </div>

            {/* Teacher Classroom Management Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                style={{
                  background: studentDrawAllowed ? '#065f46' : '#7f1d1d', color: 'white',
                  border: 'none', padding: '5px 12px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer'
                }}
                onClick={() => {
                  setStudentDrawAllowed(!studentDrawAllowed);
                  triggerToast(studentDrawAllowed ? '🔒 قفلت المعلمة إذن الكتابة على السبورة' : '🔓 سمحت المعلمة للطلاب بالكتابة');
                }}
              >
                {studentDrawAllowed ? '🔓 كتابة الطلاب: مفعلة' : '🔒 كتابة الطلاب: مجمدة'}
              </button>

              <button
                style={{ background: '#475569', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '11.5px', cursor: 'pointer' }}
                onClick={clearCanvas}
              >
                مسح الكل 🗑️
              </button>
            </div>
          </div>

          {/* Whiteboard HTML5 Canvas Area */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: activeTool === 'star' ? 'pointer' : 'crosshair' }}>
            <canvas
              ref={canvasRef}
              style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />

            {/* Floating Reactions Layer */}
            {reactions.map(r => (
              <div
                key={r.id}
                style={{
                  position: 'absolute', bottom: '20px', left: `${r.x}%`,
                  fontSize: '36px', pointerEvents: 'none',
                  animation: 'floatUp 2.2s cubic-bezier(0.1, 0.8, 0.3, 1) forwards'
                }}
              >
                {r.emoji}
              </div>
            ))}

            {/* Live Pop-Quiz Overlay Modal if active */}
            {showLivePopQuiz && (
              <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                background: 'rgba(15, 23, 42, 0.95)', border: '2px solid #e11d48', borderRadius: '24px',
                padding: '24px', maxWidth: '520px', width: '90%', boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                backdropFilter: 'blur(10px)', textAlign: 'center'
              }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ffe4e6', color: '#9f1239', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '11px', fontWeight: 800, marginBottom: '12px' }}>
                  <span>🇪🇬 تحدي السفارة الحي الآن</span>
                </div>
                <h3 style={{ fontSize: '18px', color: '#f8fafc', marginBottom: '16px' }}>
                  أي من الكلمات التالية تحتوي على مد طويل بصوت (بـَـا)؟
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
                  <button
                    style={{
                      padding: '12px', borderRadius: '12px', fontSize: '15px', fontWeight: 800, cursor: 'pointer',
                      border: quizAnswered === true ? '2px solid #22c55e' : '1px solid #334155',
                      background: quizAnswered === true ? '#052e16' : '#1e293b', color: quizAnswered === true ? '#4ade80' : 'white'
                    }}
                    onClick={() => handleAnswerPopQuiz(true)}
                  >
                    🚪 بـَـابْ (بـَـا)
                  </button>
                  <button
                    style={{
                      padding: '12px', borderRadius: '12px', fontSize: '15px', fontWeight: 800, cursor: 'pointer',
                      border: '1px solid #334155', background: '#1e293b', color: 'white'
                    }}
                    onClick={() => handleAnswerPopQuiz(false)}
                  >
                    🦆 بَطَّة (بـَ)
                  </button>
                </div>
                {quizAnswered === true && (
                  <div style={{ color: '#4ade80', fontSize: '14px', fontWeight: 800, marginBottom: '12px' }}>
                    ✓ إجابة ممتازة! جميع طلاب المجموعة (أحمد، مريم، يوسف، نور) أجابوا بنجاح 🌟
                  </div>
                )}
                <button
                  style={{ background: '#334155', color: '#94a3b8', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                  onClick={() => setShowLivePopQuiz(false)}
                >
                  إغلاق التحدي والعودة للسبورة ✕
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Micro-Group Video Grid (4 Students + Teacher) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          {/* 1. Teacher Video Box (Featured Speaker) */}
          <div style={{
            background: '#1e293b', borderRadius: '16px', overflow: 'hidden',
            border: activeSpeaker === 'teacher' ? '2.5px solid #22c55e' : '1.5px solid #334155',
            position: 'relative', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '44px' }}>👩‍🏫</div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
                أ/ سارة أحمد (معلمة المنهج)
              </div>
            </div>
            <div style={{
              position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.6)',
              padding: '2px 8px', borderRadius: '6px', fontSize: '11px', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '4px'
            }}>
              <span>🎤 تتحدث الآن</span>
            </div>
          </div>

          {/* 2. Student 1: Active Child (Ahmed - User) */}
          <div style={{
            background: '#1e293b', borderRadius: '16px', overflow: 'hidden',
            border: handRaised ? '2.5px solid #facc15' : '1.5px solid #334155',
            position: 'relative', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '36px' }}>👦</div>
              <div style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--blue-light)' }}>
                {activeChild.name} (أنت) • {activeChild.grade}
              </div>
            </div>
            {handRaised && (
              <div style={{
                position: 'absolute', top: '6px', right: '6px', background: '#facc15',
                color: '#1e1b4b', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 900
              }}>
                ✋ رافع يده
              </div>
            )}
            <div style={{
              position: 'absolute', bottom: '6px', left: '6px', background: 'rgba(0,0,0,0.5)',
              padding: '2px 6px', borderRadius: '4px', fontSize: '10px', color: micOn ? '#4ade80' : '#ef4444'
            }}>
              {micOn ? '🎤 ميكروفون يعمل' : '🔇 صامت'}
            </div>
          </div>

          {/* 3. Student 2: Mariam (Dubai, UAE) */}
          <div style={{
            background: '#111827', borderRadius: '16px', overflow: 'hidden',
            border: '1px solid #1f2937', position: 'relative', height: '95px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '30px' }}>👧</div>
              <div style={{ fontSize: '11.5px', color: '#cbd5e1' }}>مريم خالد 🇦🇪 دبي</div>
            </div>
            <div style={{ position: 'absolute', bottom: '6px', left: '6px', fontSize: '10px', color: '#94a3b8' }}>
              ✓ مستمعة ممتازة
            </div>
          </div>

          {/* 4. Student 3: Youssef (Kuwait) */}
          <div style={{
            background: '#111827', borderRadius: '16px', overflow: 'hidden',
            border: '1px solid #1f2937', position: 'relative', height: '95px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '30px' }}>👦</div>
              <div style={{ fontSize: '11.5px', color: '#cbd5e1' }}>يوسف حسام 🇰🇼 الكويت</div>
            </div>
          </div>

          {/* 5. Student 4: Nour (London, UK) */}
          <div style={{
            background: '#111827', borderRadius: '16px', overflow: 'hidden',
            border: '1px solid #1f2937', position: 'relative', height: '95px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '30px' }}>👧</div>
              <div style={{ fontSize: '11.5px', color: '#cbd5e1' }}>نور الدين 🇬🇧 لندن</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Classroom Action & Audio Bar */}
      <footer style={{
        background: '#111827', borderTop: '1px solid #1f2937', padding: '12px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px'
      }}>
        {/* Child Audio / Video Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            style={{
              background: micOn ? '#2563eb' : '#dc2626', color: 'white',
              border: 'none', padding: '10px 18px', borderRadius: 'var(--radius-full)',
              fontWeight: 800, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
            }}
            onClick={() => {
              setMicOn(!micOn);
              triggerToast(micOn ? '🔇 تم كتم الميكروفون' : '🎤 الميكروفون قيد التشغيل');
            }}
          >
            <span>{micOn ? '🎤' : '🔇'}</span>
            <span>{micOn ? 'الميكروفون يعمل' : 'مكتوم'}</span>
          </button>

          <button
            style={{
              background: cameraOn ? '#334155' : '#dc2626', color: 'white',
              border: 'none', padding: '10px 18px', borderRadius: 'var(--radius-full)',
              fontWeight: 800, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
            }}
            onClick={() => {
              setCameraOn(!cameraOn);
              triggerToast(cameraOn ? '📷 الكاميرا مغلقة' : '📷 الكاميرا تعمل');
            }}
          >
            <span>{cameraOn ? '📷' : '🚫'}</span>
            <span>{cameraOn ? 'الكاميرا تعمل' : 'الكاميرا مغلقة'}</span>
          </button>

          {/* Raise Hand Button */}
          <button
            style={{
              background: handRaised ? '#facc15' : '#374151', color: handRaised ? '#1e1b4b' : 'white',
              border: 'none', padding: '10px 20px', borderRadius: 'var(--radius-full)',
              fontWeight: 900, fontSize: '13.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: handRaised ? '0 0 20px rgba(250, 204, 21, 0.5)' : 'none'
            }}
            onClick={toggleHandRaise}
          >
            <span>✋</span>
            <span>{handRaised ? 'أنت تطلب الكلمة الآن!' : 'ارفع يدك للمشاركة'}</span>
          </button>
        </div>

        {/* Reaction Emojis Ribbon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>تفاعل مع الفصل:</span>
          {[
            { emoji: '👏', label: 'تصفيق وتشجيع' },
            { emoji: '⭐', label: 'نجمة إعجاب' },
            { emoji: '❤️', label: 'محبة وشكر' },
            { emoji: '🎉', label: 'احتفال' },
            { emoji: '👍', label: 'فهمت الدرس' }
          ].map(r => (
            <button
              key={r.emoji}
              style={{
                background: '#1f2937', border: '1px solid #374151', color: 'white',
                width: '40px', height: '40px', borderRadius: '50%', fontSize: '18px',
                cursor: 'pointer', display: 'grid', placeItems: 'center', transition: 'transform 0.15s'
              }}
              title={r.label}
              onClick={() => triggerReaction(r.emoji, r.label)}
            >
              {r.emoji}
            </button>
          ))}
        </div>

        {/* Direct Link to Embassy Exam Simulator */}
        <div>
          <button
            style={{
              background: 'rgba(255, 255, 255, 0.1)', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.2)',
              padding: '8px 16px', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: 700, cursor: 'pointer'
            }}
            onClick={() => {
              onClose();
              setCurrentScreen('exam');
            }}
          >
            <span>🇪🇬 فتح محاكي امتحانات السفارة الكامل</span>
          </button>
        </div>
      </footer>

      {/* Floating animation keyframes in standard style */}
      <style>{`
        @keyframes floatUp {
          0% {
            opacity: 1;
            transform: translateY(0) scale(0.8);
          }
          50% {
            opacity: 1;
            transform: translateY(-120px) scale(1.3);
          }
          100% {
            opacity: 0;
            transform: translateY(-240px) scale(1.6);
          }
        }
      `}</style>
    </div>
  );
}
