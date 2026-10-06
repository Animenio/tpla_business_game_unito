create or replace function private.is_session_student(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.session_members sm
    where sm.session_id = p_session_id
      and sm.user_id = auth.uid()
      and sm.role = 'student'
  );
$$;

revoke all on function private.is_session_student(uuid) from public, anon;
grant execute on function private.is_session_student(uuid) to authenticated;

create or replace function public.create_team(p_name text)
returns table(team_id uuid, join_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_team_id uuid;
  v_join_code text;
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  v_name := trim(p_name);

  if char_length(v_name) < 2 or char_length(v_name) > 60 then
    raise exception 'INVALID_TEAM_NAME';
  end if;

  select sm.session_id
    into v_session_id
  from public.session_members sm
  join public.game_sessions gs on gs.id = sm.session_id
  where sm.user_id = auth.uid()
    and sm.role = 'student'
    and gs.status = 'registration_open'
  order by sm.joined_at desc
  limit 1;

  if v_session_id is null then
    raise exception 'NO_OPEN_STUDENT_SESSION';
  end if;

  if exists (
    select 1
    from public.team_members tm
    join public.teams t on t.id = tm.team_id
    where tm.user_id = auth.uid()
      and t.session_id = v_session_id
  ) then
    raise exception 'USER_ALREADY_IN_TEAM_FOR_SESSION';
  end if;

  loop
    v_join_code := upper(substr(md5(
      random()::text || clock_timestamp()::text || auth.uid()::text
    ), 1, 4));

    exit when not exists (
      select 1 from public.teams t where t.join_code = v_join_code
    );
  end loop;

  insert into public.teams (
    session_id,
    name,
    join_code,
    status,
    created_by
  )
  values (
    v_session_id,
    v_name,
    v_join_code,
    'forming',
    auth.uid()
  )
  returning id into v_team_id;

  insert into public.team_members (team_id, user_id)
  values (v_team_id, auth.uid());

  return query
  select v_team_id, v_join_code;
end;
$$;

create or replace function public.join_team(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_session_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select t.id, t.session_id
    into v_team_id, v_session_id
  from public.teams t
  join public.game_sessions gs on gs.id = t.session_id
  where t.join_code = upper(trim(p_code))
    and gs.status = 'registration_open'
  limit 1;

  if v_team_id is null then
    raise exception 'TEAM_NOT_FOUND';
  end if;

  if not private.is_session_student(v_session_id) then
    raise exception 'TEAM_OUTSIDE_STUDENT_SESSION';
  end if;

  if exists (
    select 1
    from public.team_members tm
    join public.teams t on t.id = tm.team_id
    where tm.user_id = auth.uid()
      and t.session_id = v_session_id
  ) then
    raise exception 'USER_ALREADY_IN_TEAM_FOR_SESSION';
  end if;

  insert into public.team_members (team_id, user_id)
  values (v_team_id, auth.uid());

  return v_team_id;
end;
$$;

revoke all on function public.create_team(text) from public, anon;
revoke all on function public.join_team(text) from public, anon;
grant execute on function public.create_team(text) to authenticated;
grant execute on function public.join_team(text) to authenticated;
