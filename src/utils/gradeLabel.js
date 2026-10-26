/**
 * gradeLabel — توحيد عرض الصف الدراسي.
 * children.grade وصل تاريخياً بثلاث صيغ: مفتاح قديم ('g4')، نص كامل قديم
 * («الصف الرابع الابتدائي»)، ونص قصير حالي («الرابع»). هذه الدالة للعرض فقط
 * ولا تغيّر المخزن — توحّد الكل إلى الصيغة القصيرة («الرابع»).
 */
const ORDINALS = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'];
const KEY_MAP = Object.fromEntries(ORDINALS.map((o, i) => [`g${i + 1}`, o]));

export function gradeLabel(grade) {
  const g = String(grade ?? '').trim();
  if (!g) return '';
  if (KEY_MAP[g.toLowerCase()]) return KEY_MAP[g.toLowerCase()];
  // «الصف الرابع الابتدائي» أو «الصف الرابع» → «الرابع»
  const m = g.match(/^الصف\s+(\S+)(?:\s+الابتدائي)?$/);
  if (m && ORDINALS.includes(m[1])) return m[1];
  return g; // صيغة قصيرة حديثة أو نص حر — كما هو
}
