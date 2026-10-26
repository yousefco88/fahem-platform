/**
 * AITutor.jsx
 * مساعد ذكي بسيط للأطفال
 * يستخدم ردود محلية مع إمكانية ربط API لاحقاً
 */
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { getContinueLesson } from '../../utils/todayPlan';
import { childPaths } from '../child/childSubjects';
import './AITutor.css';

// 🤖 ردود محلية ذكية
const LOCAL_RESPONSES = {
  greetings: [
    'أهلاً! أنا فاهم، مساعد التدريب 🤖 كيف أقدر أساعدك اليوم؟',
    'مرحباً صديقي! جاهز نتعلم سوا؟ 📚',
    'هلا وغلا! عندك سؤال؟ أنا هنا عشان أساعدك 🌟'
  ],
  encouragement: [
    'ممتاز! استمر كذا 💪',
    'أنت ذكي ماشاء الله! 🌟',
    'برافو عليك! 🎉',
    'شغل رائع! 👏'
  ],
  math_help: [
    'الرياضيات ممتعة! خلينا نحلها خطوة بخطوة 🔢',
    'عشان نحل المسألة، نبدأ بالأرقام الصغيرة أول 📐',
    'تخيل المسألة كأنها لعبة، وكل رقم هو لاعب! 🎮'
  ],
  arabic_help: [
    'اللغة العربية جميلة! كل حرف له صوت خاص 🇸🇦',
    'القراءة تفتح لك عوالم جديدة 📖',
    'الكتابة مثل الرسم بالكلمات ✏️'
  ],
  science_help: [
    'العلوم تفسر لنا العالم من حولنا 🔬',
    'كل سؤال علمي يبدأ بـ "ليش؟" وهذا شيء رائع! 🌍',
    'العلماء كانوا أطفال فضوليين مثلك 🚀'
  ],
  dont_understand: [
    'ما فيه شيء صعب! كل شيء يصير سهل لما نفهمه صح 💡',
    'طبيعي ما نفهم من أول مرة، الأهم نحاول مرة ثانية 🔄',
    'خلينا نشرحها بطريقة ثانية، أكيد بتفهم 🎯'
  ],
  default: [
    'ما عندي إجابة جاهزة لهذا السؤال 🙏 اكتبه وخذه معك للمعلم في الحصة القادمة، وهو يشرحه لك 👨‍🏫'
  ]
};

// 🔍 تحليل السؤال وإرجاع الرد المناسب
function analyzeAndRespond(message) {
  const msg = message.toLowerCase();
  
  // تحيات
  if (msg.match(/مرحبا|اهلا|هلا|السلام|صباح|مساء/)) {
    return randomFrom(LOCAL_RESPONSES.greetings);
  }
  
  // رياضيات
  if (msg.match(/رياضيات|حساب|جمع|طرح|ضرب|قسمة|رقم|عدد|\+|\-|\*|÷/)) {
    return randomFrom(LOCAL_RESPONSES.math_help);
  }
  
  // عربي
  if (msg.match(/عربي|قراءة|كتابة|حرف|كلمة|قصة|نص/)) {
    return randomFrom(LOCAL_RESPONSES.arabic_help);
  }
  
  // علوم
  if (msg.match(/علوم|علم|تجربة|حيوان|نبات|جسم|فضاء|كوكب/)) {
    return randomFrom(LOCAL_RESPONSES.science_help);
  }
  
  // ما فاهم
  if (msg.match(/ما فهمت|مو فاهم|صعب|معقد|مشكلة/)) {
    return randomFrom(LOCAL_RESPONSES.dont_understand);
  }
  
  // تشجيع
  if (msg.match(/خلصت|انتهيت|حليت|نجحت/)) {
    return randomFrom(LOCAL_RESPONSES.encouragement);
  }
  
  // افتراضي
  return LOCAL_RESPONSES.default[0] + '\n\nجرب تسألني عن:\n• الرياضيات 🔢\n• اللغة العربية 📖\n• العلوم 🔬';
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function AITutor({ childName: childNameProp, subject = null }) {
  const navigate = useNavigate();
  const { activeChild, curriculumData, learningRecords } = useApp();
  const childName = childNameProp || activeChild?.name || 'صديقي';
  const continueLesson = getContinueLesson(curriculumData, learningRecords, activeChild?.masteredLessons || []);
  const [messages, setMessages] = useState([
    { role: 'ai', content: `أهلاً ${childName}! 👋 أنا فاهم، مساعد التدريب (ردود تشجيعية جاهزة). اسألني عن الرياضيات أو العربي أو العلوم 🌟` }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    
    // Simulate AI typing
    setIsTyping(true);
    await new Promise(r => setTimeout(r, 800 + Math.random() * 700));
    
    // Get AI response
    const aiResponse = analyzeAndRespond(userMessage);
    
    setIsTyping(false);
    setMessages(prev => [...prev, { role: 'ai', content: aiResponse }]);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Quick prompts
  const quickPrompts = [
    { emoji: '🔢', text: 'ساعدني في الرياضيات' },
    { emoji: '📖', text: 'عندي سؤال عن العربي' },
    { emoji: '🔬', text: 'فسر لي شيء علمي' },
    { emoji: '💡', text: 'ما فهمت الدرس' }
  ];

  return (
    <div className="ait-wrap" dir="rtl">
      <div className="ait-header">
        <div className="ait-avatar">🤖</div>
        <div>
          <h2 className="ait-title">فاهم - مساعد التدريب</h2>
          <p className="ait-sub">ردود تشجيعية جاهزة وليس ذكاءً اصطناعياً — للإجابات الدقيقة اسأل معلمك</p>
        </div>
      </div>

      {continueLesson && (
        <button
          type="button"
          className="ait-chip ait-lesson"
          onClick={() => navigate(childPaths.lesson(continueLesson.lesson.id, 'video'), { state: { fromApp: true } })}
        >
          <span aria-hidden="true">▶️</span>
          <span>كمّل درسك: {continueLesson.lesson.title}</span>
        </button>
      )}

      <div className="ait-messages" aria-live="polite">
        {messages.map((msg, idx) => (
          <div key={idx} className={`ait-row ${msg.role}`}>
            <div className={`ait-bubble ${msg.role}`}>
              {msg.role === 'ai' && <span aria-hidden="true">🤖 </span>}
              {msg.content}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="ait-row ai">
            <div className="ait-bubble ai ait-typing">🤖 يكتب...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {messages.length <= 2 && (
        <div className="ait-quick">
          {quickPrompts.map((prompt, idx) => (
            <button key={idx} type="button" className="ait-chip" onClick={() => setInput(prompt.text)}>
              <span aria-hidden="true">{prompt.emoji}</span>
              <span>{prompt.text}</span>
            </button>
          ))}
        </div>
      )}

      <div className="ait-input-bar">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="اكتب سؤالك هنا..."
          aria-label="سؤالك"
          className="ait-input"
        />
        <button type="button" onClick={handleSend} disabled={!input.trim() || isTyping} className="ait-send">
          إرسال
        </button>
      </div>
    </div>
  );
}
