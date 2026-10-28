/**
 * SkillsReport.jsx — تقرير مهارات الطفل لولي الأمر (م3)
 * المصدر: إجابات أسئلة بنك الدروس المحفوظة في lesson_question_attempts (RLS: ولي الأمر يرى محاولات أبنائه فقط)
 * لا بيانات وهمية: بدون محاولات محفوظة تظهر حالة فارغة صريحة.
 */
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import Emoji from '../../ui/Emoji';

const card = {
  background: 'var(--card-bg)', border: '1px solid var(--line)',
  borderRadius: 16, padding: '18px 20px', marginTop: 16,
  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
};

function mergeSkills(target, skills) {
  Object.entries(skills).forEach(([key, s]) => {
    if (!target[key]) target[key] = { correct: 0, total: 0, subject: s.subject };
    target[key].correct += s.correct;
    target[key].total += s.total;
  });
}

export default function SkillsReport() {
  const { user } = useAuth();
  const [byChild, setByChild] = useState(null); // { childName: { skills, attempts } }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supabase || !user?.id) { setLoading(false); return; }
      const bankRes = await supabase
        .from('lesson_question_attempts')
        .select('child_name, is_correct, skill, created_at')
        .order('created_at', { ascending: false })
        .limit(300);
      if (cancelled) return;
      if (bankRes.error) { setError(bankRes.error.message); setLoading(false); return; }
      const grouped = {};
      // محاولات أسئلة بنك الدروس — كل صف إجابة واحدة على سؤال
      (bankRes.data || []).forEach(a => {
        const name = a.child_name || 'طفل غير مسمى';
        if (!grouped[name]) grouped[name] = { skills: {}, attempts: 0, lastAt: a.created_at };
        const key = a.skill || 'أسئلة بلا وسم مهارة';
        mergeSkills(grouped[name].skills, {
          [key]: { correct: a.is_correct ? 1 : 0, total: 1, subject: 'بنك أسئلة الدروس' },
        });
        grouped[name].bankAnswers = (grouped[name].bankAnswers || 0) + 1;
      });
      setByChild(grouped);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const children = byChild ? Object.entries(byChild).filter(([, v]) => v.attempts > 0 || v.bankAnswers > 0) : [];

  return (
    <section style={card} dir="rtl">
      <h2 style={{ fontSize: 17, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
        🎯 تقرير المهارات
        <span style={{ fontSize: 11, background: 'var(--yellow-light)', color: 'var(--amber-text)', padding: '2px 8px', borderRadius: 8, fontWeight: 700 }}>
          من أسئلة بنك الدروس
        </span>
      </h2>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '0 0 12px' }}>
        يُحسب من إجابات طفلك الفعلية على أسئلة الدروس
      </p>

      {loading && <div style={{ color: 'var(--muted)', fontSize: 13 }}>جارٍ تحميل المحاولات...</div>}

      {!loading && error && (
        <div style={{ color: 'var(--muted)', fontSize: 13, border: '1px dashed var(--line)', borderRadius: 10, padding: 12 }}>
          ⚠️ تعذر تحميل التقرير: {error}
        </div>
      )}

      {!loading && !error && children.length === 0 && (
        <div style={{ textAlign: 'center', padding: 22, border: '1px dashed var(--line)', borderRadius: 12, color: 'var(--muted)' }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}><Emoji>📭</Emoji></div>
          <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 2 }}>لا توجد إجابات محفوظة بعد</div>
          <div style={{ fontSize: 12.5 }}>
            عندما يجيب طفلك على أسئلة الدروس وأنت مسجل الدخول، سيظهر تحليل مهاراته هنا تلقائياً
          </div>
        </div>
      )}

      {!loading && !error && children.map(([childName, info]) => {
        const rows = Object.entries(info.skills)
          .map(([skill, s]) => ({ skill, ...s, pct: s.total ? Math.round((s.correct / s.total) * 100) : 0 }))
          .sort((a, b) => a.pct - b.pct);
        const weak = rows.filter(r => r.pct < 50);
        return (
          <div key={childName} style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <strong style={{ fontSize: 14.5 }}>👧 {childName}</strong>
              <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                ({info.attempts > 0 ? `${info.attempts} محاولة اختبار` : ''}{info.attempts > 0 && info.bankAnswers > 0 ? ' + ' : ''}{info.bankAnswers > 0 ? `${info.bankAnswers} إجابة أسئلة دروس` : ''})
              </span>
            </div>

            {weak.length > 0 && (
              <div style={{ background: 'var(--orange-light)', border: '1px solid var(--line)', borderRadius: 10, padding: '8px 12px', fontSize: 12.5, color: '#9a3412', marginBottom: 10 }}>
                💡 تحتاج تركيزاً: {weak.map(r => r.skill).join('، ')}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rows.map(r => {
                const barColor = r.pct >= 75 ? '#16a34a' : r.pct >= 50 ? '#ca8a04' : '#dc2626';
                return (
                  <div key={r.skill}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 3 }}>
                      <span style={{ fontWeight: 700, color: 'var(--navy)' }}>{r.skill}</span>
                      <span style={{ color: 'var(--muted)' }}>{r.correct}/{r.total} ({r.pct}%)</span>
                    </div>
                    <div style={{ height: 8, background: 'var(--line)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${r.pct}%`, height: '100%', background: barColor, borderRadius: 999, transition: 'width .3s' }} />
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>{r.subject}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
