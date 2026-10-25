// مصدر واحد للتنقل حسب الدور — يستخدمه RoleBar (ويب) و BottomNav (جوال).
// كل id هنا شاشة موجودة فعلاً في src/routes.js.
// لا تضف شاشة غير مسجّلة في routes.js.

const ITEM = {
  landing: { id: 'landing', icon: '🏠', label: 'الرئيسية' },
  pricing: { id: 'pricing', icon: '💳', label: 'اشتراكي' },
  onboarding: { id: 'onboarding', icon: '📋', label: 'التسجيل' },
  exam: { id: 'exam', icon: '🇪🇬', label: 'محاكي الامتحانات', variant: 'exam' },
  parent: { id: 'parent', icon: '👨‍👩‍👦', label: 'ولي الأمر' },
  child: { id: 'child', icon: '🎓', label: 'التعلّم', variant: 'child' },
  aiTutor: { id: 'ai-tutor', icon: '🤖', label: 'المعلم الذكي' },
  teacher: { id: 'teacher', icon: '👩‍🏫', label: 'مساحة المعلم', variant: 'teacher' },
  admin: { id: 'admin', icon: '⚙️', label: 'الإدارة', variant: 'admin' },
  analytics: { id: 'analytics', icon: '📊', label: 'التحليلات' }
};

const mySpace = (label = 'مساحتي') => ({ id: 'account', icon: '👤', label });

// primary = الشريط السفلي في الجوال (4 + "المزيد") وكل عناصر الويب
// more    = قائمة "المزيد" في الجوال وبقية عناصر الويب
export const NAV_BY_ROLE = {
  guest: {
    primary: [ITEM.landing, ITEM.pricing, ITEM.exam, mySpace('دخول')],
    more: [ITEM.onboarding, ITEM.aiTutor]
  },
  parent: {
    primary: [ITEM.landing, ITEM.child, ITEM.parent, mySpace()],
    more: [ITEM.exam, ITEM.aiTutor, ITEM.pricing]
  },
  teacher: {
    primary: [ITEM.landing, ITEM.teacher, mySpace()],
    more: [ITEM.child, ITEM.aiTutor]
  },
  content_editor: {
    primary: [ITEM.landing, ITEM.admin, mySpace()],
    more: [ITEM.child]
  },
  admin: {
    primary: [ITEM.landing, ITEM.admin, ITEM.analytics, mySpace()],
    more: [ITEM.teacher, ITEM.parent, ITEM.child, ITEM.exam, ITEM.pricing]
  }
};

export const ROLE_LABELS = {
  guest: 'زائر',
  parent: 'ولي أمر',
  teacher: 'معلم',
  content_editor: 'محرر محتوى',
  admin: 'إدارة'
};

// guest = غير مسجّل. مسجّل بلا صف في profiles ⇒ يُعامل كولي أمر (الدور الافتراضي).
export function resolveNavRole(user, role) {
  if (!user) return 'guest';
  return NAV_BY_ROLE[role] ? role : 'parent';
}

export function getNavForRole(navRole) {
  return NAV_BY_ROLE[navRole] || NAV_BY_ROLE.guest;
}
