/**
 * i18n.js
 * نظام الترجمة البسيط
 */

export const LANGUAGES = {
  ar: { name: 'العربية', dir: 'rtl', flag: '🇸🇦' },
  en: { name: 'English', dir: 'ltr', flag: '🇺🇸' }
};

export const DEFAULT_LANG = 'ar';

// ==============================
// الترجمات
// ==============================
const translations = {
  ar: {
    // Navigation
    'nav.home': 'الرئيسية',
    'nav.subjects': 'المواد',
    'nav.progress': 'تقدمي',
    'nav.profile': 'حسابي',
    'nav.parent': 'لوحة الأهل',
    'nav.admin': 'الإدارة',
    
    // Common
    'common.loading': 'جاري التحميل...',
    'common.error': 'حدث خطأ',
    'common.retry': 'إعادة المحاولة',
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.edit': 'تعديل',
    'common.delete': 'حذف',
    'common.confirm': 'تأكيد',
    'common.back': 'رجوع',
    'common.next': 'التالي',
    'common.finish': 'إنهاء',
    'common.search': 'بحث',
    'common.noResults': 'لا توجد نتائج',
    
    // Auth
    'auth.login': 'تسجيل الدخول',
    'auth.logout': 'تسجيل الخروج',
    'auth.email': 'البريد الإلكتروني',
    'auth.password': 'كلمة المرور',
    'auth.forgotPassword': 'نسيت كلمة المرور؟',
    'auth.register': 'إنشاء حساب',
    
    // Dashboard
    'dashboard.welcome': 'مرحباً',
    'dashboard.todayProgress': 'تقدم اليوم',
    'dashboard.streak': 'أيام متتالية',
    'dashboard.totalXP': 'مجموع النقاط',
    'dashboard.lessonsCompleted': 'دروس مكتملة',
    
    // Child
    'child.startLesson': 'ابدأ الدرس',
    'child.continueLesson': 'أكمل الدرس',
    'child.lessonComplete': 'أحسنت! أكملت الدرس',
    'child.earnedXP': 'حصلت على {xp} نقطة!',
    'child.newBadge': 'حصلت على شارة جديدة!',
    
    // Parent
    'parent.children': 'الأطفال',
    'parent.addChild': 'إضافة طفل',
    'parent.weeklyReport': 'التقرير الأسبوعي',
    'parent.downloadPDF': 'تحميل PDF',
    
    // Subjects
    'subject.arabic': 'اللغة العربية',
    'subject.math': 'الرياضيات',
    'subject.science': 'العلوم',
    'subject.english': 'اللغة الإنجليزية',
    'subject.religion': 'التربية الدينية',
    'subject.social': 'الدراسات الاجتماعية',
    
    // Gamification
    'xp.points': 'نقطة',
    'streak.days': 'يوم',
    'badge.earned': 'حصلت عليها!',
    'badge.locked': 'مقفلة',
    
    // Settings
    'settings.title': 'الإعدادات',
    'settings.language': 'اللغة',
    'settings.theme': 'المظهر',
    'settings.darkMode': 'الوضع الليلي',
    'settings.notifications': 'الإشعارات',
    'settings.sound': 'الأصوات'
  },
  
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.subjects': 'Subjects',
    'nav.progress': 'Progress',
    'nav.profile': 'Profile',
    'nav.parent': 'Parent Dashboard',
    'nav.admin': 'Admin',
    
    // Common
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.retry': 'Retry',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.confirm': 'Confirm',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.finish': 'Finish',
    'common.search': 'Search',
    'common.noResults': 'No results',
    
    // Auth
    'auth.login': 'Login',
    'auth.logout': 'Logout',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.forgotPassword': 'Forgot password?',
    'auth.register': 'Create account',
    
    // Dashboard
    'dashboard.welcome': 'Welcome',
    'dashboard.todayProgress': "Today's Progress",
    'dashboard.streak': 'Day Streak',
    'dashboard.totalXP': 'Total XP',
    'dashboard.lessonsCompleted': 'Lessons Completed',
    
    // Child
    'child.startLesson': 'Start Lesson',
    'child.continueLesson': 'Continue Lesson',
    'child.lessonComplete': 'Great job! Lesson complete',
    'child.earnedXP': 'You earned {xp} points!',
    'child.newBadge': 'You earned a new badge!',
    
    // Parent
    'parent.children': 'Children',
    'parent.addChild': 'Add Child',
    'parent.weeklyReport': 'Weekly Report',
    'parent.downloadPDF': 'Download PDF',
    
    // Subjects
    'subject.arabic': 'Arabic',
    'subject.math': 'Mathematics',
    'subject.science': 'Science',
    'subject.english': 'English',
    'subject.religion': 'Religious Studies',
    'subject.social': 'Social Studies',
    
    // Gamification
    'xp.points': 'points',
    'streak.days': 'days',
    'badge.earned': 'Earned!',
    'badge.locked': 'Locked',
    
    // Settings
    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.theme': 'Theme',
    'settings.darkMode': 'Dark Mode',
    'settings.notifications': 'Notifications',
    'settings.sound': 'Sounds'
  }
};

/**
 * Get translation
 * @param {string} key - Translation key (e.g., 'nav.home')
 * @param {string} lang - Language code (ar, en)
 * @param {object} params - Interpolation params (e.g., {xp: 50})
 */
export function t(key, lang = DEFAULT_LANG, params = {}) {
  const langTranslations = translations[lang] || translations[DEFAULT_LANG];
  let text = langTranslations[key] || translations[DEFAULT_LANG][key] || key;
  
  // Interpolate params: {xp} -> 50
  Object.entries(params).forEach(([k, v]) => {
    text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  });
  
  return text;
}

/**
 * Get all translations for a language
 */
export function getTranslations(lang = DEFAULT_LANG) {
  return translations[lang] || translations[DEFAULT_LANG];
}

/**
 * Check if RTL
 */
export function isRTL(lang) {
  return LANGUAGES[lang]?.dir === 'rtl';
}

export default { t, LANGUAGES, DEFAULT_LANG, getTranslations, isRTL };
