-- Synthetic roles and data for catalog regression tests; never connect to production.
\set ON_ERROR_STOP on
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create table public.profiles (id uuid primary key references auth.users(id), role text not null);
create function public.current_role_fahem() returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;
create function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role_fahem() = 'admin', false)
$$;
create table public.curriculum_subjects (key text primary key, published boolean not null default true);
insert into public.curriculum_subjects (key) values ('english'), ('math');
insert into auth.users (id) values
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002');
insert into public.profiles (id, role) values
  ('00000000-0000-0000-0000-000000000001', 'admin'),
  ('00000000-0000-0000-0000-000000000002', 'parent');
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.current_role_fahem() to anon, authenticated;
grant select, update on public.curriculum_subjects to authenticated;
