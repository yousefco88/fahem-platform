// منطق «المستخدمون والصلاحيات» الخالص (قابل للاختبار): الأدوار، الحالة، التصفية، الإجراءات، وأثر الحذف.
// الصلاحيات الفعلية مفروضة على الخادم (admin_set_user_role / admin-manage-user / admin_user_delete_impact).

export const ROLE_OPTIONS = [
  { id: 'parent', label: 'ولي أمر', icon: '👨‍👩‍👧', note: 'يرى أبناءه ويحجز ويتابع حصصهم' },
  { id: 'teacher', label: 'معلم', icon: '👩‍🏫', note: 'يرى طلابه المُسنَدين وحصصه ويرفع تسجيلاتها' },
  { id: 'content_editor', label: 'محرر محتوى', icon: '✍️', note: 'يدير المناهج والدروس فقط' },
  { id: 'admin', label: 'مدير النظام', icon: '🛡️', note: 'كل الأقسام والصلاحيات' },
];

export const roleLabel = (id) => ROLE_OPTIONS.find(r => r.id === id)?.label || id || 'بدون دور';

export const STATUS_FILTERS = [
  { id: 'all', label: 'كل الحالات' },
  { id: 'active', label: 'نشط' },
  { id: 'suspended', label: 'موقوف' },
  { id: 'never', label: 'لم يدخل بعد' },
  { id: 'teacher_request', label: 'طلب انضمام كمعلم' },
];

const isSuspended = (u, banned, now) => {
  const until = banned?.[u.id];
  return Boolean(until) && new Date(until).getTime() > now;
};

// حالة المستخدم للعرض كوسوم.
export function userBadges(u, { banned = {}, selfId = null, now = Date.now() } = {}) {
  const badges = [];
  if (u.id === selfId) badges.push({ key: 'self', label: 'أنت', tone: 'info' });
  if (isSuspended(u, banned, now)) badges.push({ key: 'suspended', label: 'موقوف', tone: 'danger', until: banned[u.id] });
  if (!u.last_sign_in_at) badges.push({ key: 'never', label: 'لم يدخل بعد', tone: 'muted' });
  if (u.teacher_request && u.role !== 'teacher') badges.push({ key: 'teacher_request', label: 'طلب انضمام كمعلم', tone: 'warn' });
  return badges;
}

export function filterUsers(users, { query = '', role = 'all', status = 'all', banned = {}, now = Date.now() } = {}) {
  const q = query.trim().toLowerCase();
  return (users || []).filter(u => {
    if (role !== 'all' && u.role !== role) return false;
    if (q && !`${u.full_name || ''} ${u.email || ''}`.toLowerCase().includes(q)) return false;
    if (status === 'suspended') return isSuspended(u, banned, now);
    if (status === 'active') return !isSuspended(u, banned, now) && Boolean(u.last_sign_in_at);
    if (status === 'never') return !u.last_sign_in_at;
    if (status === 'teacher_request') return Boolean(u.teacher_request) && u.role !== 'teacher';
    return true;
  });
}

// الإجراءات المتاحة على مستخدم. المدراء وحساب المستخدم نفسه محميون (الخادم يرفضها أيضاً).
export function userActions(u, { banned = {}, selfId = null, now = Date.now() } = {}) {
  if (!u || u.role === 'admin' || u.id === selfId) return [];
  const suspended = isSuspended(u, banned, now);
  return [
    { id: 'rename', icon: '✏️', label: 'تعديل الاسم' },
    { id: 'copy_email', icon: '📋', label: 'نسخ البريد' },
    { id: 'send_reset', icon: '📧', label: 'إرسال رابط كلمة مرور' },
    { id: 'set_password', icon: '🔑', label: 'تعيين كلمة مرور مؤقتة' },
    suspended
      ? { id: 'unsuspend', icon: '▶️', label: 'إعادة التفعيل' }
      : { id: 'suspend', icon: '⏸️', label: 'إيقاف مؤقت' },
    { id: 'delete', icon: '🗑️', label: 'حذف الحساب', danger: true },
  ];
}

// جداول تُحذف تلقائياً مع الحساب دون فقد بيانات تشغيلية (ملف المستخدم وإسناد المواد).
export const DELETABLE_WITH_ACCOUNT = ['profiles', 'parent_profiles', 'teacher_subjects'];

const TABLE_LABELS = {
  profiles: 'ملف المستخدم',
  parent_profiles: 'بيانات ولي الأمر',
  teacher_subjects: 'إسناد المواد',
  children: 'الأبناء',
  teacher_students: 'طلاب مُسنَدون',
  teacher_live_attendance: 'سجل حضور الحصص',
  teacher_live_attendance_audit: 'سجل تدقيق الحضور',
  exam_attempts: 'محاولات الاختبارات',
  lesson_question_attempts: 'إجابات الأسئلة',
  assessment_sessions: 'جلسات التقييم',
  live_join_log: 'سجل دخول الحصص المباشرة',
  curriculum_lessons: 'دروس أنشأها',
  lesson_questions: 'أسئلة أنشأها',
  curriculum_media: 'ملفات رفعها',
  activity_log: 'سجل النشاط',
  child_subscription_contracts: 'عقود اشتراك',
  subscription_hour_ledger: 'حركات رصيد الساعات',
};
export const tableLabel = (t) => TABLE_LABELS[t] || t;

// يصنّف أثر الحذف القادم من admin_user_delete_impact:
// blockers تمنع الحذف (بيانات تشغيلية تُحذف معه أو قيد restrict)، removed تُحذف معه بأمان، detached يبقى ويُفصل عنه.
export function classifyDeleteImpact(rows) {
  const out = { blockers: [], removed: [], detached: [] };
  for (const r of rows || []) {
    const item = { table: r.table_name, column: r.column_name, count: Number(r.row_count) || 0, label: tableLabel(r.table_name) };
    if (!item.count) continue;
    if (r.on_delete === 'set_null') out.detached.push(item);
    else if (r.on_delete === 'cascade' && DELETABLE_WITH_ACCOUNT.includes(r.table_name)) out.removed.push(item);
    else out.blockers.push(item);
  }
  return { ...out, canDelete: out.blockers.length === 0 };
}
