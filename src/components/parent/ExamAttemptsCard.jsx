import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

// آخر محاولات محاكي امتحانات السفارة — بيانات حقيقية من exam_attempts (حساب ولي الأمر)
export default function ExamAttemptsCard() {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState([]);
  const [state, setState] = useState('loading'); // loading | ready | error | no-session

  useEffect(() => {
    if (!supabase || !user?.id) { setState('no-session'); return; }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('exam_attempts')
        .select('id, child_name, correct_count, attempted_count, total_questions, percentage, band, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      if (cancelled) return;
      if (error) { setState('error'); return; }
      setAttempts(data || []);
      setState('ready');
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const bandColor = (pct) => (pct >= 85 ? '#2563eb' : pct >= 65 ? '#16a34a' : pct >= 50 ? '#ca8a04' : '#dc2626');

  return (
    <section style={{
      background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)',
      padding: '24px', boxShadow: 'var(--shadow-sm)', marginBottom: '30px'
    }}>
      <h3 style={{ fontSize: '18px', color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <span>📊</span> آخر محاولات محاكي الامتحان
      </h3>
      <span style={{ fontSize: '12.5px', color: 'var(--muted)' }}>
        نتائج حقيقية محفوظة في حسابك — المحاكي تدريبي وغير رسمي
      </span>

      <div style={{ marginTop: '14px' }}>
        {state === 'loading' && <div style={{ color: 'var(--muted)', fontSize: '13px', fontWeight: 700 }}>جارٍ التحميل…</div>}
        {state === 'no-session' && (
          <div style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 700 }}>
            سجّل الدخول لتُحفظ نتائج المحاولات تلقائياً وتظهر هنا.
          </div>
        )}
        {state === 'error' && (
          <div style={{ fontSize: '13px', color: 'var(--red-text)', fontWeight: 700 }}>تعذر جلب المحاولات حالياً.</div>
        )}
        {state === 'ready' && attempts.length === 0 && (
          <div style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 700 }}>
            لا توجد محاولات محفوظة بعد — جرّب المحاكي وستظهر النتيجة هنا فور التسليم.
          </div>
        )}
        {state === 'ready' && attempts.length > 0 && (
          <div style={{ display: 'grid', gap: '8px' }}>
            {attempts.map(a => (
              <div key={a.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap',
                border: '1px solid var(--line)', borderRadius: '12px', padding: '10px 14px', background: 'var(--bg)'
              }}>
                <div style={{ fontWeight: 800, fontSize: '13px', color: '#334155' }}>
                  🧒 {a.child_name || '—'}
                  <span style={{ color: 'var(--muted)', fontWeight: 600, fontSize: '11.5px', marginRight: '8px' }}>
                    {a.created_at ? new Date(a.created_at).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--muted)' }}>
                    {a.correct_count}/{a.total_questions} صحيحة
                  </span>
                  <span style={{
                    fontWeight: 900, fontSize: '13px', color: 'white', background: bandColor(a.percentage),
                    padding: '4px 12px', borderRadius: 'var(--radius-full)'
                  }}>
                    {Math.round(a.percentage)}% · {a.band || ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
