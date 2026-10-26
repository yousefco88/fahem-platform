/**
 * AITutor.jsx
 * مساعد ذكي بسيط للأطفال
 * يستخدم ردود محلية مع إمكانية ربط API لاحقاً
 */
import React, { useState, useRef, useEffect } from 'react';

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
    'سؤال حلو! خليني أفكر... 🤔',
    'أووه، سؤال ذكي! 🧠',
    'ممتاز إنك تسأل، هذا أول خطوة للتعلم! 📚'
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
  return randomFrom(LOCAL_RESPONSES.default) + '\n\nجرب تسألني عن:\n• الرياضيات 🔢\n• اللغة العربية 📖\n• العلوم 🔬';
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function AITutor({ childName = 'صديقي', subject = null }) {
  const [messages, setMessages] = useState([
    { role: 'ai', content: `أهلاً ${childName}! 👋 أنا فاهم، مساعد التدريب (ردود تشجيعية جاهزة). اسألني وسأوجّهك! 🌟` }
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
    <div className="flex flex-col h-full bg-gradient-to-b from-indigo-50 to-white rounded-2xl overflow-hidden" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-l from-indigo-600 to-purple-600 text-white p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl">
            🤖
          </div>
          <div>
            <h2 className="font-bold text-lg">فاهم - المساعد الذكي</h2>
            <p className="text-white/80 text-sm">مساعد تجريبي — ردود تعليمية مبسطة</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div 
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
          >
            <div 
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none'
                  : 'bg-white shadow-md text-gray-800 rounded-bl-none'
              }`}
            >
              {msg.role === 'ai' && (
                <span className="text-lg ml-2">🤖</span>
              )}
              <span className="whitespace-pre-wrap">{msg.content}</span>
            </div>
          </div>
        ))}
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-end">
            <div className="bg-white shadow-md rounded-2xl rounded-bl-none px-4 py-3">
              <span className="text-lg ml-2">🤖</span>
              <span className="text-gray-500">يكتب...</span>
              <span className="animate-pulse">💭</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => setInput(prompt.text)}
                className="flex items-center gap-2 px-3 py-2 bg-white rounded-full shadow-sm hover:shadow-md transition-all whitespace-nowrap text-sm"
              >
                <span>{prompt.emoji}</span>
                <span className="text-gray-700">{prompt.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 bg-white border-t">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="اكتب سؤالك هنا..."
            className="flex-1 px-4 py-3 rounded-full border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-right"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className={`
              px-6 py-3 rounded-full font-bold transition-all
              ${input.trim() && !isTyping
                ? 'bg-gradient-to-l from-indigo-600 to-purple-600 text-white hover:shadow-lg'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            إرسال ➤
          </button>
        </div>
      </div>
    </div>
  );
}
