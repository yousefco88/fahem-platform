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
  account: '/account',
  'ai-tutor': '/ai-tutor',
  analytics: '/analytics'
};

export const PATH_TO_SCREEN = Object.fromEntries(
  Object.entries(SCREEN_PATHS).map(([screen, path]) => [path, screen])
);

// يحل الشاشة من المسار بما فيها المسارات الفرعية (/child/lesson/x → child)
export function screenFromPath(pathname = '/') {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (PATH_TO_SCREEN[clean]) return PATH_TO_SCREEN[clean];
  const prefix = '/' + (clean.split('/')[1] || '');
  return PATH_TO_SCREEN[prefix] || null;
}

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
  account: { title: 'مساحتي — منصة فاهم' },
  'ai-tutor': { title: 'مساعد التدريب — منصة فاهم', description: 'مساعد تشجيعي بسيط للطفل (ردود جاهزة، ليس ذكاءً اصطناعياً بعد).' },
  lessons: { title: 'الدروس المسجلة — منصة فاهم', description: 'مكتبة الدروس المسجلة لجميع المواد والمراحل.' },
  analytics: { title: 'لوحة التحليلات — منصة فاهم', description: 'إحصائيات وتحليلات أداء المنصة والطلاب.' }
};
