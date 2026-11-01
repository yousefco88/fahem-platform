-- Isolated FK reproduction using the relationships in the migrations, not a
-- substitute for executing the full hosted schema or a retention policy.
\set ON_ERROR_STOP on
create schema auth;
create table auth.users (id uuid primary key);
create table public.children (id uuid primary key, parent_id uuid not null references auth.users(id));
create table public.assessment_sessions (
  id uuid primary key,
  parent_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade
);
create table public.exam_attempts (
  id uuid primary key,
  assessment_session_id uuid unique references public.assessment_sessions(id)
);
create table public.teacher_live_attendance (
  id uuid primary key, child_id uuid not null references public.children(id) on delete restrict
);
create table public.child_subscription_contracts (
  id uuid primary key, child_id uuid not null references public.children(id) on delete restrict
);
insert into auth.users values ('00000000-0000-0000-0000-000000000001');
insert into public.children values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001');
insert into public.assessment_sessions values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001');
insert into public.exam_attempts values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001');
insert into public.teacher_live_attendance values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002');
insert into public.child_subscription_contracts values
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003');
do $$
declare blocked boolean;
begin
  blocked := false;
  begin
    delete from public.children where id = '10000000-0000-0000-0000-000000000001';
  exception when foreign_key_violation then blocked := true;
  end;
  if not blocked then raise exception 'assessment-linked child deletion unexpectedly succeeded'; end if;
  if not exists (select 1 from public.children where id = '10000000-0000-0000-0000-000000000001') then
    raise exception 'assessment child changed after blocked delete';
  end if;
  blocked := false;
  begin
    delete from public.children where id = '10000000-0000-0000-0000-000000000002';
  exception when foreign_key_violation then blocked := true;
  end;
  if not blocked then raise exception 'attendance-linked child deletion unexpectedly succeeded'; end if;
  blocked := false;
  begin
    delete from public.children where id = '10000000-0000-0000-0000-000000000003';
  exception when foreign_key_violation then blocked := true;
  end;
  if not blocked then raise exception 'contract-linked child deletion unexpectedly succeeded'; end if;
end $$;
-- Without the referencing exam attempt, the child and its session cascade away;
-- this shows why deleting children cannot be treated as a harmless UI operation.
delete from public.exam_attempts where id = '30000000-0000-0000-0000-000000000001';
delete from public.children where id = '10000000-0000-0000-0000-000000000001';
do $$ begin
  if exists (select 1 from public.assessment_sessions where id = '20000000-0000-0000-0000-000000000001') then
    raise exception 'assessment session did not cascade with child';
  end if;
end $$;
