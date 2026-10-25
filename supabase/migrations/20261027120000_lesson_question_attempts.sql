-- محاولات أسئلة بنك الدروس (امتداد م2/م3 — بطلب يوسف 2026-10-27)
-- تسجل إجابة الطفل على كل سؤال من بنك الدرس لتُحتسب مهارات الدروس في تقرير ولي الأمر
-- ولي الأمر يسجل ويقرأ محاولات حسابه فقط؛ الطاقم يقرأ الكل

create table if not exists public.lesson_question_attempts (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.lesson_questions(id) on delete cascade,
  lesson_id text not null,
  parent_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  child_key text,
  child_name text,
  is_correct boolean not null,
  -- لقطة من وسم المهارة وقت الإجابة (حتى لو عدّل المعلم السؤال لاحقاً يبقى التقرير صادقاً)
  skill text,
  quiz_type text,
  created_at timestamptz not null default now()
);

create index if not exists lesson_question_attempts_parent_idx
  on public.lesson_question_attempts (parent_id, created_at desc);

create index if not exists lesson_question_attempts_question_idx
  on public.lesson_question_attempts (question_id);

alter table public.lesson_question_attempts enable row level security;

-- ولي الأمر (أي مستخدم مسجل) يسجل محاولات حسابه فقط
create policy "parents insert own question attempts"
  on public.lesson_question_attempts for insert
  to authenticated
  with check (parent_id = auth.uid());

-- القراءة: صاحب الحساب أو الطاقم
create policy "own or staff read question attempts"
  on public.lesson_question_attempts for select
  to authenticated
  using (parent_id = auth.uid() or public.is_staff());

-- لا تعديل ولا حذف — سجل محاولات ثابت (كما activity_log)
