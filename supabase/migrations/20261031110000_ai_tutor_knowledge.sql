-- مساعد التدريب: قاعدة المعرفة (مدخلات سؤال/جواب + مصادر مرفوعة مقسّمة) + سجل مصدر الإجابة
-- جداول جديدة فقط؛ ai_tutor_record تُستبدل بنسخة بمعامل اختياري (أُنشئت في هذه الموجة).

-- تطبيع النص العربي للبحث: NFKC (يفكّ أشكال العرض)، حذف التشكيل، توحيد الألف/الياء/التاء المربوطة، حذف «ال» التعريف
create or replace function public.ai_norm(t text)
returns text language sql immutable parallel safe as $$
  select regexp_replace(
    translate(
      regexp_replace(lower(normalize(coalesce(t, ''), NFKC)), '[\u064B-\u065F\u0670\u0640]', '', 'g'),
      'أإآىة', 'ااايه'),
    '(^|\s)ال(?=\S{2,})', '\1', 'g')
$$;

-- مصادر مرفوعة (الإدارة فقط). نخزّن النص المستخرج مقسّمًا فقط، لا الملف الأصلي.
create table if not exists public.ai_tutor_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 200),
  rights text not null check (rights in ('official','external')),
  rights_confirmed boolean not null default false,
  grade_id text references public.grades(id),
  subject_key text,
  note text check (note is null or char_length(note) <= 500),
  pages int,
  chunk_count int not null default 0,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_by uuid not null references auth.users(id),
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (rights = 'official' or rights_confirmed)
);

create table if not exists public.ai_tutor_chunks (
  id bigint generated always as identity primary key,
  source_id uuid not null references public.ai_tutor_sources(id) on delete cascade,
  page int,
  content text not null check (char_length(content) between 20 and 3000),
  tsv tsvector generated always as (to_tsvector('simple', public.ai_norm(content))) stored
);
create index if not exists ai_tutor_chunks_tsv_idx on public.ai_tutor_chunks using gin (tsv);
create index if not exists ai_tutor_chunks_source_idx on public.ai_tutor_chunks (source_id);

-- مدخلات سؤال/جواب معتمدة (المعلم يكتب، الإدارة تعتمد)
create table if not exists public.ai_tutor_knowledge (
  id uuid primary key default gen_random_uuid(),
  grade_id text references public.grades(id),
  subject_key text,
  lesson_id text,
  question text not null check (char_length(question) between 3 and 300),
  answer text not null check (char_length(answer) between 3 and 1200),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_by uuid not null references auth.users(id),
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  tsv tsvector generated always as (to_tsvector('simple', public.ai_norm(question || ' ' || answer))) stored
);
create index if not exists ai_tutor_knowledge_tsv_idx on public.ai_tutor_knowledge using gin (tsv);

alter table public.ai_tutor_sources enable row level security;
alter table public.ai_tutor_chunks enable row level security;
alter table public.ai_tutor_knowledge enable row level security;

drop policy if exists "admin manages sources" on public.ai_tutor_sources;
create policy "admin manages sources" on public.ai_tutor_sources for all to authenticated
  using (public.is_admin()) with check (public.is_admin() and created_by = auth.uid());
drop policy if exists "admin manages chunks" on public.ai_tutor_chunks;
create policy "admin manages chunks" on public.ai_tutor_chunks for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin manages knowledge" on public.ai_tutor_knowledge;
create policy "admin manages knowledge" on public.ai_tutor_knowledge for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "teacher reads own or approved knowledge" on public.ai_tutor_knowledge;
create policy "teacher reads own or approved knowledge" on public.ai_tutor_knowledge for select to authenticated
  using (created_by = auth.uid() or (status = 'approved' and public.teacher_has_subject(subject_key)));
drop policy if exists "teacher proposes knowledge" on public.ai_tutor_knowledge;
create policy "teacher proposes knowledge" on public.ai_tutor_knowledge for insert to authenticated
  with check (created_by = auth.uid() and status = 'pending' and approved_by is null and public.teacher_has_subject(subject_key));

-- استرجاع للمساعد: خدمة فقط. يحدد صف الطفل من children.grade (g1 أو عنوان الصف)
create or replace function public.ai_tutor_retrieve(p_child uuid, p_query text, p_subject text default null, p_limit int default 5)
returns table (kind text, title text, content text, rank real)
language plpgsql stable security definer set search_path = public as $$
declare
  v_grade text;
  v_q tsquery;
  v_terms text;
begin
  select coalesce(g.id, case when c.grade ~ '^g[0-9]$' then c.grade end) into v_grade
    from public.children c left join public.grades g on g.title = c.grade where c.id = p_child;
  select string_agg(w || ':*', ' | ') into v_terms from (
    select distinct w from regexp_split_to_table(public.ai_norm(regexp_replace(coalesce(p_query, ''), '[^[:alnum:]]+', ' ', 'g')), '\s+') w
    where char_length(w) >= 2 limit 12) s;
  if v_terms is null then return; end if;
  v_q := to_tsquery('simple', v_terms);
  return query
  (select 'qa'::text, k.question, k.answer, ts_rank_cd(k.tsv, v_q) * 1.5
     from public.ai_tutor_knowledge k
    where k.status = 'approved' and k.tsv @@ v_q
      and (k.grade_id is null or k.grade_id = v_grade)
      and (k.subject_key is null or p_subject is null or k.subject_key = p_subject)
    order by 4 desc limit p_limit)
  union all
  (select 'source'::text, s.title, ch.content, ts_rank_cd(ch.tsv, v_q)
     from public.ai_tutor_chunks ch join public.ai_tutor_sources s on s.id = ch.source_id
    where s.status = 'approved' and ch.tsv @@ v_q
      and (s.grade_id is null or s.grade_id = v_grade)
      and (s.subject_key is null or p_subject is null or s.subject_key = p_subject)
    order by 4 desc limit p_limit);
end $$;
revoke all on function public.ai_tutor_retrieve(uuid, text, text, int) from public, anon, authenticated;
grant execute on function public.ai_tutor_retrieve(uuid, text, text, int) to service_role;

-- سجل مصدر الإجابة: lesson | knowledge | source | model | deferred (قيمة تُسجَّل على رسالة المساعد)
alter table public.ai_tutor_messages add column if not exists ctx text;
drop function if exists public.ai_tutor_record(uuid, text, text, bigint);
create or replace function public.ai_tutor_record(p_child uuid, p_user text, p_reply text, p_cost_micro bigint, p_ctx text default 'model')
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.ai_tutor_messages (child_id, role, content, ctx)
  values (p_child, 'user', left(p_user, 4000), null), (p_child, 'assistant', left(p_reply, 4000), left(p_ctx, 60));
  insert into public.ai_tutor_spend (month, cost_micro_usd)
  values (to_char(now(), 'YYYY-MM'), greatest(p_cost_micro, 0))
  on conflict (month) do update set cost_micro_usd = public.ai_tutor_spend.cost_micro_usd + greatest(p_cost_micro, 0);
end $$;
revoke all on function public.ai_tutor_record(uuid, text, text, bigint, text) from public, anon, authenticated;
grant execute on function public.ai_tutor_record(uuid, text, text, bigint, text) to service_role;

-- صلاحيات الجداول
revoke all on public.ai_tutor_sources, public.ai_tutor_chunks, public.ai_tutor_knowledge from anon;
grant select, insert, update, delete on public.ai_tutor_sources, public.ai_tutor_chunks to authenticated;
grant select, insert, update, delete on public.ai_tutor_knowledge to authenticated;
grant usage, select on sequence public.ai_tutor_chunks_id_seq to authenticated;
