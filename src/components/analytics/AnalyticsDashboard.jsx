/**
 * AnalyticsDashboard.jsx
 * لوحة تحليلات شاملة للإدارة
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AnalyticsCard from './AnalyticsCard';

// Simple Bar Chart Component
function BarChart({ data, title }) {
  const max = Math.max(...data.map(d => d.value)) || 1;
  
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-bold text-gray-800 mb-4">{title}</h3>
      <div className="space-y-3">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <span className="w-20 text-sm text-gray-600 text-left truncate">{item.label}</span>
            <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden">
              <div 
                className="h-full bg-gradient-to-l from-blue-500 to-blue-600 rounded-lg transition-all duration-500"
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
            <span className="w-12 text-sm font-bold text-gray-800 text-left">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Donut Chart Component
function DonutChart({ data, title, centerLabel }) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  let cumulative = 0;
  
  const colors = ['#2563eb', '#16a34a', '#ea580c', '#9333ea', '#0d9488', '#dc2626'];
  
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-bold text-gray-800 mb-4">{title}</h3>
      <div className="flex items-center gap-6">
        <div className="relative w-32 h-32">
          <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
            {data.map((item, idx) => {
              const percentage = (item.value / total) * 100;
              const dashArray = `${percentage} ${100 - percentage}`;
              const dashOffset = -cumulative;
              cumulative += percentage;
              
              return (
                <circle
                  key={idx}
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke={colors[idx % colors.length]}
                  strokeWidth="3"
                  strokeDasharray={dashArray}
                  strokeDashoffset={dashOffset}
                  className="transition-all duration-500"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <span className="text-2xl font-bold text-gray-800">{total}</span>
              <span className="block text-xs text-gray-500">{centerLabel}</span>
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          {data.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: colors[idx % colors.length] }}
              />
              <span className="text-sm text-gray-600 flex-1">{item.label}</span>
              <span className="text-sm font-bold text-gray-800">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Activity Timeline
function ActivityTimeline({ activities }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-bold text-gray-800 mb-4">آخر النشاطات</h3>
      <div className="space-y-4 max-h-80 overflow-y-auto">
        {activities.length === 0 ? (
          <p className="text-gray-500 text-center py-8">لا توجد نشاطات بعد</p>
        ) : (
          activities.map((activity, idx) => (
            <div key={idx} className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm flex-shrink-0">
                {activity.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800">{activity.text}</p>
                <p className="text-xs text-gray-500">{activity.time}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState({
    totalFamilies: 0,
    totalChildren: 0,
    totalLessons: 0,
    activeStreaks: 0,
    completionRate: 0,
    avgXP: 0
  });
  const [subjectData, setSubjectData] = useState([]);
  const [gradeData, setGradeData] = useState([]);
  const [activities, setActivities] = useState([]);
  const [period, setPeriod] = useState('week'); // week, month, all
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  async function loadAnalytics() {
    setLoading(true);
    
    try {
      // أرقام حقيقية فقط من الجداول الموجودة؛ الغياب يظهر صفراً لا رقماً مختلقاً
      const { count: familiesCount } = await supabase
        .from('parent_profiles').select('*', { count: 'exact', head: true });
      const { data: children } = await supabase.from('children').select('id, grade');
      const { data: streaks } = await supabase.from('child_streaks').select('current_streak, xp_total');
      const { data: subjects } = await supabase.from('curriculum_subjects').select('key, title');
      const { data: lessons } = await supabase.from('curriculum_lessons').select('id, subject_key');
      const { data: records } = await supabase.from('learning_records').select('child_id, lesson_id, status, score, updated_at');

      const totalChildren = children?.length || 0;
      const activeStreaks = (streaks || []).filter(s => s.current_streak > 0).length;
      const avgXP = (streaks || []).length > 0
        ? Math.round(streaks.reduce((sum, s) => sum + (s.xp_total || 0), 0) / streaks.length)
        : 0;
      const doneRecords = (records || []).filter(r => r.status === 'completed');

      setStats({
        totalFamilies: familiesCount || 0,
        totalChildren,
        totalLessons: lessons?.length || 0,
        activeStreaks,
        completionRate: (records || []).length > 0 ? Math.round((doneRecords.length / records.length) * 100) : 0,
        avgXP
      });

      const gradeCount = {};
      children?.forEach(c => {
        const grade = c.grade || 'غير محدد';
        gradeCount[grade] = (gradeCount[grade] || 0) + 1;
      });
      setGradeData(
        Object.entries(gradeCount)
          .map(([label, value]) => ({ label, value }))
          .sort((a, b) => b.value - a.value)
      );

      // الدروس المكتملة لكل مادة (من learning_records الفعلية)
      const subjectOfLesson = Object.fromEntries((lessons || []).map(l => [l.id, l.subject_key]));
      const perSubject = {};
      doneRecords.forEach(r => {
        const k = subjectOfLesson[r.lesson_id];
        if (k) perSubject[k] = (perSubject[k] || 0) + 1;
      });
      setSubjectData(
        (subjects || [])
          .map(s => ({ label: s.title, value: perSubject[s.key] || 0 }))
          .filter(s => s.value > 0)
          .sort((a, b) => b.value - a.value)
          .slice(0, 5)
      );

      setActivities(
        [...doneRecords]
          .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
          .slice(0, 10)
          .map(p => ({
            icon: p.score >= 80 ? '⭐' : '📚',
            text: p.score != null ? `طالب أكمل درساً بنتيجة ${p.score}%` : 'طالب أكمل درساً',
            time: new Date(p.updated_at).toLocaleDateString('ar-SA')
          }))
      );

    } catch (err) {
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">📊 لوحة التحليلات</h2>
        <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
          {[
            { key: 'week', label: 'أسبوع' },
            { key: 'month', label: 'شهر' },
            { key: 'all', label: 'الكل' }
          ].map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                period === p.key 
                  ? 'bg-white shadow text-blue-600' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <AnalyticsCard
          title="الأسر"
          value={stats.totalFamilies}
          icon="👨‍👩‍👧‍👦"
          color="blue"
          trend={[1, 2, 2, 3, 3, stats.totalFamilies]}
        />
        <AnalyticsCard
          title="الأطفال"
          value={stats.totalChildren}
          icon="👧"
          color="green"
          trend={[2, 3, 3, 4, 4, stats.totalChildren]}
        />
        <AnalyticsCard
          title="المواد"
          value={stats.totalLessons}
          icon="📚"
          color="purple"
        />
        <AnalyticsCard
          title="نشطون (Streak)"
          value={stats.activeStreaks}
          icon="🔥"
          color="orange"
          change={`${stats.completionRate}%`}
          changeType={stats.completionRate > 50 ? 'positive' : 'neutral'}
        />
        <AnalyticsCard
          title="متوسط XP"
          value={stats.avgXP}
          icon="⭐"
          color="teal"
        />
        <AnalyticsCard
          title="معدل الإتمام"
          value={`${stats.completionRate}%`}
          icon="✅"
          color="green"
          changeType={stats.completionRate > 50 ? 'positive' : 'negative'}
        />
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <BarChart 
          data={subjectData} 
          title="📖 المواد الأكثر تفاعلاً" 
        />
        <DonutChart 
          data={gradeData} 
          title="🎓 توزيع الصفوف" 
          centerLabel="طالب"
        />
        <ActivityTimeline activities={activities} />
      </div>

      {/* Quick Insights — تُعرض فقط عند توفر بيانات حقيقية */}
      <div className="bg-gradient-to-l from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
        <h3 className="text-lg font-bold mb-3">💡 رؤى سريعة</h3>
        {activities && activities.length > 0 ? (
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-white/80 text-sm">إجمالي الأنشطة المسجلة</p>
              <p className="text-xl font-bold">{activities.length}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-white/80 text-sm">نسبة الإتمام</p>
              <p className="text-xl font-bold">{stats.completionRate}%</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-white/80 text-sm">طلاب لديهم streak نشط</p>
              <p className="text-xl font-bold">{stats.activeStreaks}</p>
            </div>
          </div>
        ) : (
          <div className="bg-white/10 rounded-xl p-4 text-center">
            <p className="text-white/90">📊 ستظهر الرؤى هنا تلقائياً بعد تراكم بيانات استخدام حقيقية</p>
          </div>
        )}
      </div>
    </div>
  );
}
