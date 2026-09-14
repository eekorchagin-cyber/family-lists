-- Доступ к программе: код P, лимит людей, личное облако.
-- SQL Editor → New query → Run. Потом лимит можно поднять так:
--   update public.app_meta set max_users = 50 where id = 1;

alter table public.profiles
  add column if not exists is_app_admin boolean not null default false;

update public.profiles
set is_app_admin = true
where id = (
  select created_by from public.homes order by created_at asc limit 1
);

create table if not exists public.app_meta (
  id int primary key default 1 check (id = 1),
  max_users int not null default 20
);

insert into public.app_meta (id, max_users)
values (1, 20)
on conflict (id) do nothing;

create table if not exists public.access_codes (
  code text primary key,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  redeemed_at timestamptz,
  redeemed_by uuid
);

alter table public.app_meta enable row level security;
alter table public.access_codes enable row level security;

revoke all on public.app_meta from anon, authenticated;
revoke all on public.access_codes from anon, authenticated;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_app_admin from public.profiles where id = auth.uid()), false)
$$;

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
  perform public.assert_user_slot();
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
  if exists (
    select 1 from public.profiles
    where home_id = v_home
      and id <> auth.uid()
      and lower(trim(display_name)) = lower(trim(p_name))
  ) then
    raise exception 'name taken';
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

create or replace function public.redeem_access(p_code text, p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_home uuid;
  v_existing uuid;
  v_name text := trim(p_name);
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  if v_name = '' then
    raise exception 'need name';
  end if;
  perform public.assert_user_slot();
  select code into v_code
  from public.access_codes
  where public.norm_code(code) = public.norm_code(p_code)
    and redeemed_at is null
  for update;
  if v_code is null then
    raise exception 'invalid code';
  end if;
  select home_id into v_existing from public.profiles where id = auth.uid();
  if v_existing is not null then
    raise exception 'already in a home';
  end if;
  insert into public.homes (name, created_by)
  values ('Дом', auth.uid())
  returning id into v_home;
  insert into public.profiles (id, home_id, display_name, is_creator, is_app_admin)
  values (auth.uid(), v_home, v_name, true, false)
  on conflict (id) do update
    set home_id = excluded.home_id,
        display_name = excluded.display_name,
        is_creator = true
  where public.profiles.home_id is null;
  update public.access_codes
  set redeemed_at = now(), redeemed_by = auth.uid()
  where code = v_code;
  return v_home;
end;
$$;

create or replace function public.create_access_code(p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_app_admin() then
    raise exception 'forbidden';
  end if;
  insert into public.access_codes (code, created_by)
  values (upper(trim(p_code)), auth.uid());
  return upper(trim(p_code));
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


create or replace function public.reclaim_home()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_home uuid;
  v_name text;
begin
  if v_uid is null then
    raise exception 'not signed in';
  end if;

  select id into v_home from public.homes where created_by = v_uid limit 1;
  if v_home is null then
    raise exception 'no home';
  end if;

  select display_name into v_name from public.profiles where id = v_uid;
  if v_name is null or trim(v_name) = '' then
    v_name := 'Я';
  end if;

  insert into public.profiles (id, home_id, display_name, is_creator)
  values (v_uid, v_home, v_name, true)
  on conflict (id) do update
    set home_id = excluded.home_id,
        is_creator = true;

  update public.profiles
  set is_creator = (id = (select created_by from public.homes where id = v_home))
  where home_id = v_home;

  return v_home;
end;
$$;

grant execute on function public.is_app_admin() to authenticated;
grant execute on function public.redeem_invite(text, text) to authenticated;
grant execute on function public.redeem_access(text, text) to authenticated;
grant execute on function public.create_access_code(text) to authenticated;
grant execute on function public.load_access_info() to authenticated;
grant execute on function public.reclaim_home() to authenticated;
