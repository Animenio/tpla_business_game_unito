do $$
begin
  create type public.round_status as enum (
    'pending',
    'open',
    'closed',
    'results_released'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.decision_submission_status as enum (
    'draft',
    'submitted'
  );
exception
  when duplicate_object then null;
end $$;

alter table public.game_sessions
  add column if not exists study_ends_at timestamptz;

create table if not exists public.session_rounds (
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  round_number smallint not null check (round_number between 1 and 3),
  status public.round_status not null default 'pending',
  opened_at timestamptz,
  closes_at timestamptz,
  closed_at timestamptz,
  results_released_at timestamptz,
  primary key (session_id, round_number)
);

create table if not exists public.session_materials (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  material_key text not null,
  title text not null,
  description text,
  file_type text not null,
  external_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (session_id, material_key)
);

create table if not exists public.team_round_decisions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  round_number smallint not null check (round_number between 1 and 3),
  hv_price_change numeric not null,
  std_price_change numeric not null,
  marketing_change numeric not null,
  rnd_pct numeric not null,
  capex_pct numeric not null,
  inventory_days integer not null,
  receivable_days integer not null,
  natural_rubber_hedge numeric not null,
  connected_rnd_allocation numeric not null,
  rationale text,
  status public.decision_submission_status not null default 'draft',
  updated_by uuid not null references public.profiles(id) on delete restrict,
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  submitted_by uuid references public.profiles(id) on delete restrict,
  unique (team_id, round_number),
  constraint team_round_decisions_team_session_match
    foreign key (team_id, session_id)
    references public.teams(id, session_id)
    on delete cascade
);

create table if not exists public.team_round_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  round_number smallint not null check (round_number between 1 and 3),
  model_version text not null,
  result jsonb not null,
  calculated_at timestamptz not null default now(),
  unique (team_id, round_number),
  constraint team_round_results_team_session_match
    foreign key (team_id, session_id)
    references public.teams(id, session_id)
    on delete cascade
);

create unique index if not exists teams_id_session_unique
  on public.teams(id, session_id);

create index if not exists idx_session_rounds_status
  on public.session_rounds(session_id, status, round_number);

create index if not exists idx_session_materials_session_sort
  on public.session_materials(session_id, sort_order, created_at);

create index if not exists idx_team_round_decisions_session_round
  on public.team_round_decisions(session_id, round_number, status);

create index if not exists idx_team_round_decisions_updated_by
  on public.team_round_decisions(updated_by);

create index if not exists idx_team_round_decisions_submitted_by
  on public.team_round_decisions(submitted_by)
  where submitted_by is not null;

create index if not exists idx_team_round_results_session_round
  on public.team_round_results(session_id, round_number);

create or replace function public.touch_team_round_decisions_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_team_round_decisions_updated_at
  on public.team_round_decisions;

create trigger trg_team_round_decisions_updated_at
before update on public.team_round_decisions
for each row execute function public.touch_team_round_decisions_updated_at();

alter table public.session_rounds enable row level security;
alter table public.session_materials enable row level security;
alter table public.team_round_decisions enable row level security;
alter table public.team_round_results enable row level security;

drop policy if exists session_rounds_select_visible on public.session_rounds;
create policy session_rounds_select_visible
on public.session_rounds
for select
to authenticated
using (
  private.is_session_member(session_id)
  or private.is_session_staff(session_id)
);

drop policy if exists session_materials_select_visible on public.session_materials;
create policy session_materials_select_visible
on public.session_materials
for select
to authenticated
using (
  private.is_session_staff(session_id)
  or (
    private.is_session_member(session_id)
    and exists (
      select 1
      from public.game_sessions gs
      where gs.id = session_id
        and gs.status in ('live', 'completed')
    )
  )
);

drop policy if exists team_round_decisions_select_visible
  on public.team_round_decisions;
create policy team_round_decisions_select_visible
on public.team_round_decisions
for select
to authenticated
using (
  private.is_team_member(team_id)
  or private.is_session_staff(session_id)
);

drop policy if exists team_round_results_select_visible
  on public.team_round_results;
create policy team_round_results_select_visible
on public.team_round_results
for select
to authenticated
using (
  private.is_session_staff(session_id)
  or (
    private.is_team_member(team_id)
    and exists (
      select 1
      from public.session_rounds sr
      where sr.session_id = team_round_results.session_id
        and sr.round_number = team_round_results.round_number
        and sr.status = 'results_released'
    )
  )
);

create or replace function public.teacher_open_round(
  p_session_id uuid,
  p_round_number smallint
)
returns public.round_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_status public.session_status;
  v_round_status public.round_status;
  v_previous_status public.round_status;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_round_number < 1 or p_round_number > 3 then
    raise exception 'INVALID_ROUND';
  end if;

  if not private.is_session_staff(p_session_id) then
    raise exception 'FORBIDDEN';
  end if;

  select status
    into v_session_status
  from public.game_sessions
  where id = p_session_id;

  if v_session_status <> 'live' then
    raise exception 'SESSION_NOT_LIVE';
  end if;

  insert into public.session_rounds (session_id, round_number)
  values (p_session_id, p_round_number)
  on conflict (session_id, round_number) do nothing;

  select status
    into v_round_status
  from public.session_rounds
  where session_id = p_session_id
    and round_number = p_round_number
  for update;

  if v_round_status <> 'pending' then
    raise exception 'ROUND_NOT_PENDING';
  end if;

  if p_round_number > 1 then
    select status
      into v_previous_status
    from public.session_rounds
    where session_id = p_session_id
      and round_number = p_round_number - 1;

    if v_previous_status <> 'results_released' then
      raise exception 'PREVIOUS_ROUND_NOT_COMPLETE';
    end if;
  end if;

  update public.session_rounds
  set status = 'open',
      opened_at = now(),
      closes_at = now() + interval '12 minutes',
      closed_at = null,
      results_released_at = null
  where session_id = p_session_id
    and round_number = p_round_number;

  insert into public.session_events (
    session_id,
    actor_user_id,
    event_type,
    payload
  )
  values (
    p_session_id,
    auth.uid(),
    'round_opened',
    jsonb_build_object(
      'round_number', p_round_number,
      'closes_at', now() + interval '12 minutes'
    )
  );

  return 'open';
end;
$$;

revoke all on function public.teacher_open_round(uuid, smallint)
  from public, anon;
grant execute on function public.teacher_open_round(uuid, smallint)
  to authenticated;

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
        started_at = coalesce(started_at, now()),
        study_ends_at = coalesce(study_ends_at, now() + interval '20 minutes')
    where id = p_session_id;

    update public.teams
    set status = 'active'
    where session_id = p_session_id
      and status = 'confirmed';

    insert into public.session_rounds (session_id, round_number)
    select p_session_id, n
    from generate_series(1, 3) as n
    on conflict (session_id, round_number) do nothing;

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

revoke all on function public.teacher_set_session_status(uuid, public.session_status)
  from public, anon;
grant execute on function public.teacher_set_session_status(uuid, public.session_status)
  to authenticated;

insert into public.session_rounds (session_id, round_number)
select gs.id, n
from public.game_sessions gs
cross join generate_series(1, 3) as n
where gs.status in ('live', 'completed')
on conflict (session_id, round_number) do nothing;

insert into public.session_materials (
  session_id,
  material_key,
  title,
  description,
  file_type,
  external_url,
  sort_order
)
select
  gs.id,
  material.material_key,
  material.title,
  material.description,
  material.file_type,
  null,
  material.sort_order
from public.game_sessions gs
cross join (
  values
    (
      'financial-statements-2025',
      'Bilancio consolidato semplificato',
      'Conto economico · stato patrimoniale · rendiconto finanziario',
      'XLSX',
      10
    ),
    (
      'notes-2025',
      'Nota integrativa 2025 — Aurora Tyres',
      'Principi contabili · dettaglio voci · capitale circolante · rischi',
      'PDF',
      20
    )
) as material(material_key, title, description, file_type, sort_order)
where gs.code = 'ACCOUNTING26'
on conflict (session_id, material_key) do update
set title = excluded.title,
    description = excluded.description,
    file_type = excluded.file_type,
    sort_order = excluded.sort_order;

do $$
begin
  alter publication supabase_realtime add table public.session_rounds;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.session_materials;
exception
  when duplicate_object then null;
end $$;
