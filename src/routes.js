// خريطة الشاشات ↔ المسارات — مصدر الحقيقة للتنقل
export const SCREEN_PATHS = {
  landing: '/',
  parent: '/parent',
  child: '/child',
  teacher: '/teacher',
  admin: '/admin',
  exam: '/exam',
  onboarding: '/onboarding',
  pricing: '/pricing',
  account: '/account'
};

export const PATH_TO_SCREEN = Object.fromEntries(
  Object.entries(SCREEN_PATHS).map(([screen, path]) => [path, screen])
);

// عناوين ووصف لكل شاشة — تُحقن ديناميكياً في <head> (SEO)
export const SCREEN_META = {
  landing: {
    title: 'فاهم — منصة التعليم الحي والمتقن لأبنائنا بالخارج',
    description: 'المنهج المصري للمرحلة الابتدائية بحصص مباشرة ومسجلة واختبارات إتقان متكررة — للأسر المصرية في الخليج وأوروبا.'
  },
  pricing: {
    title: 'الباقات والأسعار — منصة فاهم',
    description: 'باقات اشتراك مرنة للأسر: حصص مباشرة، منهج مسجل، ومتابعة ولي أمر أسبوعية.'
  },
  onboarding: {
    title: 'تسجيل الأسر — منصة فاهم',
    description: 'سجّل أسرتك وأضف أبناءك وابدأ رحلة إتقان المنهج المصري من أي مكان في العالم.'
  },
  exam: {
    title: 'محاكي امتحانات أبنائنا في الخارج — منصة فاهم',
    description: 'اختبار تدريبي غير رسمي يحاكي نمط امتحانات وزارة التربية والتعليم المصرية لأبنائنا في الخارج.'
  },
  parent: { title: 'لوحة ولي الأمر — منصة فاهم' },
  child: { title: 'مساحة الطفل — منصة فاهم' },
  teacher: { title: 'مساحة المعلم — منصة فاهم' },
  admin: { title: 'الإدارة — منصة فاهم' },
  account: { title: 'حسابي — منصة فاهم' }
};
