/**
 * StaffPermissionsPanel — محرر صلاحيات الطاقم.
 * يحدد لكل مدير منصة / مشرف تعليمي صلاحياته ونطاق كل صلاحية (كل المنصة، مرحلة، صف، مادة).
 * الخادم يفرض كل القيود (staff_grant_capability)؛ الواجهة تعرض ما يُسمح للمستخدم الحالي فقط.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import {
  SCOPE_KINDS, STAGE_LABELS, capabilityLabel, capabilitiesForRole, isScopedCapability, scopeLabel,
  canGrantLocally, loadStaffPermissions, grantCapability, revokeCapability, applyRolePreset,
} from '../../lib/staffPermissions';
import { roleLabel } from '../../lib/adminUsers';
import Emoji from '../../ui/Emoji';
import './UsersPanel.css';

function GrantForm({ member, catalog, granterRole, granterCaps, onDone }) {
  const caps = capabilitiesForRole(member.role);
  const [capability, setCapability] = useState(caps[0]?.id || '');
  const [scopeKind, setScopeKind] = useState('all');
  const [scopeValue, setScopeValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const scoped = isScopedCapability(capability);
  const kind = scoped ? scopeKind : 'all';
  const stages = useMemo(() => [...new Set(catalog.grades.map(g => g.stage))], [catalog.grades]);
  const options = kind === 'stage' ? stages.map(s => ({ value: s, label: STAGE_LABELS[s] || s }))
    : kind === 'grade' ? catalog.grades.map(g => ({ value: g.id, label: g.title }))
    : kind === 'subject' ? catalog.subjects.map(s => ({
        value: s.key, label: `${s.title || s.key}${s.grade_id ? ` — ${catalog.grades.find(g => g.id === s.grade_id)?.title || s.grade_id}` : ''}` }))
    : [];
  const scope = { scope_kind: kind, scope_value: kind === 'all' ? null : scopeValue };
  const allowed = capability && (kind === 'all' || scopeValue)
    && canGrantLocally({ granterRole, granterCaps, capability, scope, catalog });

  const submit = async (e) => {
    e.preventDefault();
    if (!allowed) return;
    setBusy(true); setError('');
    const res = await grantCapability(supabase, { userId: member.user_id, capability, scopeKind: kind, scopeValue });
    setBusy(false);
    if (!res.ok) { setError(res.message); return; }
    onDone();
  };

  if (!caps.length) return null;
  return (
    <form className="up-row" onSubmit={submit} aria-label={`منح صلاحية لـ ${member.full_name || ''}`}>
      <select className="up-input up-select" aria-label="الصلاحية" value={capability}
        onChange={e => { setCapability(e.target.value); setScopeValue(''); }}>
        {caps.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
      {scoped && (
        <select className="up-input up-select" aria-label="نوع النطاق" value={scopeKind}
          onChange={e => { setScopeKind(e.target.value); setScopeValue(''); }}>
          {SCOPE_KINDS.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
        </select>
      )}
      {kind !== 'all' && (
        <select className="up-input up-select" aria-label="النطاق" value={scopeValue} onChange={e => setScopeValue(e.target.value)}>
          <option value="">اختر…</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
      <button type="submit" className="btn-primary" disabled={!allowed || busy}>{busy ? '…' : '＋ منح'}</button>
      {capability && (kind === 'all' || scopeValue) && !allowed && (
        <span className="up-muted" role="status">لا يمكنك منح صلاحية أوسع من صلاحياتك.</span>
      )}
      {error && <span className="up-alert" role="alert">{error}</span>}
    </form>
  );
}

export default function StaffPermissionsPanel() {
  const { role, user, capabilities } = useAuth();
  const { triggerToast } = useApp();
  const [state, setState] = useState({ status: 'loading', staff: [] });
  const [catalog, setCatalog] = useState({ grades: [], subjects: [] });
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setState(s => ({ ...s, status: 'loading' }));
    setState(await loadStaffPermissions(supabase));
  }, []);

  useEffect(() => {
    load();
    Promise.all([
      supabase.from('grades').select('id, stage, title').order('sort_order'),
      supabase.from('curriculum_subjects').select('key, title, grade_id').order('sort_order'),
    ]).then(([g, s]) => setCatalog({ grades: g.data || [], subjects: s.data || [] }));
  }, [load]);

  const granterCaps = capabilities || [];
  const revoke = async (member, perm) => {
    if (!window.confirm(`سحب «${capabilityLabel(perm.capability)}» (${scopeLabel(perm.scope_kind, perm.scope_value, catalog)}) من ${member.full_name || 'الموظف'}؟`)) return;
    setBusyId(perm.id);
    const res = await revokeCapability(supabase, perm.id);
    setBusyId(null);
    if (!res.ok) { triggerToast(res.message); return; }
    triggerToast('تم سحب الصلاحية ✓');
    load();
  };
  const preset = async (member) => {
    if (!window.confirm(`منح ${member.full_name || 'مدير المنصة'} كل صلاحيات مدير المنصة على كل المنصة؟`)) return;
    setBusyId(member.user_id);
    const res = await applyRolePreset(supabase, member.user_id);
    setBusyId(null);
    if (!res.ok) { triggerToast(res.message); return; }
    triggerToast(`تمت إضافة ${res.count} صلاحية ✓`);
    load();
  };

  const canManage = (member) => member.user_id !== user?.id && (role === 'admin' || member.role === 'supervisor');

  return (
    <div className="u-3 up">
      <header className="up-head">
        <div>
          <h3><Emoji>🛡️</Emoji> محرر صلاحيات الطاقم</h3>
          <p>
            حدّد لكل مدير منصة أو مشرف تعليمي ما يستطيع فعله ونطاقه: كل المنصة أو مرحلة أو صف أو مادة.
            {role === 'admin'
              ? ' لتعيين الدور نفسه استخدم «المستخدمون والصلاحيات».'
              : ' تستطيع منح المشرفين صلاحيات ضمن صلاحياتك فقط، وكل تغيير يُسجَّل.'}
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={load}>↻ تحديث</button>
      </header>

      {state.status === 'loading' && <p className="up-muted">جارٍ التحميل…</p>}
      {state.status === 'error' && <div className="up-alert" role="alert">تعذر تحميل الطاقم: {state.message}</div>}
      {state.status === 'ok' && state.staff.length === 0 && (
        <div className="up-card">
          <strong>لا يوجد طاقم بصلاحيات تفصيلية بعد</strong>
          <p className="up-muted">عيّن دور «مدير منصة» أو «مشرف تعليمي» لمستخدم من قسم «المستخدمون والصلاحيات» ثم عُد هنا.</p>
        </div>
      )}

      {state.staff.map(member => (
        <section key={member.user_id} className="up-card" aria-label={member.full_name || 'موظف'}>
          <strong>
            <Emoji>{member.role === 'platform_manager' ? '🏢' : '🧭'}</Emoji>
            {member.full_name || 'بدون اسم'}
            <span className="up-muted">— {roleLabel(member.role)}{member.user_id === user?.id ? ' (أنت)' : ''}</span>
          </strong>
          {member.permissions.length === 0
            ? <p className="up-muted">لا صلاحيات بعد — لا يرى أي قسم إداري.</p>
            : (
              <ul className="sp-list">
                {member.permissions.map(p => (
                  <li key={p.id} className="up-invite">
                    <span><b>{capabilityLabel(p.capability)}</b> · <span className="up-muted">{scopeLabel(p.scope_kind, p.scope_value, catalog)}</span></span>
                    {canManage(member) && (role === 'admin' || canGrantLocally({ granterRole: role, granterCaps, capability: p.capability, scope: p, catalog })) && (
                      <button type="button" className="up-link-danger" disabled={busyId === p.id} onClick={() => revoke(member, p)}>سحب</button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          {canManage(member) && (
            <>
              <GrantForm member={member} catalog={catalog} granterRole={role} granterCaps={granterCaps} onDone={() => { triggerToast('تم منح الصلاحية ✓'); load(); }} />
              {role === 'admin' && member.role === 'platform_manager' && (
                <div className="up-row">
                  <button type="button" className="btn-secondary" disabled={busyId === member.user_id} onClick={() => preset(member)}>
                    منح كل صلاحيات مدير المنصة
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      ))}
    </div>
  );
}
