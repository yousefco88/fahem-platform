// مصدر واحد للتنقل حسب الدور — يستخدمه RoleBar (ويب) و BottomNav (جوال).
// كل id هنا شاشة موجودة فعلاً في src/routes.js.
// لا تضف شاشة غير مسجّلة في routes.js.

const ITEM = {
  landing: { id: 'landing', icon: '🏠', label: 'الرئيسية' },
  pricing: { id: 'pricing', icon: '💳', label: 'خطط الاشتراكات' },
  parent: { id: 'parent', icon: '👨‍👩‍👦', label: 'ولي الأمر' },
  child: { id: 'child', icon: '🎓', label: 'التعلّم', variant: 'child' },
  aiTutor: { id: 'ai-tutor', icon: '🤖', label: 'مساعد التدريب', short: 'المساعد' },
  teacher: { id: 'teacher', icon: '👩‍🏫', label: 'مساحة المعلم', variant: 'teacher' },
  admin: { id: 'admin', icon: '⚙️', label: 'الإدارة', variant: 'admin' },
  analytics: { id: 'analytics', icon: '📊', label: 'التحليلات' }
};

const mySpace = (label = 'مساحتي') => ({ id: 'account', icon: '👤', label });

// primary = عناصر الويب الأساسية | more = بقية عناصر الويب
// mobile  = الشريط السفلي في الجوال: كل التبويبات ظاهرة (حتى 5) بلا قائمة "المزيد"
export const NAV_BY_ROLE = {
  guest: {
    primary: [ITEM.landing, ITEM.pricing, mySpace('دخول')],
    more: [ITEM.aiTutor],
    mobile: [ITEM.landing, ITEM.pricing, ITEM.aiTutor, mySpace('دخول')]
  },
  parent: {
    primary: [ITEM.landing, ITEM.child, ITEM.parent, mySpace()],
    more: [ITEM.aiTutor, ITEM.pricing],
    mobile: [ITEM.landing, ITEM.child, ITEM.parent, ITEM.aiTutor, mySpace()]
  },
  teacher: {
    primary: [ITEM.landing, ITEM.teacher, mySpace()],
    more: [ITEM.child, ITEM.aiTutor],
    mobile: [ITEM.landing, ITEM.teacher, ITEM.child, ITEM.aiTutor, mySpace()]
  },
  content_editor: {
    primary: [ITEM.landing, ITEM.admin, mySpace()],
    more: [ITEM.child],
    mobile: [ITEM.landing, ITEM.admin, ITEM.child, mySpace()]
  },
  admin: {
    primary: [ITEM.landing, ITEM.admin, ITEM.analytics, mySpace()],
    more: [ITEM.teacher, ITEM.parent, ITEM.child, ITEM.pricing],
    mobile: [ITEM.landing, ITEM.admin, ITEM.analytics, ITEM.child, mySpace()]
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
  { id: 'content', icon: '📚', label: 'مركز المحتوى', roles: ['admin', 'content_editor'] },
  { id: 'settings', icon: '⚙️', label: 'إعدادات الموقع', roles: ['admin', 'content_editor'] },
  { id: 'aiTutor', icon: '🤖', label: 'مساعد التدريب', roles: ['admin'] },
  { id: 'people', icon: '👨‍👩‍👧‍👦', label: 'الطلاب والأسر', roles: ['admin'] },
  { id: 'subscriptions', icon: '📦', label: 'كتالوج الاشتراكات', roles: ['admin'] },
  { id: 'rbac', icon: '👥', label: 'المستخدمون والصلاحيات', roles: ['admin'] },
  { id: 'analytics', icon: '📊', label: 'لوحة التحليلات', roles: ['admin'], path: '/analytics' }
];

export const adminSectionsForRole = (role) => ADMIN_SECTIONS.filter(s => s.roles.includes(role));

export const adminSectionPath = (s) =>
  s.path || (s.id === 'content' ? '/admin' : `/admin?tab=${s.id}`);

// مراكز الإدارة: كل مركز يجمع أقساماً متتالية (خطوات) في صفحة واحدة.
// معرّفات الخطوات تطابق قيم ?tab القديمة، فالروابط المحفوظة تبقى صالحة بلا تحويل.
export const ADMIN_HUBS = {
  content: {
    icon: '📚',
    title: 'مركز المحتوى',
    intro: 'ابنِ المنهج، ثم راجع دروس المعلمين، ثم راجع تسجيلات الحصص قبل وصولها للطلاب.',
    views: [
      { id: 'curriculum', step: 1, icon: '📚', label: 'المناهج', hint: 'الصفوف والمواد والدروس', roles: ['admin', 'content_editor'] },
      { id: 'lessonReview', step: 2, icon: '🧾', label: 'مراجعة دروس المعلمين', hint: 'اعتماد الدروس قبل نشرها', roles: ['admin', 'content_editor'], pending: { table: 'curriculum_lessons', column: 'review_status', equals: 'submitted' } },
      { id: 'recordings', step: 3, icon: '🎥', label: 'مراجعة تسجيلات الحصص', hint: 'قبول التسجيل قبل ظهوره للطلاب', roles: ['admin'], pending: { table: 'lesson_recordings', column: 'status', equals: 'review' } }
    ]
  },
  people: {
    icon: '👨‍👩‍👧‍👦',
    title: 'الطلاب والأسر',
    intro: 'تابع الحجوزات التجريبية، ثم أدر حسابات الأسر وأطفالها، ثم جهّز الجدول الأسبوعي لكل طفل.',
    views: [
      { id: 'bookings', step: 1, icon: '📋', label: 'الحجوزات التجريبية', hint: 'طلبات الحصص التجريبية الجديدة', roles: ['admin'], pending: { table: 'bookings', column: 'status', equals: 'new', nullCounts: true } },
      { id: 'families', step: 2, icon: '👨‍👩‍👧‍👦', label: 'حسابات الأسر', hint: 'أولياء الأمور والأطفال', roles: ['admin'] },
      { id: 'schedule', step: 3, icon: '🗓️', label: 'الجدول الأسبوعي', hint: 'مواعيد كل طفل ومعلّمه', roles: ['admin'] }
    ]
  }
};

export const hubViewsForRole = (hubId, role) => (ADMIN_HUBS[hubId]?.views || []).filter(v => v.roles.includes(role));

export const hubViewPath = (v) => (v.id === 'curriculum' ? '/admin' : `/admin?tab=${v.id}`);

const hubOfView = (viewId) => Object.keys(ADMIN_HUBS).find(h => ADMIN_HUBS[h].views.some(v => v.id === viewId));

// توافق خلفي مع الاستخدام السابق لمركز المحتوى.
export const CONTENT_HUB_VIEWS = ADMIN_HUBS.content.views;
export const contentHubViewsForRole = (role) => hubViewsForRole('content', role);
export const contentHubViewPath = hubViewPath;

// يحوّل المسار و ?tab إلى القسم النشط في القائمة والخطوة النشطة داخل المركز (إن كان القسم مركزاً).
// /admin/* = شجرة المناهج دائماً. خطوة غير مسموحة للدور ترجع لأول خطوة مسموحة (الخادم يفرض الصلاحية فعلياً).
export function resolveAdminLocation(role, pathname = '/admin', tab = null) {
  const sections = adminSectionsForRole(role).filter(s => !s.path);
  const sub = String(pathname).replace(/^\/admin\/?/, '').replace(/\/+$/, '');
  let wanted = sub ? 'curriculum' : (tab || 'curriculum');
  if (ADMIN_HUBS[wanted]) wanted = hubViewsForRole(wanted, role)[0]?.id || wanted;
  const hub = hubOfView(wanted);
  if (hub) {
    const views = hubViewsForRole(hub, role);
    if (views.length) return { section: hub, view: views.some(v => v.id === wanted) ? wanted : views[0].id };
  }
  const section = sections.some(s => s.id === wanted) ? wanted : (sections[0]?.id || 'content');
  return { section, view: ADMIN_HUBS[section] ? (hubViewsForRole(section, role)[0]?.id || null) : null };
}
