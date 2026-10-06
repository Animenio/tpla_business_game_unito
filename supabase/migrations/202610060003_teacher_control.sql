alter table public.game_sessions
  add column if not exists registration_locked_at timestamptz,
  add column if not exists started_at timestamptz;

create table if not exists public.session_events (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_session_events_session_created
  on public.session_events(session_id, created_at desc);

create index if not exists idx_session_events_team
  on public.session_events(team_id)
  where team_id is not null;

create or replace function private.staff_shares_session(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.session_members staff
    join public.session_members target
      on target.session_id = staff.session_id
    where staff.user_id = auth.uid()
      and staff.role in ('teacher', 'admin')
      and target.user_id = p_user_id
  );
$$;

revoke all on function private.staff_shares_session(uuid) from public, anon;
grant execute on function private.staff_shares_session(uuid) to authenticated;

drop policy if exists profiles_select_visible on public.profiles;
create policy profiles_select_visible
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or private.shares_team(id)
  or private.staff_shares_session(id)
);

alter table public.session_events enable row level security;

drop policy if exists session_events_select_staff on public.session_events;
create policy session_events_select_staff
on public.session_events
for select
to authenticated
using (private.is_session_staff(session_id));

create or replace function public.teacher_set_team_status(
  p_team_id uuid,
  p_status public.team_status
)
returns public.team_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_session_status public.session_status;
  v_current_status public.team_status;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_status not in ('forming'::public.team_status, 'confirmed'::public.team_status) then
    raise exception 'INVALID_TEAM_STATUS';
  end if;

  select t.session_id, t.status, gs.status
    into v_session_id, v_current_status, v_session_status
  from public.teams t
  join public.game_sessions gs on gs.id = t.session_id
  where t.id = p_team_id
  limit 1;

  if v_session_id is null then
    raise exception 'TEAM_NOT_FOUND';
  end if;

  if not private.is_session_staff(v_session_id) then
    raise exception 'FORBIDDEN';
  end if;

  if v_session_status not in (
    'registration_open'::public.session_status,
    'locked'::public.session_status
  ) then
    raise exception 'SESSION_NOT_EDITABLE';
  end if;

  if v_current_status = p_status then
    return v_current_status;
  end if;

  update public.teams
  set status = p_status
  where id = p_team_id;

  insert into public.session_events (
    session_id,
    team_id,
    actor_user_id,
    event_type,
    payload
  )
  values (
    v_session_id,
    p_team_id,
    auth.uid(),
    'team_status_changed',
    jsonb_build_object(
      'from', v_current_status,
      'to', p_status
    )
  );

  return p_status;
end;
$$;

create or replace function public.teacher_set_session_status(
  p_session_id uuid,
  p_status public.session_status
)
returns public.session_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_status public.session_status;
  v_team_count integer;
  v_unconfirmed integer;
  v_unassigned integer;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select gs.status
    into v_current_status
  from public.game_sessions gs
  where gs.id = p_session_id
  limit 1;

  if v_current_status is null then
    raise exception 'SESSION_NOT_FOUND';
  end if;

  if not private.is_session_staff(p_session_id) then
    raise exception 'FORBIDDEN';
  end if;

  if v_current_status = p_status then
    return v_current_status;
  end if;

  if v_current_status = 'registration_open'
     and p_status = 'locked' then

    update public.game_sessions
    set status = 'locked',
        registration_locked_at = now()
    where id = p_session_id;

  elsif v_current_status = 'locked'
        and p_status = 'registration_open' then

    update public.game_sessions
    set status = 'registration_open',
        registration_locked_at = null
    where id = p_session_id;

  elsif v_current_status = 'locked'
        and p_status = 'live' then

    select count(*)::integer,
           count(*) filter (where status <> 'confirmed')::integer
      into v_team_count, v_unconfirmed
    from public.teams
    where session_id = p_session_id;

    if v_team_count = 0 then
      raise exception 'NO_TEAMS';
    end if;

    if v_unconfirmed > 0 then
      raise exception 'TEAMS_NOT_CONFIRMED';
    end if;

    select count(*)::integer
      into v_unassigned
    from public.session_members sm
    where sm.session_id = p_session_id
      and sm.role = 'student'
      and not exists (
        select 1
        from public.team_members tm
        join public.teams t on t.id = tm.team_id
        where tm.user_id = sm.user_id
          and t.session_id = p_session_id
      );

    if v_unassigned > 0 then
      raise exception 'UNASSIGNED_STUDENTS';
    end if;

    update public.game_sessions
    set status = 'live',
        started_at = coalesce(started_at, now())
    where id = p_session_id;

    update public.teams
    set status = 'active'
    where session_id = p_session_id
      and status = 'confirmed';

  else
    raise exception 'INVALID_SESSION_TRANSITION';
  end if;

  insert into public.session_events (
    session_id,
    actor_user_id,
    event_type,
    payload
  )
  values (
    p_session_id,
    auth.uid(),
    'session_status_changed',
    jsonb_build_object(
      'from', v_current_status,
      'to', p_status
    )
  );

  return p_status;
end;
$$;

create or replace function public.teacher_session_counts(p_session_id uuid)
returns table (
  registered_students integer,
  team_count integer,
  confirmed_team_count integer,
  unassigned_students integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not private.is_session_staff(p_session_id) then
    raise exception 'FORBIDDEN';
  end if;

  return query
  select
    (
      select count(*)::integer
      from public.session_members sm
      where sm.session_id = p_session_id
        and sm.role = 'student'
    ),
    (
      select count(*)::integer
      from public.teams t
      where t.session_id = p_session_id
    ),
    (
      select count(*)::integer
      from public.teams t
      where t.session_id = p_session_id
        and t.status in ('confirmed', 'active', 'completed')
    ),
    (
      select count(*)::integer
      from public.session_members sm
      where sm.session_id = p_session_id
        and sm.role = 'student'
        and not exists (
          select 1
          from public.team_members tm
          join public.teams t on t.id = tm.team_id
          where tm.user_id = sm.user_id
            and t.session_id = p_session_id
        )
    );
end;
$$;

revoke all on function public.teacher_set_team_status(uuid, public.team_status)
  from public, anon;
revoke all on function public.teacher_set_session_status(uuid, public.session_status)
  from public, anon;
revoke all on function public.teacher_session_counts(uuid)
  from public, anon;

grant execute on function public.teacher_set_team_status(uuid, public.team_status)
  to authenticated;
grant execute on function public.teacher_set_session_status(uuid, public.session_status)
  to authenticated;
grant execute on function public.teacher_session_counts(uuid)
  to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.session_members;
exception
  when duplicate_object then null;
end $$;
