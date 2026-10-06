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
    and t.status = 'forming'
    and gs.status = 'registration_open'
  limit 1;

  if v_team_id is null then
    raise exception 'TEAM_NOT_FOUND_OR_LOCKED';
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

create or replace function public.leave_team(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_session_status public.session_status;
  v_team_status public.team_status;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select t.session_id, t.status, gs.status
    into v_session_id, v_team_status, v_session_status
  from public.teams t
  join public.game_sessions gs on gs.id = t.session_id
  where t.id = p_team_id
  limit 1;

  if v_session_id is null then
    raise exception 'TEAM_NOT_FOUND';
  end if;

  if not private.is_session_student(v_session_id) then
    raise exception 'FORBIDDEN';
  end if;

  if v_session_status <> 'registration_open'
     or v_team_status <> 'forming' then
    raise exception 'TEAM_MEMBERSHIP_LOCKED';
  end if;

  delete from public.team_members
  where team_id = p_team_id
    and user_id = auth.uid();

  delete from public.teams t
  where t.id = p_team_id
    and not exists (
      select 1
      from public.team_members tm
      where tm.team_id = t.id
    );
end;
$$;

revoke all on function public.join_team(text) from public, anon;
revoke all on function public.leave_team(uuid) from public, anon;
grant execute on function public.join_team(text) to authenticated;
grant execute on function public.leave_team(uuid) to authenticated;
