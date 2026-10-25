-- بنك الأسئلة لكل درس + سجل النشاط الحقيقي
-- م2 من الخطة التنفيذية v2 (معتمدة من يوسف 2026-10-27)
-- lesson_questions: أسئلة متعددة لكل درس تُدار من لوحة المناهج (معلم/إدارة)
-- activity_log: سجل أحداث حقيقي يستبدل الصفوف الوهمية في لوحة الإدمن

-- 1) جدول بنك الأسئلة
create table if not exists public.lesson_questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id text not null references public.curriculum_lessons(id) on delete cascade,
  quiz_type text not null default 'choice' check (quiz_type in ('choice', 'truefalse', 'arrange')),
  question text not null,
  choices jsonb not null default '[]'::jsonb,   -- خيارات choice أو عناصر arrange
  answer jsonb,                                  -- رقم الخيار | true/false | مصفوفة الترتيب
  skill text,                                    -- وسم المهارة (أساس تقرير الضعف — م3)
  difficulty text not null default 'normal' check (difficulty in ('easy', 'normal', 'hard')),
  celebration text,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lesson_questions_lesson_idx
  on public.lesson_questions (lesson_id, sort_order);

alter table public.lesson_questions enable row level security;

-- القراءة: أسئلة الدروس المنشورة للجميع (نفس نمط "published lessons are readable")،
-- وطاقم المنصة يرى الكل (بما فيه غير المنشور)
drop policy if exists "published lesson questions are readable" on public.lesson_questions;
create policy "published lesson questions are readable" on public.lesson_questions
  for select using (
    public.is_staff()
    or (
      is_published
      and exists (
        select 1 from public.curriculum_lessons l
        where l.id = lesson_id and l.published
      )
    )
  );

-- الإدارة: المعلم والإدارة فقط (is_staff) — تقييد المعلم بدروسه المسندة
-- مؤجل لحين وجود جدول إسناد معلم→مادة (موثق في الخطة)
drop policy if exists "staff manages lesson questions" on public.lesson_questions;
create policy "staff manages lesson questions" on public.lesson_questions
  for all using (public.is_staff()) with check (public.is_staff());

-- تحديث updated_at تلقائياً
create or replace function public.touch_lesson_questions()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists lesson_questions_touch on public.lesson_questions;
create trigger lesson_questions_touch
  before update on public.lesson_questions
  for each row execute function public.touch_lesson_questions();

-- 2) سجل النشاط الحقيقي (غير قابل للتعديل أو الحذف من العميل)
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  actor uuid default auth.uid() references auth.users(id) on delete set null,
  actor_name text,
  actor_role text,
  action text not null,          -- مثل: question.create / question.update / question.delete / lesson.publish
  entity text,                   -- مثل: lesson_question / lesson
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_log_created_idx
  on public.activity_log (created_at desc);

alter table public.activity_log enable row level security;

-- الكتابة: أي مستخدم موثق يسجل حدثه (actor يُثبت من auth.uid افتراضياً)
drop policy if exists "authenticated writes own activity" on public.activity_log;
create policy "authenticated writes own activity" on public.activity_log
  for insert with check (auth.uid() is not null and actor = auth.uid());

-- القراءة: الإدارة فقط
drop policy if exists "admin reads activity log" on public.activity_log;
create policy "admin reads activity log" on public.activity_log
  for select using (public.is_admin());

-- لا سياسات update/delete — السجل ثابت بطبيعته
