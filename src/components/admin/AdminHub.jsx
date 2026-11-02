/**
 * AdminHub — غلاف عام لمراكز الإدارة (مركز المحتوى، الطلاب والأسر).
 * يعرض خطوات المركز مرتّبة ومرقّمة، ثم محتوى الخطوة النشطة عبر renderView.
 * الخطوات تُصفّى حسب الدور، والخادم يفرض الصلاحيات فعلياً (RLS / RPC).
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { fetchHubPendingCounts } from '../../lib/hubPendingCounts';
import { ADMIN_HUBS, hubViewsForRole, hubViewPath } from '../../navigation/navConfig';
import Emoji from '../../ui/Emoji';
import './ContentHub.css';

export default function AdminHub({ hubId, role, view, renderView }) {
  const navigate = useNavigate();
  const hub = ADMIN_HUBS[hubId];
  const views = hubViewsForRole(hubId, role);
  const active = views.some(v => v.id === view) ? view : views[0]?.id;
  const [pending, setPending] = useState({});

  // يُعاد الحساب عند تبديل الخطوة، فتتحدّث الأرقام بعد الاعتماد/القبول.
  useEffect(() => {
    let alive = true;
    fetchHubPendingCounts(supabase, hubViewsForRole(hubId, role)).then(c => { if (alive) setPending(c); });
    return () => { alive = false; };
  }, [hubId, role, active]);
  if (!hub || !active) return null;

  return (
    <section className="content-hub" aria-labelledby={`${hubId}-hub-title`}>
      <header className="content-hub-head">
        <h2 id={`${hubId}-hub-title`}><Emoji>{hub.icon}</Emoji> {hub.title}</h2>
        <p>{hub.intro}</p>
      </header>

      <nav className="content-hub-steps" role="tablist" aria-label={`مراحل ${hub.title}`}>
        {views.map((v, i) => (
          <div key={v.id} className="content-hub-step-wrap">
            {i > 0 && <span className="content-hub-arrow" aria-hidden="true">←</span>}
            <button
              type="button"
              role="tab"
              id={`${hubId}-hub-tab-${v.id}`}
              aria-selected={active === v.id}
              aria-controls={`${hubId}-hub-panel`}
              className={`content-hub-step ${active === v.id ? 'active' : ''}`}
              onClick={() => navigate(hubViewPath(v))}
            >
              <span className="content-hub-num" aria-hidden="true">{v.step}</span>
              <span className="content-hub-icon" aria-hidden="true"><Emoji>{v.icon}</Emoji></span>
              <span className="content-hub-text">
                <strong>
                  {v.label}
                  {pending[v.id] > 0 && (
                    <span className="content-hub-badge" aria-label={`${pending[v.id]} بانتظار الإجراء`}>{pending[v.id]}</span>
                  )}
                </strong>
                <small>{v.hint}</small>
              </span>
            </button>
          </div>
        ))}
      </nav>

      <div id={`${hubId}-hub-panel`} role="tabpanel" aria-labelledby={`${hubId}-hub-tab-${active}`} className="content-hub-panel">
        {renderView(active)}
      </div>
    </section>
  );
}
