/**
 * knowledgeIngest — تنظيف النص المستخرج من الملفات وتقطيعه لقاعدة معرفة المساعد.
 * دوال نقية (قابلة للاختبار)؛ الاستخراج من PDF يتم في AiTutorSources عبر pdfjs.
 */

// يفكّ أشكال العرض العربية (ﺎﺑﺘﺪاﺋﻲ → ابتدائي) ويصلح قلب «ال+همزة» الشائع في PDF (األسرة → الأسرة)
export function cleanExtracted(text) {
  return String(text ?? '')
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')       // تشكيل وتطويل
    .replace(/ا([أإآ])ل/g, 'ال$1')                      // قلب لام-ألف همزة
    .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, '') // رموز اتجاه غير مرئية
    .replace(/\s+/g, ' ')
    .trim();
}

// تقطيع عند حدود الجمل بطول مستهدف؛ يتجاهل المقاطع الأقصر من 20 حرفًا
export function chunkText(text, target = 900, max = 1500) {
  const clean = cleanExtracted(text);
  if (!clean) return [];
  const sentences = clean.split(/(?<=[.!؟?!۔\n])\s+/);
  const out = [];
  let cur = '';
  for (const raw of sentences) {
    let s = raw;
    while (s.length > max) { // جملة طويلة جدًا: قصّها على مسافة
      const cut = s.lastIndexOf(' ', max) > 0 ? s.lastIndexOf(' ', max) : max;
      if (cur) { out.push(cur); cur = ''; }
      out.push(s.slice(0, cut));
      s = s.slice(cut).trim();
    }
    if (cur && cur.length + s.length + 1 > target) { out.push(cur); cur = s; }
    else cur = cur ? `${cur} ${s}` : s;
  }
  if (cur) out.push(cur);
  return out.map(c => c.trim()).filter(c => c.length >= 20);
}

// ملف ممسوح ضوئيًا (بلا طبقة نص) → نرفضه بصدق بدل إدخال فراغ
export function looksScanned(totalChars, pages) {
  return pages > 0 && totalChars / pages < 30;
}

export function buildChunks(pageTexts) {
  const rows = [];
  pageTexts.forEach((t, i) => chunkText(t).forEach(content => rows.push({ page: i + 1, content })));
  return rows;
}
