-- The public policy must never expose drafts or lessons in hidden subjects.
-- This test only covers lesson row visibility, not the separately unresolved
-- legacy answer leak in published content or client-bundled curriculum data.
\set ON_ERROR_STOP on
do $$ begin
  if (select count(*) from pg_policies where schemaname = 'public'
      and tablename = 'curriculum_lessons' and cmd = 'SELECT') <> 1 then
    raise exception 'multiple SELECT policies can combine with OR to expose drafts';
  end if;
end $$;
set role anon;
do $$ begin
  if (select count(*) from public.curriculum_lessons) <> 1 then
    raise exception 'anonymous reader can see a draft or a hidden-subject lesson';
  end if;
  -- Keep this as an observation, not an acceptance condition: a later
  -- migration should make this exposure false without breaking this test.
  if exists (select 1 from public.curriculum_lessons where id = 'public' and content ? 'answer') then
    raise notice 'Known unresolved: published legacy content contains an answer';
  end if;
end $$;
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
do $$ begin
  if (select count(*) from public.curriculum_lessons) <> 1 then
    raise exception 'parent can see a draft or a hidden-subject lesson';
  end if;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
do $$ begin
  if (select count(*) from public.curriculum_lessons) <> 2 then
    raise exception 'teacher cannot see exactly public lesson and own submitted draft';
  end if;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
do $$ begin
  if (select count(*) from public.curriculum_lessons) <> 4 then
    raise exception 'content editor lost access to unpublished lessons';
  end if;
end $$;
reset role;
