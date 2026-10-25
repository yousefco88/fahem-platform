/**
 * weeklySummary.js — توليد الملخص الدوري لولي الأمر (م5 — داخلي فقط)
 * يبني ملخصاً نصياً عربياً جاهزاً للنسخ من البيانات الحقيقية حصراً:
 * سجل التعلم المحلي + محاولات المحاكي + إجابات بنك الأسئلة من Supabase.
 * ⛔ لا إرسال خارجي هنا — الإرسال التلقائي معلّق على اختيار يوسف للمزود.
 * لا أرقام وهمية: غياب النشاط يُقال صراحة في النص.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function inWindow(ts, since) {
  const t = new Date(ts).getTime();
  return !Number.isNaN(t) && t >= since;
}

/**
 * يجمع أرقام الأسبوع من المصادر الثلاثة.
 * examAttempts/bankAttempts: صفوف Supabase الخاصة بهذا الطفل فقط (مفلترة مسبقاً).
 */
export function buildWeeklySummary({
  childName = 'الطفل',
  grade = '',
  learningRecords = {},
  stats = null,
  examAttempts = [],
  bankAttempts = [],
  days = 7,
  now = new Date(),
}) {
  const since = now.getTime() - days * DAY_MS;

  // سجل التعلم المحلي: دروس أُكملت/فُتحت خلال الفترة
  let completed = 0;
  let opened = 0;
  Object.values(learningRecords || {}).forEach(rec => {
    if (rec?.completedAt && inWindow(rec.completedAt, since)) completed++;
    else if (rec?.lastOpenedAt && inWindow(rec.lastOpenedAt, since)) opened++;
  });

  // محاولات المحاكي خلال الفترة
  const weekExams = (examAttempts || []).filter(a => inWindow(a.created_at, since));
  const avgPct = weekExams.length
    ? Math.round(weekExams.reduce((s, a) => s + (Number(a.percentage) || 0), 0) / weekExams.length)
    : null;

  // إجابات بنك الأسئلة خلال الفترة + أضعف المهارات
  const weekBank = (bankAttempts || []).filter(a => inWindow(a.created_at, since));
  const bankCorrect = weekBank.filter(a => a.is_correct).length;
  const skillAgg = {};
  weekBank.forEach(a => {
    const key = a.skill || null;
    if (!key) return;
    if (!skillAgg[key]) skillAgg[key] = { correct: 0, total: 0 };
    skillAgg[key].total++;
    if (a.is_correct) skillAgg[key].correct++;
  });
  const weakSkills = Object.entries(skillAgg)
    .map(([skill, s]) => ({ skill, pct: Math.round((s.correct / s.total) * 100) }))
    .filter(s => s.pct < 60)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 3);

  const hasActivity = completed > 0 || opened > 0 || weekExams.length > 0 || weekBank.length > 0;

  // بناء النص الجاهز للنسخ
  const lines = [];
  lines.push(`📬 ملخص ${childName}${grade ? ` (${grade})` : ''} — آخر ${days} أيام`);
  lines.push('— منصة فاهم —');
  lines.push('');
  if (!hasActivity) {
    lines.push('لا يوجد نشاط مسجل هذه الفترة. شجعوا طفلكم على فتح درس اليوم 🌱');
  } else {
    if (completed > 0) lines.push(`✅ أكمل ${completed} ${completed === 1 ? 'درساً' : 'دروس'}`);
    if (opened > 0) lines.push(`📖 فتح ${opened} ${opened === 1 ? 'درساً إضافياً' : 'دروس إضافية'} دون إكمال`);
    if (weekExams.length > 0) lines.push(`📝 ${weekExams.length} ${weekExams.length === 1 ? 'محاولة اختبار تدريبي' : 'محاولات اختبار تدريبي'} بمتوسط ${avgPct}%`);
    if (weekBank.length > 0) lines.push(`❓ أجاب على ${weekBank.length} ${weekBank.length === 1 ? 'سؤال' : 'سؤالاً'} من أسئلة الدروس (${bankCorrect} صحيحة)`);
    if (stats?.streak > 0) lines.push(`🔥 سلسلة نشاط: ${stats.streak} ${stats.streak === 1 ? 'يوم' : 'أيام'} متتالية`);
    if (weakSkills.length > 0) {
      lines.push('');
      lines.push(`💡 مهارات تحتاج تركيزاً: ${weakSkills.map(s => `${s.skill} (${s.pct}%)`).join('، ')}`);
    }
  }
  if (stats && stats.total > 0) {
    lines.push('');
    lines.push(`📊 التقدم الكلي: ${stats.done} من ${stats.total} درساً`);
  }

  return {
    hasActivity,
    completed,
    opened,
    examCount: weekExams.length,
    avgPct,
    bankAnswered: weekBank.length,
    bankCorrect,
    weakSkills,
    text: lines.join('\n'),
  };
}
