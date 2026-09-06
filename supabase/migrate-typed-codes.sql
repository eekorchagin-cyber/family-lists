-- Обновление кодов: D-xxxxx = новый человек, T-xxxxx = то же устройство.
-- SQL Editor → New query → Run.

create or replace function public.norm_code(p text)
returns text
language sql
immutable
as $$
  select replace(replace(upper(trim(coalesce(p, ''))), '-', ''), ' ', '');
$$;

create or replace function public.redeem_invite(p_code text, p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_home uuid;
  v_existing uuid;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  select home_id into v_home
  from public.invites
  where public.norm_code(code) = public.norm_code(p_code);
  if v_home is null then
    raise exception 'invalid code';
  end if;
  select home_id into v_existing from public.profiles where id = auth.uid();
  if v_existing is not null and v_existing <> v_home then
    raise exception 'already in a home';
  end if;
  insert into public.profiles (id, home_id, display_name, is_creator)
  values (auth.uid(), v_home, trim(p_name), false)
  on conflict (id) do update
    set home_id = excluded.home_id,
        display_name = excluded.display_name,
        is_creator = false
  where public.profiles.home_id is null or public.profiles.home_id = v_home;
  return v_home;
end;
$$;

create or replace function public.redeem_pairing(p_code text)
returns table (email text, password text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_password text;
begin
  select p.email, p.password into v_email, v_password
  from public.pairings p
  where public.norm_code(p.code) = public.norm_code(p_code) and p.expires_at > now();
  if v_email is null then
    raise exception 'invalid code';
  end if;
  delete from public.pairings where public.norm_code(code) = public.norm_code(p_code);
  email := v_email;
  password := v_password;
  return next;
end;
$$;

grant execute on function public.redeem_invite(text, text) to authenticated;
grant execute on function public.redeem_pairing(text) to anon, authenticated;
