-- Удаление своего аккаунта: слот человека освобождается, списки семьи у других остаются.
-- SQL Editor → New query → Run.

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

grant execute on function public.delete_my_account() to authenticated;
