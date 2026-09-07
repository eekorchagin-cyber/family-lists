-- Запретить приглашению создавать человека с уже занятым именем
-- и убрать второго «Путник 42». SQL Editor → Run.

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

grant execute on function public.redeem_invite(text, text) to authenticated;

-- Второй «Путник 42» (более новый) выходит из дома, первый остаётся.
update public.profiles
set home_id = null, is_creator = false
where id in (
  select id from (
    select
      id,
      row_number() over (
        partition by home_id, lower(trim(display_name))
        order by created_at asc
      ) as rn
    from public.profiles
    where home_id is not null
      and display_name ilike 'Путник 42'
  ) ranked
  where rn > 1
);
