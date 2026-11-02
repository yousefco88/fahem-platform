/**
 * UsersPanel — المستخدمون والصلاحيات (الإدارة فقط)
 * الأدوار عبر admin_set_user_role، وإجراءات الحساب عبر Edge Function admin-manage-user،
 * والحذف لا يتم إلا بعد معاينة أثره (admin_user_delete_impact) وكتابة البريد — والخادم يفرض المنع أيضاً.
 * المدراء وحساب المستخدم نفسه محميون من الإجراءات.
 */
import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import {
  ROLE_OPTIONS, STATUS_FILTERS, roleLabel, userBadges, filterUsers, userActions, classifyDeleteImpact,
} from '../../lib/adminUsers';
import Emoji from '../../ui/Emoji';
import './UsersPanel.css';

async function invokeManage(body) {
  const { data, error } = await supabase.functions.invoke('admin-manage-user', { body });
  let payload = data;
  if (error && error.context?.json) { try { payload = await error.context.json(); } catch { /* ignore */ } }
  if (error || payload?.message) return { ok: false, message: payload?.message || error?.message || 'خطأ غير معروف', payload };
  return { ok: true, payload };
}

function ActionsMenu({ u, actions, disabled, onAction }) {
  const ref = useRef(null);
  const close = () => { if (ref.current) ref.current.open = false; };
  return (
    <details className="up-menu" ref={ref}>
      <summary className="up-menu-btn" aria-label={`إجراءات ${u.full_name || u.email}`} aria-disabled={disabled}>
        إجراءات <span aria-hidden="true">▾</span>
      </summary>
      <div className="up-menu-list" role="menu">
        {actions.map(a => (
          <button key={a.id} type="button" role="menuitem" disabled={disabled}
            className={`up-menu-item${a.danger ? ' is-danger' : ''}`}
            onClick={() => { close(); onAction(u, a.id); }}>
            <Emoji>{a.icon}</Emoji> {a.label}
          </button>
        ))}
      </div>
    </details>
  );
}

function DeleteDialog({ target, onClose, onDeleted }) {
  const { triggerToast } = useApp();
  const [impact, setImpact] = useState({ status: 'loading', data: null, error: null });
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const who = target.full_name || target.email;

  useEffect(() => {
    let alive = true;
    supabase.rpc('admin_user_delete_impact', { p_user: target.id }).then(({ data, error }) => {
      if (!alive) return;
      setImpact(error ? { status: 'error', data: null, error } : { status: 'data', data: classifyDeleteImpact(data), error: null });
    });
    return () => { alive = false; };
  }, [target.id]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const matches = typed.trim().toLowerCase() === (target.email || '').toLowerCase();
  const canDelete = impact.status === 'data' && impact.data.canDelete && matches && !busy;

  async function confirm() {
    setBusy(true);
    const res = await invokeManage({ action: 'delete', userId: target.id, confirmEmail: typed.trim() });
    setBusy(false);
    if (!res.ok) {
      if (res.payload?.blockers) setImpact({ status: 'data', data: classifyDeleteImpact(res.payload.blockers), error: null });
      triggerToast(`تعذر الحذف: ${res.message}`);
      return;
    }
    triggerToast(`حُذف حساب ${who} نهائياً ✓`);
    onDeleted(target.id);
  }

  return (
    <div className="up-overlay" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="up-dialog" role="dialog" aria-modal="true" aria-labelledby="up-del-title">
        <h3 id="up-del-title"><Emoji>🗑️</Emoji> حذف حساب {who}</h3>
        <p className="up-dialog-email" dir="ltr">{target.email}</p>

        {impact.status === 'loading' && <p className="up-muted">جارٍ فحص البيانات المرتبطة بالحساب…</p>}
        {impact.status === 'error' && (
          <p className="up-alert" role="alert">تعذر فحص البيانات المرتبطة بالحساب، لذا الحذف غير متاح الآن. استخدم «إيقاف مؤقت» بدلاً منه.</p>
        )}
        {impact.status === 'data' && !impact.data.canDelete && (
          <div className="up-alert" role="alert">
            <strong>لا يمكن حذف هذا الحساب</strong> لأنه مرتبط ببيانات ستُفقد أو يمنع النظام حذفها:
            <ul>{impact.data.blockers.map(b => <li key={`${b.table}.${b.column}`}>{b.label}: {b.count}</li>)}</ul>
            الأنسب: <strong>إيقاف الحساب</strong> بدل حذفه، فيبقى السجل محفوظاً.
          </div>
        )}
        {impact.status === 'data' && impact.data.canDelete && (
          <>
            <div className="up-warn">
              الحذف <strong>نهائي ولا يمكن التراجع عنه</strong>: لن يستطيع صاحب الحساب الدخول، ويُحذف معه:
              <ul>
                <li>حساب الدخول</li>
                {impact.data.removed.map(r => <li key={`${r.table}.${r.column}`}>{r.label} ({r.count})</li>)}
              </ul>
              {impact.data.detached.length > 0 && (
                <p className="up-muted">يبقى محفوظاً بلا اسم صاحبه: {impact.data.detached.map(d => `${d.label} (${d.count})`).join('، ')}.</p>
              )}
            </div>
            <label className="up-field">
              <span>للتأكيد اكتب البريد كما هو</span>
              <input dir="ltr" type="email" autoComplete="off" value={typed} onChange={e => setTyped(e.target.value)} placeholder={target.email} autoFocus />
            </label>
          </>
        )}

        <div className="up-dialog-actions">
          <button type="button" className="up-btn-danger" disabled={!canDelete} onClick={confirm}>
            {busy ? 'جارٍ الحذف…' : 'حذف نهائي'}
          </button>
          <button type="button" className="btn-secondary" disabled={busy} onClick={onClose}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

export default function UsersPanel({ users, setUsers, usersLoading, usersError, banned, loadUsers }) {
  const { user } = useAuth();
  const { triggerToast } = useApp();
  const selfId = user?.id || null;
  const [savingUser, setSavingUser] = useState(null);
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [invites, setInvites] = useState([]);
  const [deleting, setDeleting] = useState(null);

  const loadInvites = async () => {
    if (!supabase) return;
    const { data } = await supabase.rpc('admin_list_invites');
    setInvites(data || []);
  };
  useEffect(() => { loadInvites(); }, []);

  const visible = useMemo(
    () => filterUsers(users, { query, role: roleFilter, status: statusFilter, banned }),
    [users, query, roleFilter, statusFilter, banned],
  );
  const filtersOn = query || roleFilter !== 'all' || statusFilter !== 'all';

  const cancelInvite = async (inv) => {
    if (!window.confirm(`إلغاء دعوة ${inv.email}؟`)) return;
    const { error } = await supabase.rpc('admin_cancel_invite', { p_id: inv.id });
    if (error) { triggerToast(`تعذر الإلغاء: ${error.message}`); return; }
    setInvites(l => l.filter(x => x.id !== inv.id));
  };

  const changeRole = async (u, role) => {
    if (role === u.role) return;
    if (!window.confirm(`تغيير دور ${u.full_name || u.email} من «${roleLabel(u.role)}» إلى «${roleLabel(role)}»؟`)) { setUsers(list => [...list]); return; }
    setSavingUser(u.id);
    const { error } = await supabase.rpc('admin_set_user_role', { p_user: u.id, p_role: role });
    setSavingUser(null);
    if (error) { triggerToast(`تعذر تغيير الدور: ${error.message}`); return; }
    setUsers(list => list.map(x => x.id === u.id ? { ...x, role } : x));
    triggerToast(`تم تغيير دور ${u.full_name || u.email} ✓`);
  };

  const addTeacher = async () => {
    const email = teacherEmail.trim().toLowerCase();
    if (!email) return;
    const u = users.find(x => (x.email || '').toLowerCase() === email);
    if (!u) {
      setSavingUser('invite');
      const { error } = await supabase.rpc('admin_invite_staff', { p_email: email, p_role: 'teacher' });
      setSavingUser(null);
      if (error) { triggerToast(`تعذر إنشاء الدعوة: ${error.message}`); return; }
      triggerToast('تم إنشاء الدعوة ✓ أبلغ المعلم أن يسجّل بهذا البريد وسيصبح معلماً تلقائياً');
      setTeacherEmail(''); loadInvites(); return;
    }
    if (u.role === 'teacher') { triggerToast('هذا الحساب معلم بالفعل'); return; }
    if (u.id === selfId) { triggerToast('لا يمكنك تغيير دورك بنفسك'); return; }
    await changeRole(u, 'teacher');
    setTeacherEmail('');
  };

  const manageUser = async (u, action) => {
    const who = u.full_name || u.email;
    if (action === 'delete') { setDeleting(u); return; }
    if (action === 'copy_email') {
      try { await navigator.clipboard.writeText(u.email); triggerToast('نُسخ البريد ✓'); }
      catch { window.prompt('انسخ البريد:', u.email); }
      return;
    }
    const body = { action, userId: u.id };
    if (action === 'rename') {
      const n = window.prompt('الاسم الجديد:', u.full_name || '');
      if (!n || !n.trim()) return; body.fullName = n.trim();
    } else if (action === 'suspend') {
      const h = window.prompt(`مدة إيقاف ${who} بالساعات (24 = يوم، 168 = أسبوع، 720 = شهر):`, '24');
      if (!h || !(Number(h) > 0)) return; body.hours = Number(h);
    } else if (action === 'unsuspend') {
      if (!window.confirm(`إعادة تفعيل ${who}؟`)) return;
    } else if (action === 'send_reset') {
      if (!window.confirm(`إرسال رابط إعادة تعيين كلمة المرور إلى ${u.email}؟`)) return;
    } else if (action === 'set_password') {
      const pw = window.prompt(`كلمة مرور مؤقتة جديدة لـ ${who} (8 أحرف على الأقل). أبلغه بها بقناة آمنة:`);
      if (!pw) return; body.password = pw;
    }
    setSavingUser(u.id);
    const res = await invokeManage(body);
    setSavingUser(null);
    if (!res.ok) { triggerToast(`تعذر التنفيذ: ${res.message}`); return; }
    triggerToast('تم التنفيذ ✓');
    if (action === 'rename') setUsers(l => l.map(x => x.id === u.id ? { ...x, full_name: body.fullName } : x));
    if (action === 'suspend' || action === 'unsuspend') loadUsers();
  };

  return (
    <div className="u-3 up">
      <header className="up-head">
        <div>
          <h3><Emoji>👥</Emoji> المستخدمون والصلاحيات</h3>
          <p>كل من سجّل في المنصة يظهر هنا. غيّر دوره ليرى ما يخصه فقط. حسابك وحسابات المدراء محمية من الإجراءات، ولا يمكن إزالة آخر مدير.</p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => { loadUsers(); loadInvites(); }}>↻ تحديث</button>
      </header>

      <div className="up-roles" aria-label="الأدوار وصلاحياتها">
        {ROLE_OPTIONS.map(r => {
          const n = users.filter(x => x.role === r.id).length;
          return (
            <button key={r.id} type="button" className={`up-role${roleFilter === r.id ? ' is-on' : ''}`}
              aria-pressed={roleFilter === r.id} onClick={() => setRoleFilter(roleFilter === r.id ? 'all' : r.id)}>
              <span className="up-role-top"><Emoji>{r.icon}</Emoji> <strong>{r.label}</strong> <span className="up-role-n">{n}</span></span>
              <span className="up-role-note">{r.note}</span>
            </button>
          );
        })}
      </div>

      <section className="up-card">
        <strong><Emoji>👩‍🏫</Emoji> إضافة / تفعيل معلم</strong>
        <p className="u-4">اكتب بريد المعلم: إن كان مسجّلاً يُفعَّل فوراً، وإن لم يكن تُنشأ دعوة تُطبَّق تلقائياً عند تسجيله بنفس البريد.</p>
        <div className="up-row">
          <input type="email" dir="ltr" aria-label="بريد المعلم" placeholder="teacher@example.com" value={teacherEmail}
            onChange={e => setTeacherEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTeacher()}
            list="registered-emails" className="up-input" />
          <datalist id="registered-emails">
            {users.filter(x => x.role !== 'teacher').map(x => <option key={x.id} value={x.email} />)}
          </datalist>
          <button type="button" className="btn-primary" onClick={addTeacher} disabled={!teacherEmail.trim() || !!savingUser}>تفعيل / دعوة كمعلم</button>
        </div>
        {invites.length > 0 && (
          <div className="up-invites">
            <div className="u-4">دعوات معلّقة ({invites.length})</div>
            {invites.map(inv => (
              <div key={inv.id} className="up-invite">
                <span dir="ltr">{inv.email}</span>
                <span className="up-muted">تنتهي {new Date(inv.expires_at).toLocaleDateString('ar-SA')}</span>
                <button type="button" className="up-link-danger" onClick={() => cancelInvite(inv)}>إلغاء</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="up-filters">
        <label className="up-search">
          
          <input type="search" aria-label="بحث بالاسم أو البريد" className="up-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث بالاسم أو البريد…" />
        </label>
        <select className="up-input up-select" aria-label="الدور" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="all">كل الأدوار ({users.length})</option>
          {ROLE_OPTIONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <select className="up-input up-select" aria-label="الحالة" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          {STATUS_FILTERS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        {filtersOn && (
          <button type="button" className="up-link" onClick={() => { setQuery(''); setRoleFilter('all'); setStatusFilter('all'); }}>مسح التصفية</button>
        )}
        <span className="up-muted up-count" role="status">{visible.length} من {users.length}</span>
      </div>

      {usersLoading && <div className="u-6">جارٍ تحميل المستخدمين…</div>}
      {!usersLoading && usersError && <div className="up-alert" role="alert">تعذر تحميل المستخدمين: {usersError}</div>}
      {!usersLoading && !usersError && users.length === 0 && <div className="up-empty">لا يوجد مستخدمون بعد</div>}
      {!usersLoading && !usersError && users.length > 0 && visible.length === 0 && (
        <div className="up-empty">لا يوجد مستخدمون يطابقون البحث والتصفية.</div>
      )}

      {!usersLoading && visible.length > 0 && (
        <ul className="up-list">
          {visible.map(u => {
            const badges = userBadges(u, { banned, selfId });
            const actions = userActions(u, { banned, selfId });
            const busy = savingUser === u.id;
            const name = u.full_name || '—';
            return (
              <li key={u.id} className={`up-item${badges.some(b => b.key === 'suspended') ? ' is-suspended' : ''}`}>
                <div className="up-who">
                  <span className="up-avatar" aria-hidden="true">{(u.full_name || u.email || '?').trim().charAt(0).toUpperCase()}</span>
                  <div className="up-who-text">
                    <strong>{name}</strong>
                    <span className="up-email" dir="ltr">{u.email}</span>
                    {badges.length > 0 && (
                      <span className="up-badges">
                        {badges.map(b => (
                          <span key={b.key} className={`up-badge up-badge-${b.tone}`}>
                            {b.label}{b.until ? ` حتى ${new Date(b.until).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}
                          </span>
                        ))}
                      </span>
                    )}
                    {u.teacher_request && u.role !== 'teacher' && (
                      <span className="up-request">
                        <Emoji>🎓</Emoji> {u.teacher_request.subjects || '—'} · {u.teacher_request.stage || '—'}
                        {u.teacher_request.phone ? <span dir="ltr"> · {u.teacher_request.phone}</span> : null}
                      </span>
                    )}
                  </div>
                </div>

                <div className="up-meta">
                  <span className="up-meta-label">آخر دخول</span>
                  <span>{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }) : 'لم يدخل بعد'}</span>
                </div>

                <label className="up-meta">
                  <span className="up-meta-label">الدور</span>
                  <select className="up-input up-select" aria-label={`دور ${u.full_name || u.email}`} value={u.role}
                    disabled={u.id === selfId || busy} title={u.id === selfId ? 'لا يمكنك تغيير دورك بنفسك' : undefined}
                    onChange={e => changeRole(u, e.target.value)}>
                    {ROLE_OPTIONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </label>

                <div className="up-actions">
                  {actions.length === 0 ? (
                    <span className="up-protected" title={u.id === selfId ? 'لا إجراءات على حسابك' : 'حسابات المدراء محمية'}><Emoji>🔒</Emoji> محمي</span>
                  ) : (
                    <ActionsMenu u={u} actions={actions} disabled={busy} onAction={manageUser} />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {deleting && (
        <DeleteDialog
          target={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={(id) => { setDeleting(null); setUsers(l => l.filter(x => x.id !== id)); }}
        />
      )}
    </div>
  );
}
