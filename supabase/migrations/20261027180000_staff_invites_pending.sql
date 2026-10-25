-- دعوات المعلمين/الفريق المعلّقة: تُطبَّق تلقائياً عند تسجيل (وتأكيد) البريد المدعو.
-- تحلّ محل 20261024_staff_invites.sql غير المطبّق (كان يعتمد على user_roles غير الموجود).

create table if not exists public.staff_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null default 'teacher' check (role in ('teacher','content_editor','admin')),
  status text not null default 'pending' check (status in ('pending','accepted','cancelled')),
  invited_by uuid references auth.users(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now()
);
create unique index if not exists staff_invites_one_pending on public.staff_invites (lower(email)) where status = 'pending';

alter table public.staff_invites enable row level security;
-- لا سياسات: الوصول عبر دوال SECURITY DEFINER فقط.

create or replace function public.admin_invite_staff(p_email text, p_role text default 'teacher')
returns uuid language plpgsql security definer set search_path to 'public','auth' as $$
declare v_email text := lower(trim(p_email)); v_id uuid;
begin
  if not public.is_admin() then raise exception 'not authorized' using errcode='42501'; end if;
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid email' using errcode='22023'; end if;
  if p_role not in ('teacher','content_editor','admin') then raise exception 'invalid role' using errcode='22023'; end if;
  if exists (select 1 from auth.users where lower(email)=v_email) then raise exception 'user already registered' using errcode='23505'; end if;
  update public.staff_invites set status='cancelled' where lower(email)=v_email and status='pending';
  insert into public.staff_invites(email, role, invited_by) values (v_email, p_role, auth.uid()) returning id into v_id;
  return v_id;
end $$;

create or replace function public.admin_list_invites()
returns table(id uuid, email text, role text, status text, expires_at timestamptz, created_at timestamptz)
language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_admin() then raise exception 'not authorized' using errcode='42501'; end if;
  return query select i.id,i.email,i.role,i.status,i.expires_at,i.created_at from public.staff_invites i
    where i.status='pending' order by i.created_at desc;
end $$;

create or replace function public.admin_cancel_invite(p_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_admin() then raise exception 'not authorized' using errcode='42501'; end if;
  update public.staff_invites set status='cancelled' where id=p_id and status='pending';
end $$;

-- تطبيق الدعوة: فقط إذا البريد مؤكَّد (لمنع انتحال بريد المدعو).
create or replace function public.apply_staff_invite()
returns trigger language plpgsql security definer set search_path to 'public','auth' as $$
declare v record;
begin
  if new.email_confirmed_at is null then return new; end if;
  select * into v from public.staff_invites
    where lower(email)=lower(new.email) and status='pending' and expires_at>now() limit 1;
  if found then
    update public.profiles set role=v.role, updated_at=now() where id=new.id;
    update public.staff_invites set status='accepted', accepted_by=new.id where id=v.id;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_invite_insert on auth.users;
create trigger on_auth_user_invite_insert after insert on auth.users
  for each row execute function public.apply_staff_invite();
drop trigger if exists on_auth_user_invite_confirm on auth.users;
create trigger on_auth_user_invite_confirm after update of email_confirmed_at on auth.users
  for each row when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.apply_staff_invite();

revoke all on function public.admin_invite_staff(text,text), public.admin_list_invites(), public.admin_cancel_invite(uuid), public.apply_staff_invite() from public, anon;
grant execute on function public.admin_invite_staff(text,text), public.admin_list_invites(), public.admin_cancel_invite(uuid) to authenticated;
