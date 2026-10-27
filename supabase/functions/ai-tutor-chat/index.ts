// Edge Function: ai-tutor-chat — مساعد التدريب (NVIDIA API Catalog، متوافق مع OpenAI)
// المفتاح NVIDIA_API_KEY سر في الخادم فقط (supabase secrets set). النموذج قابل للتغيير عبر NVIDIA_MODEL.
// التحقق: JWT -> ai_tutor_reserve (ملكية + موافقة + حد يومي + سقف شهري) -> NVIDIA -> ai_tutor_record.
import { createClient } from 'npm:@supabase/supabase-js@2';

const DEFAULT_MODEL = 'nvidia/nemotron-3.5-lightning-30b-a3b'; // مُختبر فعليًا بتاريخ التطوير؛ llama-3.1-70b أُوقف (410)
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MAX_INPUT_CHARS = 500;
const MAX_OUTPUT_TOKENS = 400;
// الطبقة المجانية: التكلفة صفر؛ يبقى الحد اليومي (50) هو الحماية الفعلية
const COST_MICRO = 0;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const REASON_MESSAGES: Record<string, string> = {
  consent_required: 'مساعد الذكاء الاصطناعي مغلق. يفعّله ولي الأمر من إعدادات الحساب.',
  daily_limit: 'وصلت للحد اليومي من الأسئلة. كمّل غدًا أو اسأل معلمك 👨‍🏫',
  budget_exhausted: 'المساعد متوقف مؤقتًا. اسأل معلمك في الحصة 👨‍🏫',
  tutor_disabled: 'المساعد متوقف مؤقتًا من الإدارة. اسأل معلمك في الحصة 👨‍🏫',
  forbidden: 'غير مسموح.',
  unauthenticated: 'سجّل الدخول أولًا.',
};

const SYSTEM_PROMPT = `أنت «فاهم»، مساعد تدريب لطفل في المرحلة الابتدائية يدرس المنهج المصري.
- اكتب بعربية بسيطة ودافئة وبجمل قصيرة (3–5 جمل).
- أجب فقط عن أسئلة المنهج الدراسي: عربي، رياضيات، علوم، إنجليزي، أخلاق.
- لا تطلب ولا تقبل أي بيانات شخصية (اسم كامل، عنوان، هاتف، صور).
- لا تعطِ الحل النهائي مباشرة؛ ساعد الطفل بخطوات وأسئلة موجِّهة.
- إن لم تكن متأكدًا أو كان السؤال خارج المنهج أو غير مناسب لطفل، قل بلطف: اسأل معلمك.
- اكتب بالعربية وبنص عادي بلا رموز تنسيق ولا قوائم مرقّمة ولا تحية في أول الرد، وبحد أقصى 4 جمل قصيرة. استخدم كلمة إنجليزية فقط عندما يكون السؤال عن اللغة الإنجليزية أو عندما تلزم لتسمية مصطلح، وضعها بين قوسين بعد شرحها بالعربية.
- لا تتحدث عن مواضيع طبية أو دينية أو سياسية أو مخيفة؛ أعد الطفل للدرس.`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const apiKey = Deno.env.get('NVIDIA_API_KEY');
  if (!apiKey) return json({ error: 'not_configured', message: 'الخدمة غير مفعّلة بعد.' }, 503);

  const auth = req.headers.get('Authorization') ?? '';
  const url = Deno.env.get('SUPABASE_URL')!;
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });

  let body: { childId?: string; message?: string; lesson?: { title?: string; objective?: string } };
  try { body = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const childId = body.childId;
  const message = (body.message ?? '').toString().trim().slice(0, MAX_INPUT_CHARS);
  if (!childId || !message) return json({ error: 'bad_request' }, 400);

  const { data: reason, error: reserveErr } = await userClient.rpc('ai_tutor_reserve', { p_child: childId });
  if (reserveErr) return json({ error: 'reserve_failed' }, 500);
  if (reason !== 'ok') {
    return json({ error: reason, message: REASON_MESSAGES[reason as string] ?? 'غير متاح الآن.' }, reason === 'unauthenticated' ? 401 : 403);
  }

  // إعدادات الإدارة + تصحيحات المعلمين (قراءة بصلاحية الخدمة؛ أي فشل = نكمل بالإعدادات الافتراضية)
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: cfg } = await admin.from('ai_tutor_settings').select('extra_instructions, model').eq('id', 1).maybeSingle();
  const { data: fixes } = await admin.from('ai_tutor_corrections')
    .select('question, correction').eq('verdict', 'wrong').order('created_at', { ascending: false }).limit(6);
  const extra = (cfg?.extra_instructions ?? '').toString().trim().slice(0, 1500);
  const extraCtx = extra ? `\nتعليمات إضافية من الإدارة:\n${extra}` : '';
  const fixCtx = (fixes && fixes.length)
    ? '\nتصحيحات معتمدة من المعلمين (التزم بها إن تكرر السؤال أو ما يشبهه):\n' +
      fixes.map((f: { question: string; correction: string }) => `- سؤال: ${f.question.slice(0, 200)} ← الصواب: ${f.correction.slice(0, 400)}`).join('\n')
    : '';

  const lessonCtx = body.lesson?.title
    ? `\nالدرس الحالي للطفل: «${String(body.lesson.title).slice(0, 120)}». الهدف: ${String(body.lesson.objective ?? '').slice(0, 300)}`
    : '';

  const resp = await fetch(NVIDIA_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: cfg?.model || Deno.env.get('NVIDIA_MODEL') || DEFAULT_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0.4,
      chat_template_kwargs: { enable_thinking: false },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT + extraCtx + fixCtx + lessonCtx },
        { role: 'user', content: message },
      ],
    }),
  });
  if (!resp.ok) return json({ error: 'upstream_failed', message: 'تعذر الرد الآن. جرّب بعد قليل.' }, 502);

  const out = await resp.json();
  let reply: string = (out.choices?.[0]?.message?.content ?? '').toString().trim();
  // النموذج قد يسرّب أحرفًا غير عربية (لوحظ صيني في الاختبار): نحذفها، وإن لم يبقَ نص نرفض
  reply = reply.replace(/[　-鿿가-힯＀-￯]+/g, '').replace(/[*#`_]+/g, '').replace(/^\s*[-•]\s+/gm, '').replace(/^\s*\d+[.)\-]\s+/gm, '').replace(/^(مرحبا[ًا]?|أهلا[ًا]?)[!،. ]+/, '').replace(/ {2,}/g, ' ').trim();
  if (!reply) return json({ error: 'empty_reply', message: 'لم أستطع الرد. اسأل معلمك 👨‍🏫' }, 502);
  const cost = COST_MICRO;

  await admin.rpc('ai_tutor_record', { p_child: childId, p_user: message, p_reply: reply, p_cost_micro: cost });

  return json({ reply });
});
