-- Пересылка списков между людьми, даже из разных семей.
-- SQL Editor → New query → Run.

alter table public.profiles
  add column if not exists contact_code text;

create unique index if not exists profiles_contact_code_key
  on public.profiles (contact_code)
  where contact_code is not null;

create table if not exists public.contacts (
  owner_id uuid not null references public.profiles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  code text not null,
  display_name text not null,
  created_at timestamptz not null default now(),
  primary key (owner_id, user_id)
);

create table if not exists public.list_inbox (
  id uuid primary key default gen_random_uuid(),
  to_user uuid not null references public.profiles (id) on delete cascade,
  from_user uuid not null references public.profiles (id) on delete cascade,
  from_name text not null,
  list_name text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  dismissed_at timestamptz
);

create index if not exists list_inbox_to_user_idx
  on public.list_inbox (to_user, created_at);

alter table public.contacts enable row level security;
alter table public.list_inbox enable row level security;

drop policy if exists contacts_own on public.contacts;
create policy contacts_own on public.contacts
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists list_inbox_select on public.list_inbox;
create policy list_inbox_select on public.list_inbox
  for select using (to_user = auth.uid() and dismissed_at is null);

drop policy if exists list_inbox_update on public.list_inbox;
create policy list_inbox_update on public.list_inbox
  for update using (to_user = auth.uid())
  with check (to_user = auth.uid());

revoke all on public.contacts from anon, authenticated;
revoke all on public.list_inbox from anon, authenticated;
grant select, insert, update, delete on public.contacts to authenticated;
grant select, update on public.list_inbox to authenticated;

create or replace function public.ensure_contact_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_try int := 0;
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i int;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  select contact_code into v_code from public.profiles where id = auth.uid();
  if v_code is not null and public.norm_code(v_code) like 'U%' then
    return public.norm_code(v_code);
  end if;
  loop
    v_try := v_try + 1;
    v_code := 'U';
    for i in 1..5 loop
      v_code := v_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    begin
      update public.profiles
      set contact_code = v_code
      where id = auth.uid()
        and (contact_code is null or public.norm_code(contact_code) not like 'U%');
      if found then
        return v_code;
      end if;
      select public.norm_code(contact_code) into v_code
      from public.profiles
      where id = auth.uid();
      if v_code like 'U%' then
        return v_code;
      end if;
    exception when unique_violation then
      if v_try > 8 then
        raise exception 'code failed';
      end if;
    end;
    if v_try > 8 then
      raise exception 'code failed';
    end if;
  end loop;
end;
$$;

create or replace function public.lookup_contact(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_norm text := public.norm_code(p_code);
  v_row public.profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  if v_norm !~ '^U[A-Z0-9]{5}$' then
    return null;
  end if;
  select * into v_row
  from public.profiles
  where public.norm_code(contact_code) = v_norm
  limit 1;
  if not found then
    return null;
  end if;
  if v_row.id = auth.uid() then
    return jsonb_build_object('self', true);
  end if;
  return jsonb_build_object(
    'user_id', v_row.id,
    'display_name', v_row.display_name,
    'code', public.norm_code(v_row.contact_code)
  );
end;
$$;

create or replace function public.send_list(p_code text, p_name text, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_norm text := public.norm_code(p_code);
  v_to uuid;
  v_from_name text;
  v_name text;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  if jsonb_typeof(p_payload) is distinct from 'object' then
    raise exception 'bad payload';
  end if;
  if coalesce(jsonb_array_length(p_payload -> 'items'), 0) > 300 then
    raise exception 'too many';
  end if;
  select id into v_to
  from public.profiles
  where public.norm_code(contact_code) = v_norm
  limit 1;
  if v_to is null then
    raise exception 'no person';
  end if;
  if v_to = auth.uid() then
    raise exception 'self';
  end if;
  select display_name into v_from_name from public.profiles where id = auth.uid();
  v_name := left(trim(coalesce(p_name, '')), 80);
  if v_name = '' then
    v_name := 'Список';
  end if;
  insert into public.list_inbox (to_user, from_user, from_name, list_name, payload)
  values (v_to, auth.uid(), coalesce(nullif(trim(v_from_name), ''), 'Человек'), v_name, p_payload)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.dismiss_inbox(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  update public.list_inbox
  set dismissed_at = now()
  where id = p_id and to_user = auth.uid() and dismissed_at is null;
end;
$$;

grant execute on function public.ensure_contact_code() to authenticated;
grant execute on function public.lookup_contact(text) to authenticated;
grant execute on function public.send_list(text, text, jsonb) to authenticated;
grant execute on function public.dismiss_inbox(uuid) to authenticated;
