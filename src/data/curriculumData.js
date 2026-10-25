// بيانات المنهج المصري المتكامل لـ «فاهم» — الصف الأول الابتدائي (جميع المواد الرسمية)

export const CURRICULUM_DATA = {
  // 1. اللغة العربية
  arabic: {
    id: 'arabic',
    title: 'اللغة العربية',
    icon: '📖',
    badge: 'لغتي وهويتي',
    color: '#2563eb',
    grade: 'الصف الأول الابتدائي (المنهج المصري)',
    lessons: [
      {
        id: 'alef',
        letter: 'أ',
        title: 'حرف الألف بالحركات القصيرة',
        objective: 'التمييز السمعي والبصري لأصوات حرف الألف (أَ، أُ، إِ) ونطقه وكتابته بطريقة صحيحة.',
        duration: '28:15',
        videoChapters: [
          { time: '00:00', label: 'ترحيب المعلمة بالأطفال' },
          { time: '04:10', label: 'نطق الحرف بالحركات القصيرة' },
          { time: '11:30', label: 'كلمات تبدأ بحرف الألف (أرنب، أذن، إبرة)' },
          { time: '20:15', label: 'لعبة نطق سريعة مع الطلاب' }
        ],
        parentGuide: {
          summary: 'الهدف أن يربط طفلك بين شكل الألف وصوته بالحركات وليس حفظ الكلمات كصورة صماء.',
          tips: [
            'اجعل طفلك يشير بيده لأعلى عند الفتحة (أَ) ولأسفل عند الكسرة (إِ).',
            'اطلب منه البحث عن 3 أشياء في المنزل تبدأ بحرف الألف.',
            'لا تضغط عليه في دقة رسم الهمزة من أول محاولة؛ الأهم هو الاتجاه من أعلى لأسفل.'
          ]
        },
        pdfTitle: 'ورقة عمل حرف الألف — تلوين وتتبع وتوصيل',
        quizType: 'choice',
        question: 'أي من الكلمات التالية تبدأ بصوت الألف المكسورة (إِ)؟',
        options: [
          { text: 'إِبْرَة (إِ)', correct: true, icon: '🪡' },
          { text: 'أَرْنَب (أَ)', correct: false, icon: '🐇' },
          { text: 'أُذُن (أُ)', correct: false, icon: '👂' },
          { text: 'بَاب', correct: false, icon: '🚪' }
        ],
        interactiveBuilder: {
          targetWord: 'أَمَلْ',
          syllables: ['أَ', 'مَ', 'لْ', 'بـَ', 'تـِ'],
          correctOrder: ['أَ', 'مَ', 'لْ']
        }
      },
      {
        id: 'baa',
        letter: 'ب',
        title: 'حرف الباء وأصوات المد الطويل',
        objective: 'التمييز بين الحركة القصيرة (بَـ) والمد الطويل (بـَا) وتركيب كلمات ثلاثية بسيطة.',
        duration: '32:00',
        videoChapters: [
          { time: '00:00', label: 'تدفئة ومراجعة الحرف السابق' },
          { time: '04:20', label: 'نطق صوت الباء بالحركات (بَـ، بُـ، بِـ)' },
          { time: '12:15', label: 'الفرق الحاسم بين الحركة والمد (بَـ مقابل بـَا)' },
          { time: '22:00', label: 'مشاركات صوتية للطلاب في قراءة (باب)' }
        ],
        parentGuide: {
          summary: 'طفل الصف الأول قد يخلط بين المد والحركة؛ ركز معه على إطالة زمن الصوت لمدة ثانيتين.',
          tips: [
            'امد يديك كأنك تسحب مطاطاً عندما تنطق (بـَا) ليدرك طفلك امتداد الصوت حركياً.',
            'اسأله: هل "بطة" صوتها طويل أم قصير؟ ثم قارنها بـ "باب".',
            'دقيقة واحدة من المراجعة الممتعة أفضل من نصف ساعة من الإلزام.'
          ]
        },
        pdfTitle: 'ورقة تدريب حرف الباء والمدود — المنهج المصري',
        quizType: 'choice',
        question: 'أي من الكلمات التالية تحتوي على مد طويل بصوت (بَا)؟',
        options: [
          { text: 'بَابْ (بـَـا)', correct: true, icon: '🚪' },
          { text: 'بَطَّة (بـَ)', correct: false, icon: '🦆' },
          { text: 'قِطَّة', correct: false, icon: '🐱' },
          { text: 'قَلَم', correct: false, icon: '✏️' }
        ],
        interactiveBuilder: {
          targetWord: 'بَابْ',
          syllables: ['بـَـا', 'بْ', 'تـِ', 'مَ'],
          correctOrder: ['بـَـا', 'بْ']
        }
      },
      {
        id: 'taa',
        letter: 'ت',
        title: 'حرف التاء والكلمات الثلاثية',
        objective: 'التعرف على حرف التاء في مواضع الكلمة والتمييز الأولي بين التاء المفتوحة والمربوطة.',
        duration: '30:40',
        videoChapters: [
          { time: '00:00', label: 'قصة التاج والتمساح' },
          { time: '06:10', label: 'أشكال حرف التاء في مواضع الكلمة' },
          { time: '15:20', label: 'تمرين قراءة كلمة (توت)' },
          { time: '24:00', label: 'تطبيق عملي مع المعلمة' }
        ],
        parentGuide: {
          summary: 'التركيز هنا على أن لحرف التاء نقطتين في الأعلى كالعينين المبتسمتين.',
          tips: [
            'شجع طفلك على تشبيه حرف التاء بطبق يحمل تفاحتين.',
            'ساعده في نطق كلمة "تَـ... تَمْر" واستشعار طرف اللسان خلف الأسنان العليا.'
          ]
        },
        pdfTitle: 'ورقة عمل حرف التاء — تمارين وتمييز المواضع',
        quizType: 'choice',
        question: 'ما هي الكلمة التي تبدأ بحرف التاء؟',
        options: [
          { text: 'تَمْر (تـَ)', correct: true, icon: '🌴' },
          { text: 'بَيْت', correct: false, icon: '🏠' },
          { text: 'أَسَد', correct: false, icon: '🦁' },
          { text: 'قَمَر', correct: false, icon: '🌙' }
        ],
        interactiveBuilder: {
          targetWord: 'تُوتْ',
          syllables: ['تُـو', 'تْ', 'بـَ', 'أَ'],
          correctOrder: ['تُـو', 'تْ']
        }
      }
    ]
  },

  // 2. الرياضيات
  math: {
    id: 'math',
    title: 'الرياضيات',
    icon: '🔢',
    badge: 'الأرقام والمنطق',
    color: '#059669',
    grade: 'الصف الأول الابتدائي (المنهج المصري)',
    lessons: [
      {
        id: 'math_numbers_1_5',
        letter: '١-٥',
        title: 'الأعداد من 1 إلى 5 وكتابتها',
        objective: 'العد التصاعدي للأشياء وربط الرمز العددي بالكمية الفعلية من 1 إلى 5.',
        duration: '26:50',
        videoChapters: [
          { time: '00:00', label: 'أنشودة الأعداد المرحة' },
          { time: '05:00', label: 'عد الأصابع والألعاب' },
          { time: '13:40', label: 'كتابة الرقم 3 والرقم 4 بطريقة صحيحة' },
          { time: '21:00', label: 'تحدي الكميات مع الطلاب' }
        ],
        parentGuide: {
          summary: 'الطفل في هذا العمر يفهم الأرقام بالأشياء الملموسة أكثر من الرموز المجردة.',
          tips: [
            'استخدم الفواكه أو الملاعق في المنزل: اطلب منه إعطاءك 3 ملاعق.',
            'انتبه لكتابة الرقم 2 والرقم 6 حتى لا يعكس الطفل اتجاههما.'
          ]
        },
        pdfTitle: 'ورقة تدريب الأعداد من 1 إلى 5 وتوصيل الكميات',
        quizType: 'choice',
        question: 'كم عدد النجوم الظاهرة في المجموعة: ⭐ ⭐ ⭐ ؟',
        options: [
          { text: '3 نجوم', correct: true, icon: '⭐' },
          { text: '2 نجمتان', correct: false, icon: '✨' },
          { text: '4 نجوم', correct: false, icon: '🌟' },
          { text: '5 نجوم', correct: false, icon: '☀️' }
        ],
        interactiveBuilder: {
          targetWord: 'العدد 3',
          syllables: ['١', '٢', '٣', '٤', '٥'],
          correctOrder: ['١', '٢', '٣']
        }
      },
      {
        id: 'math_compare',
        letter: '><',
        title: 'المقارنة: أكبر من وأصغر من ويساوي',
        objective: 'مقارنة المجموعات باستخدام رمز التمساح الجائع ( > ، < ، = ).',
        duration: '29:15',
        videoChapters: [
          { time: '00:00', label: 'قصة التمساح الذي يأكل العدد الأكبر' },
          { time: '07:20', label: 'مقارنة 4 مع 2' },
          { time: '16:00', label: 'متى نستخدم علامة يساوي (=)؟' },
          { time: '23:30', label: 'مسابقة سريعة بين الطلاب' }
        ],
        parentGuide: {
          summary: 'تشبيه فم التمساح المفتوح هو الطريقة الأسهل لترسيخ المقارنة دون ارتباك.',
          tips: [
            'ذكّر طفلك دوماً: التمساح جائع دائماً ويفتح فمه تجاه الطبق الأكثر طعاماً.',
            'عند التساوي: فم التمساح يغلق ويبقى خطين متوازيين (=).'
          ]
        },
        pdfTitle: 'ورقة عمل المقارنة — علامات أكبر وأصغر ويساوي',
        quizType: 'choice',
        question: 'أي علامة صحيحة للمقارنة بين: ( 5 ... 2 )؟',
        options: [
          { text: '5 > 2 (أكبر من)', correct: true, icon: '🐊' },
          { text: '5 < 2 (أصغر من)', correct: false, icon: '❌' },
          { text: '5 = 2 (يساوي)', correct: false, icon: '➖' }
        ],
        interactiveBuilder: {
          targetWord: '5 > 2',
          syllables: ['5', '>', '2', '<', '='],
          correctOrder: ['5', '>', '2']
        }
      },
      {
        id: 'math_addition_5',
        letter: '+',
        title: 'الجمع البسيط حتى العدد 5',
        objective: 'مفهوم الإضافة والضم معاً باستخدام الأشياء والصور لحل مسائل حتى 5.',
        duration: '31:20',
        videoChapters: [
          { time: '00:00', label: 'ماذا يعني رمز الزائد (+)؟' },
          { time: '06:15', label: 'مسألة: قطتان وانضمت قطة أخرى' },
          { time: '17:00', label: 'استخدام خط الأعداد الصغير' },
          { time: '25:00', label: 'حل أنشطة ورقة العمل' }
        ],
        parentGuide: {
          summary: 'الجمع هو عملية ضم مجموعتين، وليس مجرد حفظ لجداول جمع مجردة.',
          tips: [
            'ضع تفاحتين في طبق وتفاحة في طبق آخر واسأله: كم يصبح الكل معاً؟',
            'شجعه على استخدام أصابع يد واحدة في البداية.'
          ]
        },
        pdfTitle: 'ورقة تدريب الجمع حتى العدد 5 — رسومات ملونة',
        quizType: 'choice',
        question: 'كم حاصل جمع: ( 2 + 1 )؟',
        options: [
          { text: '3', correct: true, icon: '🍎' },
          { text: '4', correct: false, icon: '🍊' },
          { text: '2', correct: false, icon: '🍋' }
        ],
        interactiveBuilder: {
          targetWord: '2 + 1 = 3',
          syllables: ['2', '+', '1', '=', '3'],
          correctOrder: ['2', '+', '1', '=', '3']
        }
      }
    ]
  },

  // 3. اللغة الإنجليزية (Connect 1)
  english: {
    id: 'english',
    title: 'اللغة الإنجليزية (Connect)',
    icon: '🔤',
    badge: 'Connect 1 Curriculum',
    color: '#8b5cf6',
    grade: 'Primary 1 — Egyptian National Curriculum',
    lessons: [
      {
        id: 'eng_hello',
        letter: 'Hello!',
        title: 'Unit 1: Hello & Meet My Friends',
        objective: 'تعلم التحيات (Hello, Goodbye) والتعريف بالنفس (I am...) وصوت حرف B (Bee, Bag, Book, Blue).',
        duration: '27:30',
        videoChapters: [
          { time: '00:00', label: 'Hello Song with Busy Bee' },
          { time: '05:30', label: 'Saying "Hello, I am..."' },
          { time: '14:00', label: 'Phonics: Letter B sound /b/' },
          { time: '21:15', label: 'Interactive Game: Bag, Book, Blue' }
        ],
        parentGuide: {
          summary: 'منهج Connect المصري يركز على المحادثة الصوتية والفونكس (Phonics) بدلاً من الحفظ الصم.',
          tips: [
            'حيي طفلك صباحاً بالإنجليزية: "Hello, Good morning!" ليعتاد على سماعها.',
            'اسأله: "What color is this?" وشجعه على قول "Blue".'
          ]
        },
        pdfTitle: 'Connect 1 — Unit 1 Phonics & Vocabulary Worksheet',
        quizType: 'choice',
        question: 'Which word starts with the /b/ sound like "Busy Bee"?',
        options: [
          { text: 'Bag (حقيبة)', correct: true, icon: '🎒' },
          { text: 'Apple (تفاحة)', correct: false, icon: '🍎' },
          { text: 'Cat (قطة)', correct: false, icon: '🐱' },
          { text: 'Duck (بطة)', correct: false, icon: '🦆' }
        ],
        interactiveBuilder: {
          targetWord: 'BOOK',
          syllables: ['B', 'OO', 'K', 'A', 'P'],
          correctOrder: ['B', 'OO', 'K']
        }
      },
      {
        id: 'eng_school',
        letter: 'School',
        title: 'Unit 2: In My Classroom',
        objective: 'تسمية الأدوات المدرسية بالإنجليزية (Pencil, Pen, Ruler, Sharpener) والتعبير عنها بثقة.',
        duration: '28:40',
        videoChapters: [
          { time: '00:00', label: 'School Bag items' },
          { time: '08:15', label: 'It is a pencil / It is a ruler' },
          { time: '18:00', label: 'Counting school supplies (1 to 5)' },
          { time: '24:00', label: 'Wrap-up & Chant' }
        ],
        parentGuide: {
          summary: 'اربط الأدوات التي يستخدمها الطفل في حقيبته بمسمياتها الإنجليزية أثناء حل الواجب.',
          tips: [
            'اطلب منه: "Give me the pencil, please".',
            'دعه يفرز أدواته ويسمي كل أداة بمفردها.'
          ]
        },
        pdfTitle: 'Connect 1 — Classroom Objects & Tracing Practice',
        quizType: 'choice',
        question: 'What do we use to draw lines? (ما الذي نستخدمه لتسطير الورقة؟)',
        options: [
          { text: 'Ruler (مسطرة)', correct: true, icon: '📏' },
          { text: 'Eraser (ممحاة)', correct: false, icon: '🧼' },
          { text: 'Pencil (قلم رصاص)', correct: false, icon: '✏️' }
        ],
        interactiveBuilder: {
          targetWord: 'PEN',
          syllables: ['P', 'E', 'N', 'R', 'U'],
          correctOrder: ['P', 'E', 'N']
        }
      }
    ]
  },

  // 4. متعدد التخصصات — اكتشف (Discover)
  discover: {
    id: 'discover',
    title: 'اكتشف (Discover)',
    icon: '🔬',
    badge: 'العلوم والبيئة المصرية',
    color: '#0284c7',
    grade: 'الصف الأول الابتدائي (منهج التعليم المصري 2.0)',
    lessons: [
      {
        id: 'disc_senses',
        letter: '👁️',
        title: 'من أكون؟ — الحواس الخمس وكيف نكتشف العالم',
        objective: 'التعرف على الحواس الخمس (البصر، السمع، الشم، التذوق، اللمس) وأهميتها لحماية أجسامنا.',
        duration: '29:30',
        videoChapters: [
          { time: '00:00', label: 'قصة الطفل والحديقة' },
          { time: '06:30', label: 'العين والأذن: ماذا نرى ونسمع؟' },
          { time: '15:40', label: 'تحدي الحواس: تذوق الحلو والحامض' },
          { time: '22:10', label: 'كيف نحافظ على صحة حواسنا؟' }
        ],
        parentGuide: {
          summary: 'منهج اكتشف يربط الطفل ببيئته الحقيقية ويجعله يفكر مثل المستكشف الصغير.',
          tips: [
            'غمض عيني طفلك ودعه يتعرف على الفاكهة بالرائحة فقط (حاسة الشم).',
            'اسأله: بأي حاسة نسمع صوت العصفور؟'
          ]
        },
        pdfTitle: 'أنشطة اكتشف — الحواس الخمس واستكشاف البيئة',
        quizType: 'choice',
        question: 'بأي حاسة نستطيع سماع صوت الآذان وأصوات الطيور؟',
        options: [
          { text: 'حاسة السمع (الأذن) 👂', correct: true, icon: '👂' },
          { text: 'حاسة البصر (العين) 👁️', correct: false, icon: '👁️' },
          { text: 'حاسة التذوق (اللسان) 👅', correct: false, icon: '👅' }
        ],
        interactiveBuilder: {
          targetWord: 'عَيْنْ',
          syllables: ['عَـ', 'يْـ', 'نْ', 'سـَ', 'مـَ'],
          correctOrder: ['عَـ', 'يْـ', 'نْ']
        }
      },
      {
        id: 'disc_living',
        letter: '🌱',
        title: 'الكائنات الحية وغير الحية في بيئتنا',
        objective: 'التمييز بين الكائنات الحية (تتنفس، تنمو، تأكل) والأشياء غير الحية في المنزل والطبيعة المصرية.',
        duration: '27:50',
        videoChapters: [
          { time: '00:00', label: 'جولة استكشافية في الطبيعة' },
          { time: '07:00', label: 'شروط الكائن الحي (النمو والغذاء)' },
          { time: '16:30', label: 'النبات والحيوان والإنسان' },
          { time: '23:00', label: 'تمرين تصنيف مصور' }
        ],
        parentGuide: {
          summary: 'ساعد طفلك على الملاحظة: هل الصخرة تكبر إذا سقيناها ماء؟ لا، إذن هي كائن غير حي.',
          tips: [
            'ازرع معه بذرة فول صغيرة في قطنة وراقبا نموها يوماً بعد يوم.',
            'اسأله عن قطة المنزل أو العصفور: هل يحتاج طعاماً مثلنا؟'
          ]
        },
        pdfTitle: 'ورقة عمل تصنيف الكائنات الحية وغير الحية — اكتشف',
        quizType: 'choice',
        question: 'أي مما يلي يعتبر كائناً حياً يحتاج إلى الغذاء والماء لينمو؟',
        options: [
          { text: 'الشجرة والنبات 🌳', correct: true, icon: '🌳' },
          { text: 'السيارة 🚗', correct: false, icon: '🚗' },
          { text: 'القلم ✏️', correct: false, icon: '✏️' }
        ],
        interactiveBuilder: {
          targetWord: 'نَبَاتْ',
          syllables: ['نـَ', 'بـَـا', 'تْ', 'مـَ', 'لْ'],
          correctOrder: ['نـَ', 'بـَـا', 'تْ']
        }
      }
    ]
  },

  // 5. التربية الدينية والأخلاق (Values & Ethics)
  values: {
    id: 'values',
    title: 'التربية الدينية والأخلاق',
    icon: '🕌',
    badge: 'القيم واحترام الآخر',
    color: '#d97706',
    grade: 'الصف الأول الابتدائي (المنهج المصري)',
    lessons: [
      {
        id: 'val_honesty',
        letter: '🤝',
        title: 'الصدق والأمانة والتعاون',
        objective: 'ترسيخ فضيلة الصدق في القول، والمحافظة على الأمانة، والتعاون مع الأهل والأصدقاء.',
        duration: '25:20',
        videoChapters: [
          { time: '00:00', label: 'قصة الراعي الأمين' },
          { time: '06:15', label: 'لماذا يحب الله الصادقين؟' },
          { time: '14:30', label: 'الأمانة في المدرسة والمنزل' },
          { time: '20:00', label: 'أنشطة المواقف الأخلاقية' }
        ],
        parentGuide: {
          summary: 'الأطفال في الغربة بحاجة ماسة لترسيخ الهوية القيمية والأخلاق الإسلامية والعربية السمحة.',
          tips: [
            'كافئ طفلك وشجعه عندما يعترف بخطئه بصدق دون خوف.',
            'علمه قول الصدق في كل موقف، واجعله يراك قدوة في الوفاء بالوعد.'
          ]
        },
        pdfTitle: 'كتيب الأخلاق والقيم — أنشطة وتلوين المواقف الإيجابية',
        quizType: 'choice',
        question: 'عندما يجد أحمد لعبة ليست له في الفصل، ماذا يفعل ليكون أميناً؟',
        options: [
          { text: 'يعطيها للمعلمة لتبحث عن صاحبها 🤝', correct: true, icon: '⭐' },
          { text: 'يأخذها إلى المنزل دون إخبار أحد ❌', correct: false, icon: '🚫' },
          { text: 'يخفيها في حقيبته ❌', correct: false, icon: '🚫' }
        ],
        interactiveBuilder: {
          targetWord: 'صِدْقْ',
          syllables: ['صِـ', 'دْ', 'قْ', 'كـَ', 'ذِ'],
          correctOrder: ['صِـ', 'دْ', 'قْ']
        }
      },
      {
        id: 'val_parents',
        letter: '❤️',
        title: 'بر الوالدين وحب الأسرة',
        objective: 'شكر الوالدين على رعايتهما، طاعتهما بالمعروف، وإدخال السرور على قلوبهما.',
        duration: '26:10',
        videoChapters: [
          { time: '00:00', label: 'دعاء الوالدين الجميل' },
          { time: '07:30', label: 'كيف أساعد أمي وأبي في المنزل؟' },
          { time: '16:00', label: 'الحديث الشريف عن فضل الوالدين' },
          { time: '22:00', label: 'صنع بطاقة شكر للأم والأب' }
        ],
        parentGuide: {
          summary: 'بر الوالدين قيمة عملية تترجم في التحدث بأدب والمساعدة في ترتيب الغرفة والاعتراف بالجميل.',
          tips: [
            'علمه ترديد: "ربّ ارحمهما كما ربياني صغيراً".',
            'اشكره عندما يقدم لك كوب ماء أو يساعد في جمع ألعابه.'
          ]
        },
        pdfTitle: 'بطاقة إهداء للوالدين وأنشطة بر الأسرة',
        quizType: 'choice',
        question: 'كيف نظهر محبتنا وبرنا بوالدينا كل يوم؟',
        options: [
          { text: 'بالتحدث معهما بأدب ومساعدتهما في المنزل ❤️', correct: true, icon: '🤲' },
          { text: 'برفض كلامهما وعدم الاستماع إليهما ❌', correct: false, icon: '🚫' }
        ],
        interactiveBuilder: {
          targetWord: 'أُمِّي',
          syllables: ['أُ', 'مِّـ', 'ي', 'أَ', 'بـِ'],
          correctOrder: ['أُ', 'مِّـ', 'ي']
        }
      }
    ]
  },

  // 6. مسار مدارس اللغات — كونكت بلس (Connect Plus 1)
  connect_plus: {
    id: 'connect_plus',
    title: 'Connect Plus (لغات)',
    icon: '🌟',
    badge: 'مدارس اللغات والخاصة — المنهج المتقدم',
    color: '#7c3aed',
    grade: 'Primary 1 — Official Language Schools',
    track: 'languages',
    lessons: [
      {
        id: 'cp_senses',
        letter: 'Senses',
        title: 'Unit 1: All About Me — My Amazing Senses',
        objective: 'Learn sentences: "I see with my eyes", "I hear with my ears", phonics /s/ and /t/, and descriptive adjectives.',
        duration: '29:40',
        videoChapters: [
          { time: '00:00', label: 'Welcome & Song: Senses Everywhere' },
          { time: '06:10', label: 'Sentence Building: "I can see a..."' },
          { time: '15:20', label: 'Phonics: Letter S sound /s/ (Sun, Star, Seven)' },
          { time: '22:30', label: 'Connect Plus Activity Book Page 14' }
        ],
        parentGuide: {
          summary: 'منهج كونكت بلس يختلف عن كونكت العادي بكثافة الكلمات والتراكيب اللغوية الكاملة.',
          tips: [
            'كرر مع طفلك جملاً كاملة وليس مجرد كلمة مفردة: "I can see the blue sky".',
            'دعه يربط كل حاسة بعضوها الحقيقي أثناء الإشارة إلى وجهه.'
          ]
        },
        pdfTitle: 'Connect Plus 1 — Unit 1 Grammar & Phonics Advanced Sheet',
        quizType: 'choice',
        question: 'Complete the sentence: "I can hear birds singing with my _____"',
        options: [
          { text: 'Ears (أذني) 👂', correct: true, icon: '👂' },
          { text: 'Eyes (عيني) 👁️', correct: false, icon: '👁️' },
          { text: 'Nose (أنفي) 👃', correct: false, icon: '👃' }
        ],
        interactiveBuilder: {
          targetWord: 'STAR',
          syllables: ['S', 'T', 'A', 'R', 'P'],
          correctOrder: ['S', 'T', 'A', 'R']
        }
      },
      {
        id: 'cp_family',
        letter: 'Family',
        title: 'Unit 2: My Family & Our Community',
        objective: 'Describing family members (grandmother, cousin), occupations (teacher, doctor), and respectful conversations.',
        duration: '31:10',
        videoChapters: [
          { time: '00:00', label: 'Family Tree Exploration' },
          { time: '07:30', label: 'Jobs in our community' },
          { time: '17:00', label: 'Reading Comprehension: Meet Adam’s family' },
          { time: '24:00', label: 'Role-play with Teacher Sara' }
        ],
        parentGuide: {
          summary: 'الهدف إكساب الطفل طلاقة لغوية في التحدث عن أسرته ومجتمعه الصغير بثقة.',
          tips: [
            'اعرض عليه صور العائلة واطلب منه: "Tell me about your grandfather".'
          ]
        },
        pdfTitle: 'Connect Plus 1 — Family Tree & Occupations Practice',
        quizType: 'choice',
        question: 'Who helps us learn at school?',
        options: [
          { text: 'Teacher (المعلمة) 👩‍🏫', correct: true, icon: '👩‍🏫' },
          { text: 'Chef (الطاهي) 👨‍🍳', correct: false, icon: '👨‍🍳' },
          { text: 'Pilot (الطيار) 👨‍✈️', correct: false, icon: '👨‍✈️' }
        ],
        interactiveBuilder: {
          targetWord: 'FAMILY',
          syllables: ['FA', 'MI', 'LY', 'TO', 'GO'],
          correctOrder: ['FA', 'MI', 'LY']
        }
      }
    ]
  },

  // 7. الرياضيات باللغة الإنجليزية (Math in English for Languages)
  math_en: {
    id: 'math_en',
    title: 'Math (English)',
    icon: '📐',
    badge: 'Language Schools — Mathematics',
    color: '#0d9488',
    grade: 'Primary 1 — Egyptian National Curriculum (Languages)',
    track: 'languages',
    lessons: [
      {
        id: 'mathen_count_10',
        letter: '1-10',
        title: 'Numbers 1 to 10: Counting & Place Value Intro',
        objective: 'Count forward & backward, write number names (One, Two, Three), and compare sets.',
        duration: '28:10',
        videoChapters: [
          { time: '00:00', label: 'Number Chant 1 to 10' },
          { time: '06:00', label: 'Counting dots on ten-frame' },
          { time: '14:30', label: 'Writing number names: O-N-E, T-W-O' },
          { time: '21:00', label: 'Hands-on practice' }
        ],
        parentGuide: {
          summary: 'في مدارس اللغات يتعلم الطفل كتابة اسم الرقم بالإنجليزية (Word form) بجانب الرمز الرقمي.',
          tips: [
            'التركيز على تهجئة: ONE, TWO, THREE, FOUR, FIVE.',
            'استخدم إطار العشر خانات (Ten-frame) لتثبيت الكميات بصرياً.'
          ]
        },
        pdfTitle: 'Math Primary 1 — Ten-Frame & Number Words 1 to 10',
        quizType: 'choice',
        question: 'How many apples are there: 🍎 🍎 🍎 🍎 ?',
        options: [
          { text: '4 (Four)', correct: true, icon: '🍎' },
          { text: '3 (Three)', correct: false, icon: '🍏' },
          { text: '5 (Five)', correct: false, icon: '🍐' }
        ],
        interactiveBuilder: {
          targetWord: 'FOUR',
          syllables: ['F', 'OU', 'R', 'T', 'W'],
          correctOrder: ['F', 'OU', 'R']
        }
      },
      {
        id: 'mathen_compare',
        letter: '><',
        title: 'Comparing Numbers: Greater Than, Less Than, Equal',
        objective: 'Master comparison symbols (> , < , =) with English math vocabulary and word problems.',
        duration: '30:00',
        videoChapters: [
          { time: '00:00', label: 'Hungry Alligator Story' },
          { time: '08:00', label: 'Comparing 7 and 3' },
          { time: '16:00', label: 'Equal sets (=)' },
          { time: '23:00', label: 'Timed flashcard challenge' }
        ],
        parentGuide: {
          summary: 'تأكد من أن الطفل يقرأ العبارة من اليسار إلى اليمين بالإنجليزية: "Seven is greater than three".',
          tips: [
            '7 > 3 تُقرأ: 7 is greater than 3.',
            '2 < 6 تُقرأ: 2 is less than 6.'
          ]
        },
        pdfTitle: 'Math Primary 1 — Greater than & Less than Worksheets',
        quizType: 'choice',
        question: 'Which statement is correct for: 8 ... 4 ?',
        options: [
          { text: '8 > 4 (Greater than)', correct: true, icon: '🐊' },
          { text: '8 < 4 (Less than)', correct: false, icon: '❌' },
          { text: '8 = 4 (Equal to)', correct: false, icon: '➖' }
        ],
        interactiveBuilder: {
          targetWord: '8 > 4',
          syllables: ['8', '>', '4', '<', '='],
          correctOrder: ['8', '>', '4']
        }
      }
    ]
  },

  // 8. تكنولوجيا المعلومات والاتصالات (ICT & Future Skills)
  ict: {
    id: 'ict',
    title: 'تكنولوجيا المعلومات (ICT)',
    icon: '💻',
    badge: 'المهارات الرقمية وأمان الطفل',
    color: '#4f46e5',
    grade: 'الصف الأول الابتدائي (منظومة التعليم الجديد 2.0)',
    track: 'general',
    lessons: [
      {
        id: 'ict_basics',
        letter: '💻',
        title: 'أجزاء الحاسوب واستخدام الفأرة ولوحة المفاتيح',
        objective: 'التعرف على الشاشة، الفأرة، لوحة المفاتيح، وكيفية استخدام التقنية بأمان واعتدال.',
        duration: '24:50',
        videoChapters: [
          { time: '00:00', label: 'قصة صديقنا الكمبيوتر الذكي' },
          { time: '05:30', label: 'الشاشة والفأرة: كيف نضغط ونتحكم؟' },
          { time: '13:00', label: 'قواعد الأمان: لا نشارك كلمة المرور مع الغرباء' },
          { time: '19:00', label: 'لعبة توجيه المؤشر للشارة' }
        ],
        parentGuide: {
          summary: 'الهدف توعية الطفل بأن الأجهزة أدوات للإبداع والتعلم وليست مجرد ألعاب إدمانية.',
          tips: [
            'حدد مع طفلك وقتاً محدداً للشاشات (ساعة يومياً للتعلم).',
            'علمه ألا يضغط على أي رابط غريب يظهر على الشاشة دون استشارتك.'
          ]
        },
        pdfTitle: 'ورقة عمل أجزاء الكمبيوتر والأمان الرقمي للطفل',
        quizType: 'choice',
        question: 'ما هو الجزء الذي نستخدمه لتحريك المؤشر والضغط على الأشياء في الشاشة؟',
        options: [
          { text: 'الفأرة (الماوس) 🖱️', correct: true, icon: '🖱️' },
          { text: 'السماعات 🎧', correct: false, icon: '🎧' },
          { text: 'الطابعة 🖨️', correct: false, icon: '🖨️' }
        ],
        interactiveBuilder: {
          targetWord: 'حَاسُوبْ',
          syllables: ['حـَ', 'ا', 'سُـ', 'و', 'بْ'],
          correctOrder: ['حـَ', 'ا', 'سُـ', 'و', 'بْ']
        }
      },
      {
        id: 'ict_logic',
        letter: '🤖',
        title: 'التفكير المنطقي وخطوات حل المشكلات (مقدمة البرمجة)',
        objective: 'فهم مفهوم الخوارزمية (الخطوات المرتبة): خطوة للأمام، انعطاف يميناً، للوصول للهدف.',
        duration: '26:15',
        videoChapters: [
          { time: '00:00', label: 'لعبة الروبوت الذي ينفذ الأوامر' },
          { time: '07:00', label: 'ترتيب خطوات تحضير وجبة خفيفة' },
          { time: '15:30', label: 'متاهة الأسهم والاتجاهات' },
          { time: '21:00', label: 'تحدي الطلاب في رسم المسار' }
        ],
        parentGuide: {
          summary: 'البرمجة للأطفال في هذا السن هي تدريب عقلي على التفكير المنطقي وترتيب الخطوات.',
          tips: [
            'العب معه لعبة: "أنت الروبوت وأنا المبرمج، امش خطوتين للأمام ثم التفت يميناً".'
          ]
        },
        pdfTitle: 'كتيب خوارزميات الأطفال ومتاهات التفكير المنطقي',
        quizType: 'choice',
        question: 'إذا أردنا الوصول للكنز، ما هو الترتيب الصحيح؟',
        options: [
          { text: 'خطوتان للأمام ثم انعطاف لليمين ➡️', correct: true, icon: '🧭' },
          { text: 'القفز دون تفكير ❌', correct: false, icon: '🚫' }
        ],
        interactiveBuilder: {
          targetWord: 'أَمْرْ',
          syllables: ['أَ', 'مْ', 'رْ', 'سـَ', 'بـِ'],
          correctOrder: ['أَ', 'مْ', 'رْ']
        }
      }
    ]
  },

  // 9. معالم وتاريخ مصر (الدراسات الاجتماعية والهوية الوطنية)
  social: {
    id: 'social',
    title: 'معالم وتاريخ مصر (الهوية)',
    icon: '🇪🇬',
    badge: 'أبنائنا في الخارج — ربط الطفل بالوطن',
    color: '#b91c1c',
    grade: 'الصف الأول الابتدائي (برنامج الهوية المصرية المعتمد)',
    track: 'identity',
    lessons: [
      {
        id: 'soc_nile',
        letter: '🏞️',
        title: 'نهر النيل العظيم وخريطة وطني مصر',
        objective: 'التعرف على موقع مصر، عاصمتها القاهرة، ونهر النيل كشريان للحياة والزراعة والحضارة.',
        duration: '27:00',
        videoChapters: [
          { time: '00:00', label: 'أغنية يا حبيبتي يا مصر والترحيب' },
          { time: '05:00', label: 'خريطة مصر: أين يقع نهر النيل والبحرين؟' },
          { time: '14:00', label: 'لماذا نحافظ على مياه النيل نظيفة؟' },
          { time: '20:30', label: 'رسم علم مصر بألوانه الثلاثة والنسر' }
        ],
        parentGuide: {
          summary: 'أطفال المغتربين يشعرون بالفخر الشديد عندما يتعرفون على معالم بلدهم وجمال طبيعتها.',
          tips: [
            'علّق خريطة مصر في غرفة طفلك واجعله يشير لمحافظة العائلة الأصلية.',
            'اسأله: ما هي ألوان علم مصر؟ (أحمر، أبيض به نسر صلاح الدين الذهبي، أسود).'
          ]
        },
        pdfTitle: 'أطلس مصر المصور للأطفال — تلوين الخريطة والعلم ومعالم النيل',
        quizType: 'choice',
        question: 'ما هو النهر العظيم الذي يجري في مصر ويسقي الأراضي والزرع؟',
        options: [
          { text: 'نهر النيل العظيم 🌊', correct: true, icon: '⛵' },
          { text: 'نهر الأمازون', correct: false, icon: '🌴' },
          { text: 'البحر الميت', correct: false, icon: '🌊' }
        ],
        interactiveBuilder: {
          targetWord: 'مِصْرْ',
          syllables: ['مِـ', 'صْ', 'رْ', 'نـَ', 'يـْ'],
          correctOrder: ['مِـ', 'صْ', 'رْ']
        }
      },
      {
        id: 'soc_pyramids',
        letter: '🏛️',
        title: 'الأهرامات والمتحف المصري الكبير',
        objective: 'التعرف على أهرامات الجيزة الثلاثة (خوفو، خفرع، منقرع) وأعظم متاحف العالم في مصر.',
        duration: '28:50',
        videoChapters: [
          { time: '00:00', label: 'رحلة افتراضية 3D إلى هضبة الجيزة' },
          { time: '08:00', label: 'كيف بنى المصريون القدماء أعظم عجائب العالم؟' },
          { time: '16:30', label: 'كنوز الملك توت عنخ آمون والمتحف الكبير' },
          { time: '23:00', label: 'صنع مجسم هرم كرتوني مع المعلمة' }
        ],
        parentGuide: {
          summary: 'الربط الحضاري يبني عزة نفس وهوية راسخة للطفل في مجتمعه الأجنبي.',
          tips: [
            'شاهد معه جولة افتراضية للمتحف المصري الكبير على يوتيوب.',
            'شجعه على أن يحكي لزملائه في المدرسة عن أهرامات مصر العظيمة.'
          ]
        },
        pdfTitle: 'ملف أنشطة الأهرامات والآثار المصرية — تلوين وتركيب مجسمات',
        quizType: 'choice',
        question: 'أين توجد الأهرامات الثلاثة الشهيرة وتمثال أبو الهول؟',
        options: [
          { text: 'في الجيزة بمصر 🇪🇬', correct: true, icon: '🏛️' },
          { text: 'في لندن', correct: false, icon: '🌧️' },
          { text: 'في باريس', correct: false, icon: '🗼' }
        ],
        interactiveBuilder: {
          targetWord: 'هَرَمْ',
          syllables: ['هـَ', 'رَ', 'مْ', 'قـَ', 'لْ'],
          correctOrder: ['هـَ', 'رَ', 'مْ']
        }
      }
    ]
  },

  // 10. المهارات المهنية والحياتية (Life & Vocational Skills)
  life_skills: {
    id: 'life_skills',
    title: 'المهارات المهنية والحياتية',
    icon: '🛠️',
    badge: 'الاعتماد على النفس والابتكار العملي',
    color: '#ea580c',
    grade: 'الصف الأول الابتدائي (المنهج الوزاري الحديث)',
    track: 'general',
    lessons: [
      {
        id: 'skill_health',
        letter: '🥗',
        title: 'وجبتي الصحية والترتيب الشخصي',
        objective: 'التمييز بين الطعام الصحي والمضر، ترتيب الأدوات المدرسية، وغسل اليدين بطريقة صحيحة.',
        duration: '25:10',
        videoChapters: [
          { time: '00:00', label: 'طبق الفواكه والخضار الملون' },
          { time: '06:00', label: 'لماذا نتجنب السكريات والمشروبات الغازية؟' },
          { time: '14:00', label: 'كيف أرتب حقيبتي المدرسية وحدي؟' },
          { time: '20:00', label: 'تحدي النظافة الشخصية اليومي' }
        ],
        parentGuide: {
          summary: 'المهارات الحياتية تصنع طفلاً مستقلاً قادراً على تحمل المسؤولية تدريجياً.',
          tips: [
            'اجعل طفلك يجهز صندوق طعامه (Lunch box) معك في المساء.',
            'امدح مبادرته عندما يعيد حذاءه أو معطفه إلى مكانه المخصص.'
          ]
        },
        pdfTitle: 'جدول العادات الصحية وترتيب الغرفة للأطفال — ملصقات للمتابعة',
        quizType: 'choice',
        question: 'أي من الوجبات التالية يعطي أجسامنا القوة والنشاط للدراسة؟',
        options: [
          { text: 'التفاح والحليب والبيض 🍎🥛', correct: true, icon: '🍎' },
          { text: 'رقائق الشيبس والمشروبات الغازية ❌', correct: false, icon: '🚫' },
          { text: 'الحلوى الكثيرة الملونة ❌', correct: false, icon: '🚫' }
        ],
        interactiveBuilder: {
          targetWord: 'صِحَّة',
          syllables: ['صِـ', 'حَّـ', 'ة', 'مـَ', 'رَ'],
          correctOrder: ['صِـ', 'حَّـ', 'ة']
        }
      }
    ]
  },

  // 11. التربية الإسلامية والقرآن الكريم (Islamic Religion & Quran)
  islamic_religion: {
    id: 'islamic_religion',
    title: 'التربية الإسلامية والقرآن',
    icon: '🕋',
    badge: 'تلاوة القرآن والعقيدة والآداب النبوية',
    color: '#16a34a',
    grade: 'الصف الأول الابتدائي (المنهج المصري الوزاري)',
    track: 'religion',
    lessons: [
      {
        id: 'isl_fatiha',
        letter: '📖',
        title: 'سورة الفاتحة وتلاوتها الصحيحة وآداب المسلم',
        objective: 'حفظ سورة الفاتحة بأحكام التجويد المبسطة، فهم معنى "الحمد لله"، وتعلم آداب العطاس والأكل.',
        duration: '28:00',
        videoChapters: [
          { time: '00:00', label: 'تلاوة سورة الفاتحة بصوت الشيخ الصغير' },
          { time: '06:30', label: 'ترديد الآيات كلمة بكلمة مع التجويد' },
          { time: '15:00', label: 'معنى "الرحمن الرحيم" و "إياك نعبد"' },
          { time: '21:30', label: 'الحديث الشريف: "يا غلام سَمِّ الله وكُل بيمينك"' }
        ],
        parentGuide: {
          summary: 'سورة الفاتحة هي ركن الصلاة اليومي؛ تثبيتها في الصغر بأحكام صحيحة يدوم طوال العمر.',
          tips: [
            'صلِّ مع طفلك واجعله يقف بجانبك ويردد الفاتحة بهدوء.',
            'علمه أن يقول: "بسم الله" قبل الأكل و"الحمد لله" عند الانتهاء.'
          ]
        },
        pdfTitle: 'مصحف الطفل — سورة الفاتحة بالتلوين وأذكار اليوم والليلة',
        quizType: 'choice',
        question: 'ماذا نقول باللسان قبل أن نبدأ في تناول الطعام؟',
        options: [
          { text: 'بِسْمِ اللهِ الرَّحْمَنِ الرَّحِيمِ 🤲', correct: true, icon: '✨' },
          { text: 'الحمد لله ❌', correct: false, icon: '🚫' },
          { text: 'لا نقول شيئاً ❌', correct: false, icon: '🚫' }
        ],
        interactiveBuilder: {
          targetWord: 'نُورْ',
          syllables: ['نُـ', 'و', 'رْ', 'ظـِ', 'لْ'],
          correctOrder: ['نُـ', 'و', 'رْ']
        }
      }
    ]
  },

  // 12. التربية الدينية المسيحية (Christian Religion & Values)
  christian_religion: {
    id: 'christian_religion',
    title: 'التربية المسيحية (لأبنائنا في الخارج)',
    icon: '✝️',
    badge: 'المحبة والسلام والعطاء الإنساني',
    color: '#b45309',
    grade: 'الصف الأول الابتدائي (المنهج المصري الوزاري)',
    track: 'religion',
    lessons: [
      {
        id: 'chr_love',
        letter: '🕊️',
        title: 'الله محبة: العطاء ومساعدة الآخرين',
        objective: 'ترسيخ فضيلة المحبة غير المشروطة، شكر الله على نعمه، ومساعدة الضعيف والمحتاج.',
        duration: '26:00',
        videoChapters: [
          { time: '00:00', label: 'ترنيمة المحبة والسلام' },
          { time: '06:30', label: 'قصة السامري الصالح ومساعدة الجريح' },
          { time: '15:00', label: 'كيف نكون صانعي سلام في بيتنا ومدرستنا؟' },
          { time: '21:00', label: 'نشاط تلوين شجرة المحبة' }
        ],
        parentGuide: {
          summary: 'المنهج يؤكد على قيم السلام والمحبة والأمانة في التعامل مع كل الناس.',
          tips: [
            'علم طفلك الصلاة البسيطة والشكر لله في الصباح والمساء.',
            'شجعه على مشاركة ألعابه وحلوته مع أصدقائه.'
          ]
        },
        pdfTitle: 'كراسة أنشطة التربية المسيحية — قصص المحبة ورسوم التلوين',
        quizType: 'choice',
        question: 'ماذا فعل السامري الصالح عندما رأى شخصاً محتاجاً للمساعدة؟',
        options: [
          { text: 'ساعده وعالجه برحمة ومحبة ❤️', correct: true, icon: '🕊️' },
          { text: 'تركه ومشى بعيداً عنه ❌', correct: false, icon: '🚫' }
        ],
        interactiveBuilder: {
          targetWord: 'مَحَبَّة',
          syllables: ['مـَ', 'حـَ', 'بَّـ', 'ة', 'كـُ'],
          correctOrder: ['مـَ', 'حـَ', 'بَّـ', 'ة']
        }
      }
    ]
  },

  // 13. تأسيس نور البيان والخط العربي (Arabic Phonics & Penmanship)
  phonics_arabic: {
    id: 'phonics_arabic',
    title: 'نور البيان والخط العربي',
    icon: '✍️',
    badge: 'علاج ضعف القراءة لأبناء المغتربين',
    color: '#be185d',
    grade: 'مسار التأسيس المكثف — جميع الصفوف الأولى',
    track: 'identity',
    lessons: [
      {
        id: 'ph_fast_reading',
        letter: 'نور',
        title: 'التهجي السريع وقاعدة الفتح (نور البيان)',
        objective: 'الدمج الصوتي السريع لثلاثة أحرف مفتوحة (كَتَبَ، زَرَعَ، حَصَدَ) دون تقطيع أو تردد.',
        duration: '27:45',
        videoChapters: [
          { time: '00:00', label: 'سرعة الربط الصوتي بين الحروف' },
          { time: '06:00', label: 'قراءة كلمة: زَ - رَ - عَ = زَرَعَ' },
          { time: '14:30', label: 'قراءة جملة قصيرة: زَرَعَ وَحَصَدَ' },
          { time: '21:00', label: 'تمرين خط النسخ بالقلم' }
        ],
        parentGuide: {
          summary: 'طريقة نور البيان هي الأسرع عالمياً في تمكين طفل المغترب من القراءة بطلاقة خلال أسابيع.',
          tips: [
            'لا تجعله يتهجى في سره؛ شجعه على نطق الصوت بسرعة مع وصل الحرف بالحرف التالي.',
            '10 دقائق تدريب يومي بنور البيان تعادل ساعتين من التعليم التقليدي.'
          ]
        },
        pdfTitle: 'مذكرة نور البيان المكثفة لأبناء المغتربين — تهجي وخط النسخ',
        quizType: 'choice',
        question: 'عند دمج أصوات: ( قَـ ) + ( رَ ) + ( أَن ) ينتج الفعل:',
        options: [
          { text: 'قَرَأَ 📖', correct: true, icon: '📖' },
          { text: 'كَتَبَ ✍️', correct: false, icon: '✍️' },
          { text: 'رَسَمَ 🎨', correct: false, icon: '🎨' }
        ],
        interactiveBuilder: {
          targetWord: 'كَتَبَ',
          syllables: ['كَـ', 'تَـ', 'بَ', 'سـَ', 'لَ'],
          correctOrder: ['كَـ', 'تَـ', 'بَ']
        }
      }
    ]
  },

  // التقويم الوزاري الرسمي لأبنائنا بالخارج (وزارة التربية والتعليم المصرية)
  expatExamCalendar: [
    {
      stage: 'تسجيل استمارة التقدم للامتحانات',
      period: 'نوفمبر — ديسمبر 2026',
      status: 'قريباً',
      details: 'التسجيل الإلكتروني عبر منصة أبنائنا في الخارج الرسمية وسداد الرسوم بالسفارة/القنصلية.',
      officialNote: 'فاهم توفر ملفات التقييم وأوراق العمل المعتمدة لتجهيز ملف الأنشطة المطلوب للوزارة.'
    },
    {
      stage: 'امتحانات الفصل الدراسي الأول الإلكترونية',
      period: 'يناير 2027',
      status: 'مجدول',
      details: 'أداء التقييمات الإلكترونية للصف الأول الابتدائي من المنزل عبر المنصة الرسمية للوزارة في جميع المواد (عربي، رياضيات، إنجليزي، اكتشف، دين).',
      officialNote: 'تجري منصة فاهم نماذج امتحانات محاكية متطابقة قبل موعد الامتحان بأسبوعين.'
    },
    {
      stage: 'امتحانات نهاية العام الدراسي (الفصل الثاني)',
      period: 'مايو 2027',
      status: 'مجدول',
      details: 'الامتحانات الختامية واستخراج الشهادات الرسمية من وزارة التربية والتعليم المصرية.'
    }
  ]
};

