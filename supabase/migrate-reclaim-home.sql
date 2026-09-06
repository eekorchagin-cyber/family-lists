-- Вернуть организатора «Егор» и запретить кнопке «Вернуться в дом»
-- забирать эту роль. Вставьте в SQL Editor Supabase и нажмите Run.

-- Кто сейчас в доме (можно посмотреть до и после):
-- select id, display_name, is_creator, home_id from public.profiles order by created_at;

create or replace function public.reclaim_home()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_home uuid;
begin
  if v_uid is null then
    raise exception 'not signed in';
  end if;

  select id into v_home from public.homes where created_by = v_uid limit 1;
  if v_home is null then
    raise exception 'no home';
  end if;

  insert into public.profiles (id, home_id, display_name, is_creator)
  values (v_uid, v_home, 'Егор', true)
  on conflict (id) do update
    set home_id = excluded.home_id,
        is_creator = true;

  update public.profiles
  set is_creator = (id = (select created_by from public.homes where id = v_home))
  where home_id = v_home;

  return v_home;
end;
$$;

grant execute on function public.reclaim_home() to authenticated;

drop policy if exists homes_update on public.homes;
create policy homes_update on public.homes
  for update using (created_by = auth.uid())
  with check (created_by = auth.uid());

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

do $$
declare
  v_home uuid;
  v_egor uuid;
begin
  select id into v_home from public.homes order by created_at asc limit 1;
  select id into v_egor
    from public.profiles
    where display_name ilike 'Егор%'
    order by created_at asc
    limit 1;
  if v_home is null then
    raise exception 'Дом не найден';
  end if;
  if v_egor is null then
    raise exception 'Профиль «Егор» не найден. Посмотрите display_name в profiles.';
  end if;

  update public.homes set created_by = v_egor where id = v_home;
  update public.profiles
  set
    home_id = case when id = v_egor then v_home else home_id end,
    is_creator = (id = v_egor)
  where home_id = v_home or id = v_egor;
end;
$$;
