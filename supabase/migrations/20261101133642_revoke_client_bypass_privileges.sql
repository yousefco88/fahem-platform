-- Revoke DB-level privileges that bypass RLS (TRUNCATE/TRIGGER/REFERENCES/MAINTAIN)
-- from client roles on every public table (30 tables held them), and fix the postgres
-- role's default privileges so new tables never receive them again.
-- SELECT/INSERT/UPDATE/DELETE grants are untouched; RLS keeps governing them.
-- Applied to hosted project 2026-11-01 as version 20261101133642.
do $$
declare r record;
begin
  for r in
    select c.relname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r','p')
  loop
    execute format('revoke truncate, trigger, references, maintain on table public.%I from anon, authenticated', r.relname);
  end loop;
end $$;

-- Only the postgres role's defaults can be changed from a migration;
-- supabase_admin's defaults are platform-managed (42501 if attempted).
alter default privileges for role postgres in schema public
  revoke truncate, trigger, references, maintain on tables from anon, authenticated;

do $$
declare n int;
begin
  select count(*) into n
  from information_schema.role_table_grants g
  where g.table_schema = 'public'
    and g.grantee in ('anon','authenticated')
    and g.privilege_type in ('TRUNCATE','TRIGGER','REFERENCES','MAINTAIN');
  if n > 0 then raise exception 'client roles still hold % bypass privileges on public tables', n; end if;
end $$;
