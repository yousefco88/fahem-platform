-- Family account edits stay behind admin-only RPCs; no direct table grants or RLS broadening.
create or replace function public.admin_update_family_profile(
  p_parent_id uuid,
  p_full_name text,
  p_whatsapp text,
  p_country_code text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_parent_id is null
     or p_full_name is null
     or length(trim(p_full_name)) not between 2 and 100
     or (p_whatsapp is not null and length(trim(p_whatsapp)) not between 6 and 40)
     or (p_country_code is not null and length(trim(p_country_code)) not between 2 and 40) then
    raise exception 'invalid family profile' using errcode = '22023';
  end if;

  update public.parent_profiles
     set full_name = trim(p_full_name),
         whatsapp = nullif(trim(p_whatsapp), ''),
         country_code = nullif(trim(p_country_code), ''),
         updated_at = now()
   where id = p_parent_id;
  if not found then
    raise exception 'family not found' using errcode = 'P0002';
  end if;

  update public.profiles
     set full_name = trim(p_full_name), updated_at = now()
   where id = p_parent_id;
end;
$$;

create or replace function public.admin_update_child_profile(
  p_child_id uuid,
  p_name text,
  p_grade text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_child_id is null
     or p_name is null
     or length(trim(p_name)) not between 2 and 80
     or p_grade is null
     or length(trim(p_grade)) not between 2 and 100 then
    raise exception 'invalid child profile' using errcode = '22023';
  end if;

  update public.children
     set name = trim(p_name), grade = trim(p_grade)
   where id = p_child_id;
  if not found then
    raise exception 'child not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.admin_update_family_profile(uuid, text, text, text) from public, anon;
revoke all on function public.admin_update_child_profile(uuid, text, text) from public, anon;
grant execute on function public.admin_update_family_profile(uuid, text, text, text) to authenticated;
grant execute on function public.admin_update_child_profile(uuid, text, text) to authenticated;
