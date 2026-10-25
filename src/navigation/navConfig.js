// مصدر واحد للتنقل حسب الدور — يستخدمه RoleBar (ويب) و BottomNav (جوال).
// كل id هنا شاشة موجودة فعلاً في src/routes.js.
// لا تضف شاشة غير مسجّلة في routes.js.

const ITEM = {
  landing: { id: 'landing', icon: '🏠', label: 'الرئيسية' },
  pricing: { id: 'pricing', icon: '💳', label: 'اشتراكي' },
  onboarding: { id: 'onboarding', icon: '📋', label: 'التسجيل' },
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
    primary: [ITEM.landing, ITEM.pricing, mySpace('دخول')],
    more: [ITEM.onboarding, ITEM.aiTutor]
  },
  parent: {
    primary: [ITEM.landing, ITEM.child, ITEM.parent, mySpace()],
    more: [ITEM.aiTutor, ITEM.pricing]
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
    more: [ITEM.teacher, ITEM.parent, ITEM.child, ITEM.pricing]
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

// أقسام لوحة الإدارة — تظهر في القائمة الجانبية (ويب) وقائمة الأقسام (جوال).
// roles = من يحق له رؤية القسم؛ ما لم يُذكر دوره لا يراه (الخادم يفرض الصلاحيات فعلياً عبر RLS).
export const ADMIN_SECTIONS = [
  { id: 'curriculum', icon: '📚', label: 'إدارة المناهج', roles: ['admin', 'content_editor'] },
  { id: 'settings', icon: '⚙️', label: 'إعدادات الموقع', roles: ['admin'] },
  { id: 'recordings', icon: '🎥', label: 'مراجعة تسجيلات الحصص', roles: ['admin'] },
  { id: 'bookings', icon: '📋', label: 'حجوزات الحصص التجريبية', roles: ['admin'] },
  { id: 'families', icon: '👨‍👩‍👧‍👦', label: 'حسابات الأسر', roles: ['admin'] },
  { id: 'schedule', icon: '🗓️', label: 'الجدول الأسبوعي', roles: ['admin'] },
  { id: 'rbac', icon: '👥', label: 'المستخدمون والصلاحيات', roles: ['admin'] },
  { id: 'audit', icon: '🛡️', label: 'سجل التدقيق', roles: ['admin'] },
  { id: 'subscriptions', icon: '💳', label: 'الاشتراكات', roles: ['admin'] },
  { id: 'analytics', icon: '📊', label: 'لوحة التحليلات', roles: ['admin'], path: '/analytics' }
];

export const adminSectionsForRole = (role) => ADMIN_SECTIONS.filter(s => s.roles.includes(role));

export const adminSectionPath = (s) =>
  s.path || (s.id === 'curriculum' ? '/admin' : `/admin?tab=${s.id}`);
