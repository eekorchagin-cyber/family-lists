-- Family Lists: вставьте этот файл в SQL Editor проекта Supabase.
-- Authentication → Providers → Email: выключите "Confirm email".

create table if not exists public.homes (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Дом',
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  home_id uuid references public.homes (id) on delete set null,
  display_name text not null,
  is_creator boolean not null default false,
  is_app_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.invites (
  code text primary key,
  home_id uuid not null references public.homes (id) on delete cascade,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create table if not exists public.pairings (
  code text primary key,
  email text not null,
  password text not null,
  user_id uuid not null,
  expires_at timestamptz not null
);

create table if not exists public.stores (
  id text primary key,
  home_id uuid not null references public.homes (id) on delete cascade,
  owner_id uuid not null,
  name text not null,
  visibility text not null default 'private' check (visibility in ('private', 'home')),
  category_sort text not null default 'custom',
  category_order jsonb not null default '[]'::jsonb,
  category_names jsonb not null default '{}'::jsonb,
  templates jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.store_access (
  store_id text not null references public.stores (id) on delete cascade,
  grantee_id uuid not null references public.profiles (id) on delete cascade,
  primary key (store_id, grantee_id)
);

create table if not exists public.categories (
  id text primary key,
  home_id uuid not null references public.homes (id) on delete cascade,
  store_id text,
  name text not null,
  color text not null,
  icon text,
  updated_at timestamptz not null default now()
);

create table if not exists public.items (
  id text primary key,
  home_id uuid not null references public.homes (id) on delete cascade,
  store_id text not null references public.stores (id) on delete cascade,
  name text not null,
  category_id text not null,
  qty double precision not null,
  unit text not null,
  bought boolean not null default false,
  added_by uuid,
  bought_by uuid,
  updated_at timestamptz not null default now()
);

create table if not exists public.catalog (
  id text primary key,
  home_id uuid not null references public.homes (id) on delete cascade,
  name text not null,
  category_id text not null,
  updated_at timestamptz not null default now()
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

create or replace function public.my_home_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select home_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_home_creator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_creator from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.can_read_store(p_store public.stores)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_store.owner_id = auth.uid()
    or (
      p_store.visibility = 'home'
      and p_store.home_id is not distinct from public.my_home_id()
    )
    or exists (
      select 1 from public.store_access a
      where a.store_id = p_store.id and a.grantee_id = auth.uid()
    )
$$;

alter table public.homes enable row level security;
alter table public.profiles enable row level security;
alter table public.invites enable row level security;
alter table public.pairings enable row level security;
alter table public.stores enable row level security;
alter table public.store_access enable row level security;
alter table public.categories enable row level security;
alter table public.items enable row level security;
alter table public.catalog enable row level security;
alter table public.app_meta enable row level security;
alter table public.access_codes enable row level security;

drop policy if exists homes_select on public.homes;
create policy homes_select on public.homes
  for select using (id = public.my_home_id() or created_by = auth.uid());

drop policy if exists homes_insert on public.homes;
create policy homes_insert on public.homes
  for insert with check (created_by = auth.uid());

drop policy if exists homes_update on public.homes;
create policy homes_update on public.homes
  for update using (created_by = auth.uid())
  with check (created_by = auth.uid());

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (
    id = auth.uid()
    or (home_id is not null and home_id = public.my_home_id())
  );

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (id = auth.uid() or public.is_home_creator())
  with check (
    not is_creator
    or exists (
      select 1 from public.homes h
      where h.id = home_id and h.created_by = id
    )
  );

create or replace function public.profiles_lock_creator()
returns trigger
language plpgsql
as $$
begin
  if NEW.is_creator and not exists (
    select 1 from public.homes h
    where h.id = NEW.home_id and h.created_by = NEW.id
  ) then
    NEW.is_creator := false;
  end if;
  return NEW;
end;
$$;

drop trigger if exists profiles_lock_creator on public.profiles;
create trigger profiles_lock_creator
  before insert or update on public.profiles
  for each row execute procedure public.profiles_lock_creator();

drop policy if exists invites_select on public.invites;
create policy invites_select on public.invites
  for select using (home_id = public.my_home_id() and public.is_home_creator());

drop policy if exists invites_insert on public.invites;
create policy invites_insert on public.invites
  for insert with check (public.is_home_creator() and home_id = public.my_home_id());

drop policy if exists invites_delete on public.invites;
create policy invites_delete on public.invites
  for delete using (public.is_home_creator() and home_id = public.my_home_id());

drop policy if exists stores_select on public.stores;
create policy stores_select on public.stores
  for select using (public.can_read_store(stores));

drop policy if exists stores_write on public.stores;
create policy stores_write on public.stores
  for all using (
    owner_id = auth.uid()
    or (
      visibility = 'home'
      and home_id = public.my_home_id()
    )
  )
  with check (home_id = public.my_home_id());

drop policy if exists store_access_select on public.store_access;
create policy store_access_select on public.store_access
  for select using (
    grantee_id = auth.uid()
    or exists (
      select 1 from public.stores s
      where s.id = store_id and s.owner_id = auth.uid()
    )
  );

drop policy if exists store_access_write on public.store_access;
create policy store_access_write on public.store_access
  for all using (
    exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
  );

drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories
  for select using (home_id = public.my_home_id());

drop policy if exists categories_write on public.categories;
create policy categories_write on public.categories
  for all using (home_id = public.my_home_id())
  with check (home_id = public.my_home_id());

drop policy if exists items_select on public.items;
create policy items_select on public.items
  for select using (
    exists (select 1 from public.stores s where s.id = store_id and public.can_read_store(s))
  );

drop policy if exists items_write on public.items;
create policy items_write on public.items
  for all using (
    exists (select 1 from public.stores s where s.id = store_id and public.can_read_store(s))
  )
  with check (home_id = public.my_home_id());

drop policy if exists catalog_all on public.catalog;
create policy catalog_all on public.catalog
  for all using (home_id = public.my_home_id())
  with check (home_id = public.my_home_id());

revoke all on public.pairings from anon, authenticated;
revoke all on public.app_meta from anon, authenticated;
revoke all on public.access_codes from anon, authenticated;
grant execute on function public.my_home_id() to authenticated;
grant execute on function public.is_home_creator() to authenticated;
grant execute on function public.can_read_store(public.stores) to authenticated;

create or replace function public.norm_code(p text)
returns text
language sql
immutable
as $$
  select replace(replace(upper(trim(coalesce(p, ''))), '-', ''), ' ', '');
$$;

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
  if exists (select 1 from public.profiles where id = auth.uid()) then
    return;
  end if;
  select max_users into v_max from public.app_meta where id = 1;
  select count(*)::int into v_used from public.profiles;
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

create or replace function public.exclude_member(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_home_creator() then
    raise exception 'forbidden';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'cannot exclude self';
  end if;
  update public.profiles
  set home_id = null, is_creator = false
  where id = p_user_id and home_id = public.my_home_id();
  delete from public.store_access where grantee_id = p_user_id;
end;
$$;

create or replace function public.create_pairing(p_code text, p_email text, p_password text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from public.pairings where expires_at < now() or user_id = auth.uid();
  insert into public.pairings (code, email, password, user_id, expires_at)
  values (upper(trim(p_code)), p_email, p_password, auth.uid(), now() + interval '15 minutes')
  on conflict (code) do update
    set email = excluded.email,
        password = excluded.password,
        user_id = excluded.user_id,
        expires_at = excluded.expires_at;
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

create or replace function public.leave_home()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_old uuid;
  v_new uuid;
  v_name text;
  v_is_creator boolean;
begin
  if v_uid is null then
    raise exception 'not signed in';
  end if;

  select home_id, display_name, is_creator
    into v_old, v_name, v_is_creator
  from public.profiles
  where id = v_uid;

  if v_old is null then
    raise exception 'not in a home';
  end if;

  if v_is_creator
     or exists (select 1 from public.homes where id = v_old and created_by = v_uid)
  then
    raise exception 'creator cannot leave';
  end if;

  if v_name is null or trim(v_name) = '' then
    v_name := 'Я';
  end if;

  insert into public.homes (name, created_by)
  values ('Дом', v_uid)
  returning id into v_new;

  update public.profiles
  set home_id = v_new, is_creator = true
  where id = v_uid;

  delete from public.store_access where grantee_id = v_uid;

  return v_new;
end;
$$;

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_home uuid;
  v_creator boolean;
  v_others int;
  v_heir uuid;
begin
  if v_uid is null then
    raise exception 'not signed in';
  end if;

  if exists (select 1 from public.profiles where id = v_uid and is_app_admin)
     and not exists (select 1 from public.profiles where is_app_admin and id <> v_uid) then
    raise exception 'last admin';
  end if;

  select home_id, is_creator into v_home, v_creator
  from public.profiles
  where id = v_uid;

  delete from public.store_access where grantee_id = v_uid;
  delete from public.pairings where user_id = v_uid;
  delete from public.access_codes where created_by = v_uid and redeemed_at is null;

  if v_home is not null then
    select count(*)::int into v_others
    from public.profiles
    where home_id = v_home and id <> v_uid;

    if coalesce(v_others, 0) = 0 then
      delete from public.homes where id = v_home;
    elsif v_creator then
      select id into v_heir
      from public.profiles
      where home_id = v_home and id <> v_uid
      order by created_at asc
      limit 1;
      if v_heir is not null then
        update public.homes set created_by = v_heir where id = v_home;
        update public.profiles set is_creator = (id = v_heir) where home_id = v_home;
      end if;
    end if;
  end if;

  delete from public.profiles where id = v_uid;
end;
$$;

grant execute on function public.redeem_invite(text, text) to authenticated;
grant execute on function public.exclude_member(uuid) to authenticated;
grant execute on function public.create_pairing(text, text, text) to authenticated;
grant execute on function public.redeem_pairing(text) to anon, authenticated;
grant execute on function public.reclaim_home() to authenticated;
grant execute on function public.leave_home() to authenticated;
grant execute on function public.is_app_admin() to authenticated;
grant execute on function public.redeem_access(text, text) to authenticated;
grant execute on function public.create_access_code(text) to authenticated;
grant execute on function public.load_access_info() to authenticated;
grant execute on function public.delete_my_account() to authenticated;

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
  v_codes jsonb;
begin
  if not public.is_app_admin() then
    raise exception 'forbidden';
  end if;
  select max_users into v_max from public.app_meta where id = 1;
  select count(*)::int into v_used from public.profiles;
  select coalesce(jsonb_agg(code order by created_at desc), '[]'::jsonb)
    into v_codes
  from public.access_codes
  where redeemed_at is null;
  return jsonb_build_object(
    'used', v_used,
    'max', coalesce(v_max, 20),
    'codes', v_codes
  );
end;
$$;
