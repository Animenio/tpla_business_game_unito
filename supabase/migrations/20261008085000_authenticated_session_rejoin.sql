create or replace function public.complete_authenticated_session_join(
  p_session_code text
)
returns table (
  session_id uuid,
  assigned_role public.app_role
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_email text;
  v_full_name text;
  v_session_id uuid;
  v_session_status public.session_status;
  v_is_test boolean;
  v_existing_role public.app_role;
  v_role public.app_role := 'student';
  v_authorization_id uuid;
  v_target_in_team boolean;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select
    lower(coalesce(u.email, '')),
    coalesce(
      nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
      split_part(coalesce(u.email, ''), '@', 1)
    )
  into v_email, v_full_name
  from auth.users u
  where u.id = v_user_id;

  if v_email is null or v_email = '' then
    raise exception 'EMAIL_REQUIRED';
  end if;

  select gs.id, gs.status, gs.is_test
    into v_session_id, v_session_status, v_is_test
  from public.game_sessions gs
  where gs.code = upper(trim(p_session_code))
  limit 1;

  if v_session_id is null then
    raise exception 'SESSION_NOT_FOUND';
  end if;

  if v_session_status = 'archived' then
    raise exception 'SESSION_ARCHIVED';
  end if;

  if not v_is_test and not private.is_unito_email(v_email) then
    raise exception 'UNSUPPORTED_EMAIL_DOMAIN';
  end if;

  select sm.role
    into v_existing_role
  from public.session_members sm
  where sm.session_id = v_session_id
    and sm.user_id = v_user_id
  limit 1;

  select sa.id, sa.role
    into v_authorization_id, v_role
  from public.staff_authorizations sa
  where sa.session_id = v_session_id
    and sa.email = v_email
    and sa.revoked_at is null
    and sa.role in ('teacher', 'admin')
  order by sa.authorized_at desc
  limit 1;

  if v_authorization_id is null then
    if v_existing_role in ('teacher', 'admin') then
      v_role := v_existing_role;
    else
      v_role := 'student';
    end if;
  end if;

  if v_existing_role is null
     and v_role = 'student'
     and v_session_status <> 'registration_open' then
    raise exception 'REGISTRATION_CLOSED';
  end if;

  if v_role in ('teacher', 'admin') then
    select exists (
      select 1
      from public.team_members tm
      join public.teams t on t.id = tm.team_id
      where tm.user_id = v_user_id
        and t.session_id = v_session_id
    )
    into v_target_in_team;

    if v_target_in_team then
      raise exception 'TARGET_IN_STUDENT_TEAM';
    end if;
  end if;

  insert into public.profiles (id, full_name, email, role)
  values (v_user_id, v_full_name, v_email, v_role)
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email,
        role = case
          when public.profiles.role = 'admin' then 'admin'::public.app_role
          when excluded.role = 'admin' then 'admin'::public.app_role
          when public.profiles.role = 'teacher' then 'teacher'::public.app_role
          when excluded.role = 'teacher' then 'teacher'::public.app_role
          else 'student'::public.app_role
        end;

  insert into public.session_members (session_id, user_id, role)
  values (v_session_id, v_user_id, v_role)
  on conflict on constraint session_members_pkey do update
    set role = case
      when public.session_members.role = 'admin' then 'admin'::public.app_role
      when excluded.role = 'admin' then 'admin'::public.app_role
      when public.session_members.role = 'teacher' then 'teacher'::public.app_role
      when excluded.role = 'teacher' then 'teacher'::public.app_role
      else 'student'::public.app_role
    end
  returning public.session_members.role into v_role;

  if v_authorization_id is not null then
    update public.staff_authorizations
    set claimed_by = v_user_id,
        claimed_at = coalesce(claimed_at, now())
    where id = v_authorization_id;
  end if;

  insert into public.session_events (
    session_id,
    actor_user_id,
    event_type,
    payload
  )
  values (
    v_session_id,
    v_user_id,
    'authenticated_session_join',
    jsonb_build_object(
      'email', v_email,
      'role', v_role,
      'is_test', v_is_test
    )
  );

  return query
  select v_session_id, v_role;
end;
$$;

revoke all on function public.complete_authenticated_session_join(text)
  from public, anon;
grant execute on function public.complete_authenticated_session_join(text)
  to authenticated;
