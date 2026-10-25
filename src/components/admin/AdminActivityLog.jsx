/**
 * AdminActivityLog.jsx
 * سجل النشاطات للوحة الإدارة — بيانات حقيقية من جدول activity_log في Supabase
 * (RLS: القراءة للإدارة فقط؛ الكتابة عبر lib/activityLog.js)
 * لا صفوف وهمية: عند غياب الأحداث تظهر حالة فارغة صريحة.
 */
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const ACTION_LABELS = {
  'question.create': { text: 'أضاف سؤالاً لبنك الأسئلة', icon: '➕', badge: 'بنك الأسئلة' },
  'question.update': { text: 'عدّل سؤالاً في بنك الأسئلة', icon: '✏️', badge: 'بنك الأسئلة' },
  'question.delete': { text: 'حذف سؤالاً من بنك الأسئلة', icon: '🗑', badge: 'بنك الأسئلة' },
  'lesson.publish': { text: 'نشر درساً', icon: '📢', badge: 'المنهج' },
};

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleString('ar-EG', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function AdminActivityLog() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supabase) { setLoading(false); return; }
      const { data, error: e } = await supabase
        .from('activity_log')
        .select('id, actor_name, action, entity, entity_id, details, created_at')
        .order('created_at', { ascending: false })
        .limit(30);
      if (cancelled) return;
      if (e) setError(e.message); else setRows(data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{
      background: 'var(--card-bg)',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      border: '1px solid var(--line)'
    }}>
      <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        📋 سجل النشاطات
        {rows.length > 0 && (
          <span style={{ fontSize: '11px', background: 'var(--blue-light)', color: 'var(--blue)', padding: '3px 8px', borderRadius: '8px', fontWeight: 600 }}>
            آخر {rows.length} حدث
          </span>
        )}
      </h3>

      {loading && (
        <div style={{ color: 'var(--muted)', fontSize: '13px', padding: '12px' }}>جارٍ تحميل السجل...</div>
      )}

      {!loading && error && (
        <div style={{ color: 'var(--muted)', fontSize: '13px', padding: '12px', border: '1px dashed var(--line)', borderRadius: '8px' }}>
          ⚠️ تعذر تحميل السجل: {error}
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px', border: '1px dashed var(--line)', borderRadius: '10px', color: 'var(--muted)' }}>
          <div style={{ fontSize: '24px', marginBottom: '6px' }}>📭</div>
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '2px' }}>لا توجد أحداث مسجلة بعد</div>
          <div style={{ fontSize: '12px' }}>ستظهر هنا إجراءات المعلمين والإدارة (بنك الأسئلة، المنهج...) فور حدوثها</div>
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {rows.map((log) => {
            const meta = ACTION_LABELS[log.action] || { text: log.action, icon: '•', badge: log.entity || 'حدث' };
            const detail = log.details?.question ? ` — «${log.details.question}»` : '';
            return (
              <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--bg)', borderRadius: '8px', fontSize: '13px' }}>
                <span style={{ background: 'var(--line)', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', color: 'var(--muted)', whiteSpace: 'nowrap', textAlign: 'center' }}>
                  {formatTime(log.created_at)}
                </span>
                <span style={{ fontWeight: 600, color: 'var(--navy)', whiteSpace: 'nowrap' }}>
                  {log.actor_name || 'مستخدم'}
                </span>
                <span style={{ flex: 1, color: 'var(--muted)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {meta.icon} {meta.text}{detail}
                </span>
                <span style={{ background: 'var(--blue-light)', color: 'var(--blue)', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {meta.badge}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
