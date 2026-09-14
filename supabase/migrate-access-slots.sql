-- Считать занятыми только профили в доме (home_id not null).
-- Исключённые / «осиротевшие» профили слот больше не занимают.
-- SQL Editor → New query → Run.

create or replace function public.assert_user_slot()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_max int;
  v_used int;
begin
  if exists (
    select 1 from public.profiles
    where id = auth.uid() and home_id is not null
  ) then
    return;
  end if;
  select max_users into v_max from public.app_meta where id = 1;
  select count(*)::int into v_used
  from public.profiles
  where home_id is not null;
  if v_used >= coalesce(v_max, 20) then
    raise exception 'user limit';
  end if;
end;
$$;

create or replace function public.load_access_info()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_max int;
  v_used int;
  v_idle int;
  v_codes jsonb;
begin
  if not public.is_app_admin() then
    raise exception 'forbidden';
  end if;
  select max_users into v_max from public.app_meta where id = 1;
  select count(*)::int into v_used
  from public.profiles
  where home_id is not null;
  select count(*)::int into v_idle
  from public.profiles
  where home_id is null;
  select coalesce(jsonb_agg(code order by created_at desc), '[]'::jsonb)
    into v_codes
  from public.access_codes
  where redeemed_at is null;
  return jsonb_build_object(
    'used', v_used,
    'max', coalesce(v_max, 20),
    'idle', v_idle,
    'codes', v_codes
  );
end;
$$;
