-- Передача дома другому человеку без телефона организатора.
-- Заодно: категории и каталог — свои на каждый дом (иначе новый вход по P
-- не может записать «Молочное» и срывает обмен).

alter table public.categories drop constraint if exists categories_pkey;
alter table public.categories add primary key (home_id, id);

alter table public.catalog drop constraint if exists catalog_pkey;
alter table public.catalog add primary key (home_id, id);

create or replace function public.take_over_home()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_home uuid;
  v_old uuid;
begin
  if v_uid is null then
    raise exception 'not signed in';
  end if;

  select home_id into v_home from public.profiles where id = v_uid;
  if v_home is null then
    raise exception 'not in a home';
  end if;

  select created_by into v_old from public.homes where id = v_home;
  if v_old = v_uid then
    return v_home;
  end if;

  if not exists (
    select 1 from public.profiles where home_id = v_home and id <> v_uid
  ) then
    raise exception 'no other members';
  end if;

  update public.homes set created_by = v_uid where id = v_home;

  update public.profiles
  set is_creator = (id = v_uid)
  where home_id = v_home;

  if exists (select 1 from public.profiles where id = v_old and is_app_admin)
     and not exists (select 1 from public.profiles where is_app_admin and id <> v_old)
  then
    update public.profiles set is_app_admin = true where id = v_uid;
    update public.profiles set is_app_admin = false where id = v_old;
  end if;

  return v_home;
end;
$$;

grant execute on function public.take_over_home() to authenticated;
