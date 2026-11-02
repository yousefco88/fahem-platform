// Edge Function: admin-manage-user — إدارة حساب مستخدم من لوحة الإدارة (مدير فقط).
// الإجراءات: rename | suspend | unsuspend | send_reset | set_password | delete (محمي بفحص الأثر).
// حسابات المدراء محمية: لا إيقاف ولا كلمة مرور، ولا إجراء على النفس. لا تُسجَّل كلمات المرور.
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
// جداول تُحذف مع الحساب دون فقد بيانات تشغيلية — مطابقة لـ DELETABLE_WITH_ACCOUNT في src/lib/adminUsers.js.
const DELETABLE_WITH_ACCOUNT = new Set(['profiles', 'parent_profiles', 'teacher_subjects']);
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const svc = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authHeader = req.headers.get('Authorization') ?? '';
  const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: u } = await caller.auth.getUser();
  if (!u?.user) return json({ message: 'غير مصرح' }, 401);
  const { data: isAdmin } = await caller.rpc('is_admin');
  if (!isAdmin) return json({ message: 'للمدير فقط' }, 403);

  let body: any;
  try { body = await req.json(); } catch { return json({ message: 'طلب غير صالح' }, 400); }
  const { action, userId } = body ?? {};
  if (!userId || typeof userId !== 'string') return json({ message: 'مستخدم غير محدد' }, 400);
  if (userId === u.user.id) return json({ message: 'لا يمكن تنفيذ هذا الإجراء على حسابك' }, 400);

  const admin = createClient(url, svc);
  const { data: role, error: rErr } = await caller.rpc('admin_user_role', { p_user: userId });
  if (rErr) return json({ message: rErr.message }, 400);
  if (!role) return json({ message: 'المستخدم غير موجود' }, 404);
  if (role === 'admin') return json({ message: 'حسابات المدراء محمية من هذه الإجراءات' }, 403);

  if (action === 'rename') {
    const { error } = await caller.rpc('admin_rename_user', { p_user: userId, p_name: String(body.fullName ?? '') });
    return error ? json({ message: error.message }, 400) : json({ ok: true });
  }
  if (action === 'suspend' || action === 'unsuspend') {
    const hours = Number(body.hours);
    const dur = action === 'unsuspend' ? 'none' : `${Math.min(Math.max(Math.round(hours) || 24, 1), 24 * 365)}h`;
    const { data, error } = await admin.auth.admin.updateUserById(userId, { ban_duration: dur });
    return error ? json({ message: error.message }, 400) : json({ ok: true, bannedUntil: data.user?.banned_until ?? null });
  }
  if (action === 'send_reset') {
    const { data: au } = await admin.auth.admin.getUserById(userId);
    const email = au?.user?.email;
    if (!email) return json({ message: 'لا بريد للمستخدم' }, 400);
    const { error } = await caller.auth.resetPasswordForEmail(email);
    return error ? json({ message: error.message }, 400) : json({ ok: true });
  }
  if (action === 'set_password') {
    const pw = String(body.password ?? '');
    if (pw.length < 8) return json({ message: 'كلمة المرور 8 أحرف على الأقل' }, 400);
    const { error } = await admin.auth.admin.updateUserById(userId, { password: pw });
    return error ? json({ message: error.message }, 400) : json({ ok: true });
  }
  if (action === 'delete') {
    // حذف نهائي: يشترط كتابة البريد للتأكيد، ويُرفض إن كان الحساب مرتبطاً ببيانات تشغيلية (أبناء، حضور، اختبارات…).
    const { data: au } = await admin.auth.admin.getUserById(userId);
    const email = (au?.user?.email ?? '').toLowerCase();
    if (!email || String(body.confirmEmail ?? '').trim().toLowerCase() !== email) {
      return json({ message: 'اكتب بريد المستخدم كما هو لتأكيد الحذف' }, 400);
    }
    const { data: impact, error: iErr } = await caller.rpc('admin_user_delete_impact', { p_user: userId });
    if (iErr) return json({ message: iErr.message }, 400);
    const blockers = (impact ?? []).filter((r: any) =>
      Number(r.row_count) > 0 && r.on_delete !== 'set_null' &&
      !(r.on_delete === 'cascade' && DELETABLE_WITH_ACCOUNT.has(r.table_name)));
    if (blockers.length) {
      return json({ message: 'الحساب مرتبط ببيانات لا يجوز حذفها معه؛ استخدم الإيقاف بدلاً من الحذف', blockers }, 409);
    }
    const { error } = await admin.auth.admin.deleteUser(userId);
    return error ? json({ message: error.message }, 400) : json({ ok: true, deleted: userId });
  }
  return json({ message: 'إجراء غير معروف' }, 400);
});
