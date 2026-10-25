/**
 * AnalyticsDashboard.jsx — لوحة التحليلات (معلم/أدمن)
 * أعيد بناؤها بأسلوب المشروع (inline styles + متغيرات الثيم) بعد اكتشاف أن
 * النسخة السابقة كُتبت بكلاسات Tailwind والمشروع لا يحتوي Tailwind أصلاً.
 * سياسة «لا بيانات وهمية»: كل الأرقام من Supabase، فلتر الفترة فعّال حقيقياً،
 * الـ sparkline محسوب من سجل التعلم الفعلي، والفراغ يُعرض صراحة.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import AnalyticsCard from './AnalyticsCard';

const CARD = {
  background: 'var(--card-bg, #fff)', border: '1px solid var(--line, #e2e8f0)',
  borderRadius: 16, padding: 20, minWidth: 0,
};
const H3 = { fontSize: 15.5, fontWeight: 900, color: 'var(--navy, #0f172a)', margin: '0 0 14px' };
const MUTED = 'var(--muted, #64748b)';
const DONUT_COLORS = ['#2563eb', '#16a34a', '#ea580c', '#9333ea', '#0d9488', '#dc2626'];

function EmptyBox({ text }) {
  return (
    <div style={{ textAlign: 'center', padding: '28px 10px', color: MUTED, fontSize: 13 }}>
      <div style={{ fontSize: 28, marginBottom: 6 }}>📭</div>
      {text}
    </div>
  );
}

function BarChart({ data, title }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={CARD}>
      <h3 style={H3}>{title}</h3>
      {data.length === 0 ? (
        <EmptyBox text="لا توجد دروس مكتملة في هذه الفترة" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                width: 110, fontSize: 12.5, color: MUTED, fontWeight: 700,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0,
              }} title={item.label}>{item.label}</span>
              <div style={{ flex: 1, height: 26, background: 'var(--bg, #f1f5f9)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${(item.value / max) * 100}%`,
                  background: 'linear-gradient(to left, #2563eb, #3b82f6)',
                  borderRadius: 8, transition: 'width 0.5s ease',
                }} />
              </div>
              <span style={{ width: 34, fontSize: 13, fontWeight: 900, color: 'var(--navy, #0f172a)', textAlign: 'left', flexShrink: 0 }}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DonutChart({ data, title, centerLabel }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  let cumulative = 0;
  return (
    <div style={CARD}>
      <h3 style={H3}>{title}</h3>
      {total === 0 ? (
        <EmptyBox text="لا يوجد أطفال مسجلون بعد" />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
            <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              {data.map((item, idx) => {
                const pct = (item.value / total) * 100;
                const seg = (
                  <circle key={item.label} cx="18" cy="18" r="15.9" fill="none"
                    stroke={DONUT_COLORS[idx % DONUT_COLORS.length]} strokeWidth="3.4"
                    strokeDasharray={`${pct} ${100 - pct}`} strokeDashoffset={-cumulative} />
                );
                cumulative += pct;
                return seg;
              })}
            </svg>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--navy, #0f172a)' }}>{total}</span>
              <span style={{ fontSize: 10.5, color: MUTED }}>{centerLabel}</span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 140, display: 'flex', flexDirection: 'column', gap: 7 }}>
            {data.map((item, idx) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                  background: DONUT_COLORS[idx % DONUT_COLORS.length],
                }} />
                <span style={{ flex: 1, fontSize: 12.5, color: MUTED }}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--navy, #0f172a)' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityTimeline({ activities }) {
  return (
    <div style={CARD}>
      <h3 style={H3}>🕐 آخر النشاطات</h3>
      {activities.length === 0 ? (
        <EmptyBox text="لا توجد نشاطات في هذه الفترة" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 300, overflowY: 'auto' }}>
          {activities.map((a, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{
                width: 32, height: 32, borderRadius: '50%', background: '#eff6ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0,
              }}>{a.icon}</span>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--navy, #0f172a)', fontWeight: 700 }}>{a.text}</p>
                <p style={{ margin: 0, fontSize: 11.5, color: MUTED }}>{a.time}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const PERIODS = [
  { key: 'week', label: 'أسبوع', days: 7 },
  { key: 'month', label: 'شهر', days: 30 },
  { key: 'all', label: 'الكل', days: null },
];

export default function AnalyticsDashboard() {
  const { role } = useAuth();
  // المعلم يرى طلابه المسندين فقط (RLS)، ولا صلاحية له على الأسر/السلاسل —
  // نعرض «—» بدل صفر مضلل، والأدمن يرى المنصة كاملة
  const isTeacher = role === 'teacher';
  const [stats, setStats] = useState(null);
  const [subjectData, setSubjectData] = useState([]);
  const [gradeData, setGradeData] = useState([]);
  const [activities, setActivities] = useState([]);
  const [trend, setTrend] = useState([]);
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // أرقام حقيقية فقط من الجداول الموجودة؛ الغياب يظهر صفراً لا رقماً مختلقاً
      const [familiesRes, childrenRes, streaksRes, subjectsRes, lessonsRes, recordsRes] = await Promise.all([
        supabase.from('parent_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('children').select('id, grade'),
        supabase.from('child_streaks').select('current_streak, xp_total'),
        supabase.from('curriculum_subjects').select('key, title'),
        supabase.from('curriculum_lessons').select('id, subject_key'),
        supabase.from('learning_records').select('child_id, lesson_id, status, score, updated_at'),
      ]);
      const firstError = [familiesRes, childrenRes, streaksRes, subjectsRes, lessonsRes, recordsRes]
        .map(r => r.error).find(Boolean);
      if (firstError) throw firstError;

      const children = childrenRes.data || [];
      const streaks = streaksRes.data || [];
      const subjects = subjectsRes.data || [];
      const lessons = lessonsRes.data || [];
      const allRecords = recordsRes.data || [];

      // الفلتر الزمني فعّال حقيقياً: يحدد نطاق السجلات المحتسبة
      const days = PERIODS.find(p => p.key === period)?.days;
      const cutoff = days ? Date.now() - days * 24 * 60 * 60 * 1000 : null;
      const records = cutoff
        ? allRecords.filter(r => r.updated_at && new Date(r.updated_at).getTime() >= cutoff)
        : allRecords;
      const doneRecords = records.filter(r => r.status === 'completed');

      setStats({
        totalFamilies: familiesRes.count || 0,
        totalChildren: children.length,
        totalLessons: lessons.length,
        activeStreaks: streaks.filter(s => s.current_streak > 0).length,
        completionRate: records.length > 0 ? Math.round((doneRecords.length / records.length) * 100) : 0,
        avgXP: streaks.length > 0 ? Math.round(streaks.reduce((s, x) => s + (x.xp_total || 0), 0) / streaks.length) : 0,
        periodRecords: records.length,
      });

      // سلسلة حقيقية: دروس أُكملت يومياً خلال آخر 7 أيام (من السجل الفعلي)
      const dayMs = 24 * 60 * 60 * 1000;
      const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
      const perDay = Array.from({ length: 7 }, (_, i) => {
        const dayStart = startOfToday.getTime() - (6 - i) * dayMs;
        return allRecords.filter(r =>
          r.status === 'completed' && r.updated_at &&
          new Date(r.updated_at).getTime() >= dayStart &&
          new Date(r.updated_at).getTime() < dayStart + dayMs
        ).length;
      });
      setTrend(perDay.some(v => v > 0) ? perDay : []);

      const gradeCount = {};
      children.forEach(c => {
        const g = c.grade || 'غير محدد';
        gradeCount[g] = (gradeCount[g] || 0) + 1;
      });
      setGradeData(Object.entries(gradeCount).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value));

      const subjectOfLesson = Object.fromEntries(lessons.map(l => [l.id, l.subject_key]));
      const perSubject = {};
      doneRecords.forEach(r => {
        const k = subjectOfLesson[r.lesson_id];
        if (k) perSubject[k] = (perSubject[k] || 0) + 1;
      });
      setSubjectData(
        subjects.map(s => ({ label: s.title, value: perSubject[s.key] || 0 }))
          .filter(s => s.value > 0).sort((a, b) => b.value - a.value).slice(0, 5)
      );

      setActivities(
        [...doneRecords]
          .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
          .slice(0, 10)
          .map(p => ({
            icon: p.score >= 80 ? '⭐' : '📚',
            text: p.score != null ? `طالب أكمل درساً بنتيجة ${p.score}%` : 'طالب أكمل درساً',
            time: new Date(p.updated_at).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }),
          }))
      );
      setUpdatedAt(new Date());
    } catch (err) {
      console.error('Analytics error:', err);
      setError('تعذر تحميل البيانات من الخادم — تحقق من الاتصال والصلاحيات ثم أعد المحاولة');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, gap: 12, color: MUTED }} dir="rtl">
        <div className="spinner" style={{
          width: 42, height: 42, border: '4px solid #e2e8f0', borderTopColor: '#2563eb',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ fontSize: 13.5, fontWeight: 700 }}>جارٍ تحميل التحليلات…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div dir="rtl" style={{ ...CARD, textAlign: 'center', margin: '24px auto', maxWidth: 480, padding: 32 }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>⚠️</div>
        <p style={{ color: 'var(--navy, #0f172a)', fontWeight: 800, fontSize: 14.5, margin: '0 0 16px' }}>{error}</p>
        <button onClick={loadAnalytics} style={{
          border: 'none', background: '#2563eb', color: '#fff', borderRadius: 10,
          padding: '10px 22px', fontWeight: 800, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit',
        }}>🔄 إعادة المحاولة</button>
      </div>
    );
  }

  const periodLabel = PERIODS.find(p => p.key === period)?.label;

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '18px 16px', maxWidth: 1200, margin: '0 auto' }}>
      {/* الترويسة + فلتر فترة فعّال */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 21, fontWeight: 900, color: 'var(--navy, #0f172a)', margin: 0 }}>📊 لوحة التحليلات</h2>
          {updatedAt && (
            <span style={{ fontSize: 11.5, color: MUTED }}>
              آخر تحديث: {updatedAt.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
              {' · '}النطاق: {period === 'all' ? 'كل الفترات' : `آخر ${periodLabel}`}
              {isTeacher && ' · بيانات طلابك المسندين فقط'}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg, #f1f5f9)', borderRadius: 12, padding: 4 }}>
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)} style={{
              border: 'none', borderRadius: 9, padding: '8px 16px', fontSize: 13, fontWeight: 800,
              fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.15s ease',
              background: period === p.key ? 'var(--card-bg, #fff)' : 'transparent',
              color: period === p.key ? '#2563eb' : MUTED,
              boxShadow: period === p.key ? '0 1px 4px rgba(15,23,42,0.12)' : 'none',
            }}>{p.label}</button>
          ))}
        </div>
      </div>

      {/* بطاقات المؤشرات */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <AnalyticsCard title="الأسر المسجلة" value={isTeacher ? '—' : stats.totalFamilies} hint={isTeacher ? 'أدمن فقط' : undefined} icon="👨‍👩‍👧‍👦" color="blue" />
        <AnalyticsCard title={isTeacher ? 'طلابي' : 'الأطفال'} value={stats.totalChildren} icon="👧" color="green" />
        <AnalyticsCard title="دروس المنهج" value={stats.totalLessons} icon="📚" color="purple" />
        <AnalyticsCard title="نشطون (Streak)" value={isTeacher ? '—' : stats.activeStreaks} hint={isTeacher ? 'أدمن فقط' : undefined} icon="🔥" color="orange" />
        <AnalyticsCard title="متوسط XP" value={isTeacher ? '—' : stats.avgXP} hint={isTeacher ? 'أدمن فقط' : undefined} icon="⭐" color="teal" />
        <AnalyticsCard
          title={`معدل الإتمام (${period === 'all' ? 'الكل' : periodLabel})`}
          value={`${stats.completionRate}%`}
          hint={`من ${stats.periodRecords} سجل`}
          icon="✅" color="green" trend={trend}
        />
      </div>

      {/* الرسوم */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 16 }}>
        <BarChart data={subjectData} title={`📖 المواد الأكثر تفاعلاً (${period === 'all' ? 'الكل' : periodLabel})`} />
        <DonutChart data={gradeData} title="🎓 توزيع الصفوف" centerLabel="طفل" />
        <ActivityTimeline activities={activities} />
      </div>

      {/* رؤى سريعة — من نفس الأرقام الحقيقية أعلاه */}
      <div style={{
        background: 'linear-gradient(to left, #2563eb, #4f46e5)', borderRadius: 16,
        padding: 20, color: '#fff',
      }}>
        <h3 style={{ fontSize: 15.5, fontWeight: 900, margin: '0 0 12px' }}>💡 رؤى سريعة</h3>
        {activities.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
            {[
              ['دروس مكتملة معروضة', activities.length],
              ['نسبة الإتمام', `${stats.completionRate}%`],
              ['طلاب بسلسلة نشطة 🔥', stats.activeStreaks],
            ].map(([label, value]) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 14 }}>
                <p style={{ margin: 0, fontSize: 12, opacity: 0.85 }}>{label}</p>
                <p style={{ margin: 0, fontSize: 19, fontWeight: 900 }}>{value}</p>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 14, textAlign: 'center', fontSize: 13.5 }}>
            📊 ستظهر الرؤى هنا تلقائياً بعد تراكم بيانات استخدام حقيقية في هذا النطاق
          </div>
        )}
      </div>
    </div>
  );
}
