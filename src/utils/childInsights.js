// تحليلات الطفل — دوال نقية من بيانات حقيقية فقط؛ لا أرقام افتراضية (الفراغ يبقى فارغاً).
const MIN_SKILL_ATTEMPTS = 3;

export function buildChildInsights({ records = [], streak = null, daily = [], attempts = [], now = new Date() } = {}) {
  const lessonsDone = records.filter(r => r.status === 'completed').length;
  const lessonsStarted = records.filter(r => r.status !== 'completed').length;
  const total = attempts.length;
  const correct = attempts.filter(a => a.is_correct).length;
  const bySkill = {};
  attempts.forEach(a => {
    const k = a.skill || 'بلا وسم مهارة';
    const s = bySkill[k] || (bySkill[k] = { skill: k, correct: 0, total: 0 });
    s.total += 1; if (a.is_correct) s.correct += 1;
  });
  const skills = Object.values(bySkill)
    .map(s => ({ ...s, pct: Math.round((s.correct / s.total) * 100) }))
    .sort((a, b) => a.pct - b.pct || b.total - a.total);
  const reliable = skills.filter(s => s.total >= MIN_SKILL_ATTEMPTS && s.skill !== 'بلا وسم مهارة');
  const weakest = reliable.filter(s => s.pct < 70).slice(0, 3);
  const strongest = [...reliable].reverse().filter(s => s.pct >= 80).slice(0, 3);

  const byDate = Object.fromEntries(daily.map(d => [d.activity_date, d]));
  const last14 = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    last14.push({ date: key, lessons: byDate[key]?.lessons_completed || 0, xp: byDate[key]?.xp_earned || 0 });
  }
  const activeDays14 = last14.filter(d => d.lessons > 0 || d.xp > 0).length;
  const lastDates = [streak?.last_activity_date, ...records.map(r => r.updated_at)].filter(Boolean).sort();
  return {
    completedIds: records.filter(r => r.status === 'completed').map(r => r.lesson_id),
    lessonsDone, lessonsStarted,
    quiz: { total, correct, pct: total ? Math.round((correct / total) * 100) : null },
    skills, weakest, strongest,
    last14, activeDays14,
    streak: streak ? { current: streak.current_streak || 0, best: streak.best_streak || 0, xp: streak.xp_total || 0, level: streak.level || 1 } : null,
    lastActivity: lastDates.length ? lastDates[lastDates.length - 1] : null,
    hasAnyData: Boolean(records.length || total || streak || daily.length),
  };
}

/** يطابق إجابات الطفل: بالمعرّف أولاً، ثم الاسم للسجلات القديمة التي لا معرّف لها. */
export function attemptsForChild(all = [], child, siblingsSameName = 1) {
  return all.filter(a => a.child_id ? a.child_id === child.id : (siblingsSameName === 1 && a.child_name === child.name));
}
