import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';
import { gradeLabel } from '../../utils/gradeLabel';
import AssessmentSection from './AssessmentSection';
import { buildChildInsights, buildReportProgressStats } from '../../utils/childInsights';
import { fetchChildQuestionAttempts } from '../../lib/childQuestionAttempts';

const box = { border: '1px solid var(--line)', borderRadius: 12, padding: 12, background: 'var(--card-bg)' };
const dt = (v) => (v ? new Date(v).toLocaleDateString('ar-EG') : '—');

/** تحليلات طفل واحد من السحابة (بيانات حقيقية فقط). تُحمَّل عند فتح البطاقة. */
export default function ChildInsightsPanel({ child, parentId, sameNameCount = 1 }) {
  const { curriculumData, triggerToast } = useApp();
  const [pdfBusy, setPdfBusy] = useState(false);
  const [state, setState] = useState({ loading: true, error: '', data: null });

  useEffect(() => {
    let off = false;
    (async () => {
      if (!supabase) { setState({ loading: false, error: 'غير متصل', data: null }); return; }
      const since = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
      try {
        const [rec, st, da, attempts, jn] = await Promise.all([
          supabase.from('learning_records').select('lesson_id,status,score,updated_at').eq('child_id', child.id),
          supabase.from('child_streaks').select('*').eq('child_id', child.id).maybeSingle(),
          supabase.from('child_daily_activity').select('activity_date,lessons_completed,xp_earned').eq('child_id', child.id).gte('activity_date', since),
          fetchChildQuestionAttempts(supabase, child, sameNameCount, parentId),
          supabase.from('live_join_log').select('slot_id,joined_at').eq('child_id', child.id).order('joined_at', { ascending: false }).limit(50),
        ]);
        if (off) return;
        const err = rec.error || st.error || da.error || jn.error;
        if (err) throw err;
        setState({
          loading: false, error: '',
          data: buildChildInsights({
            records: rec.data || [], streak: st.data, daily: da.data || [],
            attempts,
            joins: jn.data || [],
          }),
        });
      } catch (error) {
        if (!off) setState({ loading: false, error: error.message || 'تعذر تحميل المحاولات', data: null });
      }
    })();
    return () => { off = true; };
  }, [child.id, child.name, parentId, sameNameCount]);

  const downloadPdf = async () => {
    if (pdfBusy || !state.data) return;
    setPdfBusy(true);
    try {
      const d0 = state.data;
      const done = new Set(d0.completedIds);
      const subjects = Object.values(curriculumData || {}).filter(sub => sub && Array.isArray(sub.lessons) && (!sub.grade || !child.grade || sub.grade === child.grade)).map(sub => {
        const completed = sub.lessons.filter(l => done.has(l.id)).length;
        return { name: sub.title, emoji: sub.icon || '📘', completed, total: sub.lessons.length, percent: sub.lessons.length ? Math.round((completed / sub.lessons.length) * 100) : 0 };
      }).filter(x => x.total > 0);
      const { downloadWeeklyReport } = await import('../parent/WeeklyReportPDF');
      await downloadWeeklyReport({
        child: { name: child.name, grade: gradeLabel(child.grade) },
        streak: { currentStreak: d0.streak?.current || 0, bestStreak: d0.streak?.best || 0, xpTotal: d0.streak?.xp || 0, level: d0.streak?.level || 1 },
        stats: { ...buildReportProgressStats(subjects), hoursStudied: 0 },
        subjects,
        weekRange: `حتى ${new Date().toLocaleDateString('ar-EG', { month: 'long', day: 'numeric', year: 'numeric' })}`,
      });
      triggerToast('✅ تم تحميل التقرير');
    } catch (e) {
      console.error(e); triggerToast('❌ تعذر إنشاء التقرير');
    } finally { setPdfBusy(false); }
  };

  if (state.loading) return <div style={{ padding: 8 }}>⏳ جارٍ تحميل التحليلات…</div>;
  if (state.error) return <div className="acct-alert error" role="alert">⚠️ <span>تعذر التحميل: {state.error}</span></div>;
  const d = state.data;
  if (!d.hasAnyData) return <div className="fam-empty">لا نشاط مرتبط بمعرّف ملف {child.name} بعد. المحاولات القديمة غير المرتبطة بمعرّف طفل لا تدخل في التحليلات.</div>;
  const max = Math.max(1, ...d.last14.map(x => x.lessons));

  return (
    <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 8 }}>
        <div style={box}><small>دروس مكتملة</small><h3>{d.lessonsDone}</h3></div>
        <div style={box}><small>دروس بدأها</small><h3>{d.lessonsStarted}</h3></div>
        <div style={box}><small>دقة الأسئلة</small><h3>{d.quiz.pct === null ? '—' : `${d.quiz.pct}%`}</h3><small>{d.quiz.total} إجابة مرتبطة بمعرّف الطفل؛ لا تشمل المحاولات القديمة غير المرتبطة</small></div>
        <div style={box}><small>أيام النشاط (14 يوم)</small><h3>{d.activeDays14}</h3></div>
        {d.streak && <div style={box}><small>السلسلة الحالية / الأفضل</small><h3>{d.streak.current} / {d.streak.best}</h3><small>⭐ {d.streak.xp} XP · Lv.{d.streak.level}</small></div>}
        <div style={box}><small>آخر نشاط</small><h3 style={{ fontSize: 14 }}>{dt(d.lastActivity)}</h3></div>
      </div>

      <div style={box}>
        <strong>النشاط خلال 14 يوماً</strong>
        <div role="img" aria-label="رسم نشاط آخر 14 يوماً" style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 54, marginTop: 8 }}>
          {d.last14.map(x => (
            <div key={x.date} title={`${x.date}: ${x.lessons} درس`}
              style={{ flex: 1, minHeight: 3, height: `${Math.max(6, (x.lessons / max) * 100)}%`, background: x.lessons ? 'var(--navy)' : 'var(--line)', borderRadius: 3 }} />
          ))}
        </div>
      </div>

      <div style={box}>
        <strong>🔴 الحصص المباشرة</strong>
        {d.live.total === 0
          ? <p style={{ margin: '6px 0 0' }}>لم يسجَّل انضمام لأي حصة بعد. (يُسجَّل عند ضغط «انضم للحصة».)</p>
          : <>
              <p style={{ margin: '6px 0' }}>انضم لـ <strong>{d.live.total}</strong> حصة{d.live.total >= 50 ? ' (آخر 50)' : ''}.</p>
              <small>آخر الانضمامات: {d.live.recent.map(j => new Date(j.joined_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })).join(' · ')}</small>
            </>}
        <div><small>ملاحظة: يُحسب الحضور من ضغط زر الانضمام فقط، لا من مدة البقاء.</small></div>
      </div>

      {(d.weakest.length > 0 || d.strongest.length > 0) && (
        <div style={box}>
          {d.weakest.length > 0 && <p style={{ margin: '0 0 6px' }}>🔻 <strong>تحتاج دعماً:</strong> {d.weakest.map(s => `${s.skill} (${s.pct}%)`).join('، ')}</p>}
          {d.strongest.length > 0 && <p style={{ margin: 0 }}>🔺 <strong>نقاط القوة:</strong> {d.strongest.map(s => `${s.skill} (${s.pct}%)`).join('، ')}</p>}
          <small>تُحسب المهارة بعد 3 إجابات على الأقل.</small>
        </div>
      )}
      <AssessmentSection child={child} subjects={Object.values(curriculumData || {}).filter(x => x && Array.isArray(x.lessons) && x.lessons.length && (!x.grade || x.grade === child.grade))} />
      <button type="button" className="fam-out" onClick={downloadPdf} disabled={pdfBusy}>{pdfBusy ? '⏳ جارٍ الإنشاء…' : '📄 تحميل تقرير التقدم PDF'}</button>
    </div>
  );
}
