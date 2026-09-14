-- Выход участника из семьи в собственный дом.
-- Организатор выйти так не может (нужно сначала передать дом / исключить остальных — пока только блок).
-- SQL Editor → New query → Run.

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

grant execute on function public.leave_home() to authenticated;
