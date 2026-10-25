// أسئلة المحاكي التدريبي (أسلوب منهج الوزارة المصرية)
// مصدر مشترك: يستخدمه EmbassyExamSimulator للمشغّل، وSkillsReport لتحليل المحاولات القديمة
// كل سؤال موسوم بحقل skill — أساس تقرير مهارات ولي الأمر (م3)
// ملاحظة: عند تعديل الأسئلة تُحلَّل المحاولات القديمة التي لا تحمل skills محفوظة وفق القائمة الحالية
export const EXAM_QUESTIONS = [
    // 1. اللغة العربية
    {
      id: 1,
      subject: 'اللغة العربية',
      skill: 'المدود الطويلة (المد بالألف)',
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
      skill: 'ترتيب الحروف وتكوين الكلمات',
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
      skill: 'مقارنة الأعداد',
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
      skill: 'الجمع ضمن 10',
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
      skill: 'مفردات إنجليزية أساسية',
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
      skill: 'الحواس بالإنجليزية',
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
      skill: 'الكائنات الحية وغير الحية',
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
      skill: 'جغرافيا مصر',
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
      skill: 'الأمان الرقمي',
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
      skill: 'السلوك الأخلاقي',
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
