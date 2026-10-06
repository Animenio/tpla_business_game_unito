create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_session_member(p_session_id uuid)
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
  );
$$;

create or replace function private.is_session_staff(p_session_id uuid)
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
      and sm.role in ('teacher', 'admin')
  );
$$;

create or replace function private.is_team_member(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = p_team_id
      and tm.user_id = auth.uid()
  );
$$;

create or replace function private.shares_team(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members mine
    join public.team_members theirs
      on theirs.team_id = mine.team_id
    where mine.user_id = auth.uid()
      and theirs.user_id = p_user_id
  );
$$;

revoke all on function private.is_session_member(uuid) from public, anon;
revoke all on function private.is_session_staff(uuid) from public, anon;
revoke all on function private.is_team_member(uuid) from public, anon;
revoke all on function private.shares_team(uuid) from public, anon;

grant execute on function private.is_session_member(uuid) to authenticated;
grant execute on function private.is_session_staff(uuid) to authenticated;
grant execute on function private.is_team_member(uuid) to authenticated;
grant execute on function private.shares_team(uuid) to authenticated;

alter function public.touch_updated_at() set search_path = public;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.enforce_one_team_per_session() from public, anon, authenticated;

revoke all on function public.create_team(text) from public, anon;
revoke all on function public.join_team(text) from public, anon;
revoke all on function public.leave_team(uuid) from public, anon;
revoke all on function public.session_team_count(uuid) from public, anon;

grant execute on function public.create_team(text) to authenticated;
grant execute on function public.join_team(text) to authenticated;
grant execute on function public.leave_team(uuid) to authenticated;
grant execute on function public.session_team_count(uuid) to authenticated;

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

  if not private.is_session_member(v_session_id) then
    raise exception 'TEAM_OUTSIDE_SESSION';
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

create or replace function public.session_team_count(p_session_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not private.is_session_member(p_session_id)
     and not private.is_session_staff(p_session_id) then
    raise exception 'FORBIDDEN';
  end if;

  return (
    select count(*)::integer
    from public.teams t
    where t.session_id = p_session_id
  );
end;
$$;

drop policy if exists profiles_select_visible on public.profiles;
create policy profiles_select_visible
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or private.shares_team(id)
);

drop policy if exists game_sessions_select_member on public.game_sessions;
create policy game_sessions_select_member
on public.game_sessions
for select
to authenticated
using (
  private.is_session_member(id)
  or private.is_session_staff(id)
);

drop policy if exists session_members_select_visible on public.session_members;
create policy session_members_select_visible
on public.session_members
for select
to authenticated
using (
  user_id = (select auth.uid())
  or private.is_session_staff(session_id)
);

drop policy if exists teams_select_visible on public.teams;
create policy teams_select_visible
on public.teams
for select
to authenticated
using (
  private.is_team_member(id)
  or private.is_session_staff(session_id)
);

drop policy if exists team_members_select_visible on public.team_members;
create policy team_members_select_visible
on public.team_members
for select
to authenticated
using (
  private.is_team_member(team_id)
  or exists (
    select 1
    from public.teams t
    where t.id = team_id
      and private.is_session_staff(t.session_id)
  )
);

create index if not exists idx_game_sessions_created_by
  on public.game_sessions(created_by);

create index if not exists idx_teams_created_by
  on public.teams(created_by);

drop function if exists public.is_session_member(uuid);
drop function if exists public.is_session_staff(uuid);
drop function if exists public.is_team_member(uuid);
drop function if exists public.shares_team(uuid);
