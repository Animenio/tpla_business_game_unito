do $$
begin
  create type public.app_role as enum ('student', 'teacher', 'admin');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.session_status as enum (
    'draft',
    'registration_open',
    'locked',
    'live',
    'completed',
    'archived'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.team_status as enum (
    'forming',
    'confirmed',
    'active',
    'completed'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role public.app_role not null default 'student',
  created_at timestamptz not null default now()
);

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  academic_year text,
  status public.session_status not null default 'draft',
  model_version text not null default 'aurora-tyres-v0.4',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_sessions_code_uppercase check (code = upper(code))
);

create table if not exists public.session_members (
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null default 'student',
  joined_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  name text not null,
  join_code text not null unique,
  status public.team_status not null default 'forming',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint teams_name_length check (char_length(trim(name)) between 2 and 60),
  constraint teams_join_code_uppercase check (join_code = upper(join_code))
);

create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create index if not exists idx_session_members_user
  on public.session_members(user_id);

create index if not exists idx_teams_session
  on public.teams(session_id);

create index if not exists idx_team_members_user
  on public.team_members(user_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_game_sessions_updated_at on public.game_sessions;
create trigger trg_game_sessions_updated_at
before update on public.game_sessions
for each row execute function public.touch_updated_at();

create or replace function public.is_session_member(p_session_id uuid)
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

create or replace function public.is_session_staff(p_session_id uuid)
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

create or replace function public.is_team_member(p_team_id uuid)
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

create or replace function public.shares_team(p_user_id uuid)
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

create or replace function public.validate_session_code(p_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.game_sessions gs
    where gs.code = upper(trim(p_code))
      and gs.status = 'registration_open'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_session_code text;
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    coalesce(new.email, '')
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email;

  v_session_code := upper(trim(coalesce(
    new.raw_user_meta_data ->> 'session_code',
    ''
  )));

  if v_session_code <> '' then
    select gs.id
      into v_session_id
    from public.game_sessions gs
    where gs.code = v_session_code
      and gs.status = 'registration_open'
    limit 1;

    if v_session_id is not null then
      insert into public.session_members (session_id, user_id, role)
      values (v_session_id, new.id, 'student')
      on conflict (session_id, user_id) do nothing;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.enforce_one_team_per_session()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
begin
  select t.session_id
    into v_session_id
  from public.teams t
  where t.id = new.team_id;

  if exists (
    select 1
    from public.team_members tm
    join public.teams t on t.id = tm.team_id
    where tm.user_id = new.user_id
      and t.session_id = v_session_id
      and tm.team_id <> new.team_id
  ) then
    raise exception 'USER_ALREADY_IN_TEAM_FOR_SESSION';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_one_team_per_session on public.team_members;
create trigger trg_one_team_per_session
before insert or update on public.team_members
for each row execute function public.enforce_one_team_per_session();

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
    and gs.status = 'registration_open'
  order by sm.joined_at desc
  limit 1;

  if v_session_id is null then
    raise exception 'NO_OPEN_SESSION';
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

  if not public.is_session_member(v_session_id) then
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

create or replace function public.leave_team(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
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

create or replace function public.session_team_count(p_session_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_session_member(p_session_id)
     and not public.is_session_staff(p_session_id) then
    raise exception 'FORBIDDEN';
  end if;

  return (
    select count(*)::integer
    from public.teams t
    where t.session_id = p_session_id
  );
end;
$$;

alter table public.profiles enable row level security;
alter table public.game_sessions enable row level security;
alter table public.session_members enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;

drop policy if exists profiles_select_visible on public.profiles;
create policy profiles_select_visible
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.shares_team(id)
);

drop policy if exists game_sessions_select_member on public.game_sessions;
create policy game_sessions_select_member
on public.game_sessions
for select
to authenticated
using (
  public.is_session_member(id)
  or public.is_session_staff(id)
);

drop policy if exists session_members_select_visible on public.session_members;
create policy session_members_select_visible
on public.session_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_session_staff(session_id)
);

drop policy if exists teams_select_visible on public.teams;
create policy teams_select_visible
on public.teams
for select
to authenticated
using (
  public.is_team_member(id)
  or public.is_session_staff(session_id)
);

drop policy if exists team_members_select_visible on public.team_members;
create policy team_members_select_visible
on public.team_members
for select
to authenticated
using (
  public.is_team_member(team_id)
  or exists (
    select 1
    from public.teams t
    where t.id = team_id
      and public.is_session_staff(t.session_id)
  )
);

revoke all on function public.create_team(text) from public;
revoke all on function public.join_team(text) from public;
revoke all on function public.leave_team(uuid) from public;
revoke all on function public.session_team_count(uuid) from public;

grant execute on function public.validate_session_code(text) to anon, authenticated;
grant execute on function public.create_team(text) to authenticated;
grant execute on function public.join_team(text) to authenticated;
grant execute on function public.leave_team(uuid) to authenticated;
grant execute on function public.session_team_count(uuid) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.team_members;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.teams;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.game_sessions;
exception
  when duplicate_object then null;
end $$;
