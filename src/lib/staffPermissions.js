// صلاحيات الطاقم المحدودة بنطاق — تسميات العرض ومنطق النطاق في الواجهة.
// المرجع الفعلي هو الخادم (has_capability / staff_grant_capability)؛ هنا العرض والتحقق المسبق فقط.

export const CAPABILITIES = [
  { id: 'content.edit', label: 'تحرير المحتوى', hint: 'المواد والدروس والأسئلة', scoped: true },
  { id: 'lessons.review', label: 'مراجعة دروس المعلمين', hint: 'اعتماد أو رفض الدروس', scoped: true },
  { id: 'recordings.review', label: 'مراجعة تسجيلات الحصص', hint: 'قبول التسجيل قبل ظهوره', scoped: true },
  { id: 'teachers.assign', label: 'إسناد المعلمين', hint: 'للمواد والطلاب', scoped: true },
  { id: 'children.view', label: 'عرض الطلاب وتقدّمهم', hint: 'بيانات الأطفال ضمن النطاق', scoped: true },
  { id: 'children.edit', label: 'تعديل بيانات الطلاب', hint: 'الاسم والصف وفتح الاختبار', scoped: true },
  { id: 'schedule.manage', label: 'الجدول الأسبوعي', hint: 'مواعيد الطلاب ضمن النطاق', scoped: true },
  { id: 'families.manage', label: 'حسابات الأسر', hint: 'بيانات أولياء الأمور', scoped: false },
  { id: 'bookings.manage', label: 'الحجوزات التجريبية', hint: 'طلبات الحصص التجريبية', scoped: false },
  { id: 'subscriptions.view', label: 'عرض الاشتراكات', hint: 'عرض فقط بلا تعديل', scoped: false },
  { id: 'settings.edit', label: 'إعدادات الموقع', hint: 'نصوص وإعدادات عامة', scoped: false },
  { id: 'analytics.view', label: 'التحليلات', hint: 'سجل النشاط', scoped: false },
];

// سقف كل دور — مطابق لـ public.staff_role_ceiling في الخادم.
export const ROLE_CEILING = {
  platform_manager: CAPABILITIES.map(c => c.id),
  supervisor: ['content.edit', 'lessons.review', 'recordings.review', 'teachers.assign',
    'children.view', 'children.edit', 'schedule.manage'],
};

export const SCOPE_KINDS = [
  { id: 'all', label: 'كل المنصة' },
  { id: 'stage', label: 'مرحلة' },
  { id: 'grade', label: 'صف' },
  { id: 'subject', label: 'مادة' },
];

export const STAGE_LABELS = { kg: 'رياض الأطفال', primary: 'الابتدائية', middle: 'المتوسطة', preparatory: 'الإعدادية', secondary: 'الثانوية' };

export const capabilityLabel = (id) => CAPABILITIES.find(c => c.id === id)?.label || id;
export const isScopedCapability = (id) => Boolean(CAPABILITIES.find(c => c.id === id)?.scoped);
export const capabilitiesForRole = (role) => CAPABILITIES.filter(c => (ROLE_CEILING[role] || []).includes(c.id));

// grades: [{id, stage, title}] ، subjects: [{key, title?, grade_id}]
export function scopeLabel(kind, value, { grades = [], subjects = [] } = {}) {
  if (kind === 'all' || !kind) return 'كل المنصة';
  if (kind === 'stage') return `مرحلة: ${STAGE_LABELS[value] || value}`;
  if (kind === 'grade') return `صف: ${grades.find(g => g.id === value)?.title || value}`;
  if (kind === 'subject') {
    const s = subjects.find(x => x.key === value);
    return `مادة: ${s?.title || s?.name || value}`;
  }
  return value || kind;
}

// هل نطاق outer يحتوي inner؟ مطابق لـ public.staff_scope_covers.
export function scopeCovers(outer, inner, { grades = [], subjects = [] } = {}) {
  if (!outer || !inner) return false;
  if (outer.scope_kind === 'all') return true;
  if (inner.scope_kind === 'all') return false;
  if (outer.scope_kind === inner.scope_kind) return outer.scope_value === inner.scope_value;
  const gradeOf = (key) => subjects.find(s => s.key === key)?.grade_id;
  const stageOf = (gid) => grades.find(g => g.id === gid)?.stage;
  if (outer.scope_kind === 'stage' && inner.scope_kind === 'grade') return stageOf(inner.scope_value) === outer.scope_value;
  if (outer.scope_kind === 'stage' && inner.scope_kind === 'subject') return stageOf(gradeOf(inner.scope_value)) === outer.scope_value;
  if (outer.scope_kind === 'grade' && inner.scope_kind === 'subject') return gradeOf(inner.scope_value) === outer.scope_value;
  return false;
}

// ما يستطيع المانح منحه: المدير العام كل شيء؛ مدير المنصة ما يملكه وبنطاق ضمن نطاقه.
export function canGrantLocally({ granterRole, granterCaps = [], capability, scope, catalog = {} }) {
  if (granterRole === 'admin') return true;
  if (granterRole !== 'platform_manager') return false;
  return granterCaps.some(c => c.capability === capability && scopeCovers(c, scope, catalog));
}

export const STAFF_ERROR_MESSAGES = {
  'cannot grant to yourself': 'لا يمكنك منح صلاحية لنفسك.',
  'only admin manages platform managers': 'صلاحيات مدير المنصة يحددها مدير النظام فقط.',
  'capability not allowed for this role': 'هذه الصلاحية خارج حدود دور الموظف.',
  'capability is platform-wide only': 'هذه الصلاحية على مستوى المنصة كلها فقط.',
  'invalid scope value': 'النطاق المختار غير صحيح.',
  'cannot grant beyond your own permissions': 'لا يمكنك منح صلاحية أوسع من صلاحياتك.',
  'cannot revoke this permission': 'لا يمكنك سحب هذه الصلاحية.',
  'target role does not take scoped permissions': 'هذا الدور لا يأخذ صلاحيات تفصيلية.',
  'not authorized': 'ليست لديك صلاحية لهذا الإجراء.',
};

export function staffErrorMessage(error) {
  const msg = String(error?.message || error || '');
  const key = Object.keys(STAFF_ERROR_MESSAGES).find(k => msg.includes(k));
  return key ? STAFF_ERROR_MESSAGES[key] : (msg || 'حدث خطأ غير متوقع.');
}

// هل تحديث قاعدة البيانات للأدوار الجديدة مطبّق؟ (غياب الدالة = غير مطبّق). عند أي خطأ آخر نفترض الجاهزية ونترك الخادم يقرر.
export async function staffRolesReady(client) {
  if (!client) return false;
  const { error } = await client.rpc('my_capabilities');
  return error?.code !== 'PGRST202';
}

export function roleChangeErrorMessage(error, role) {
  const msg = String(error?.message || error || '');
  if (msg.includes('invalid role') && SCOPED_ROLES.includes(role)) return 'هذا الدور بانتظار تفعيل تحديث قاعدة البيانات.';
  return msg;
}
const SCOPED_ROLES = ['platform_manager', 'supervisor'];

// --- RPC wrappers (supabase client injected for testability) ---
export async function loadMyCapabilities(client) {
  if (!client) return [];
  const { data, error } = await client.rpc('my_capabilities');
  if (error) return [];
  return data || [];
}

export async function loadStaffPermissions(client) {
  const { data, error } = await client.rpc('staff_list_permissions');
  if (error?.code === 'PGRST202') {
    return { status: 'error', message: 'الميزة بانتظار تفعيل تحديث قاعدة البيانات.', staff: [] };
  }
  if (error) return { status: 'error', message: staffErrorMessage(error), staff: [] };
  return { status: 'ok', staff: data || [] };
}

export async function grantCapability(client, { userId, capability, scopeKind, scopeValue }) {
  const kind = isScopedCapability(capability) ? scopeKind : 'all';
  const { error } = await client.rpc('staff_grant_capability', {
    p_user: userId, p_capability: capability, p_scope_kind: kind,
    p_scope_value: kind === 'all' ? null : scopeValue,
  });
  return error ? { ok: false, message: staffErrorMessage(error) } : { ok: true };
}

export async function revokeCapability(client, permissionId) {
  const { error } = await client.rpc('staff_revoke_capability', { p_permission_id: permissionId });
  return error ? { ok: false, message: staffErrorMessage(error) } : { ok: true };
}

export async function applyRolePreset(client, userId) {
  const { data, error } = await client.rpc('staff_apply_role_preset', { p_user: userId });
  return error ? { ok: false, message: staffErrorMessage(error) } : { ok: true, count: data || 0 };
}
