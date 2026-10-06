do $$
begin
  create type public.round_status as enum ('scheduled', 'open', 'closed');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.decision_status as enum ('draft', 'submitted');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.round_objective as enum (
    'crescita',
    'margine',
    'cassa',
    'resilienza',
    'innovazione'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.session_materials (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  title text not null,
  description text,
  file_type text not null,
  source_url text,
  sort_order smallint not null,
  required boolean not null default true,
  created_at timestamptz not null default now(),
  unique (session_id, sort_order)
);

create table if not exists public.game_rounds (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  round_number smallint not null check (round_number between 1 and 3),
  period_label text not null,
  scenario_title text not null,
  scenario_summary text not null,
  status public.round_status not null default 'scheduled',
  decision_window_minutes integer not null default 12
    check (decision_window_minutes between 1 and 120),
  opens_at timestamptz,
  closes_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (session_id, round_number)
);

create table if not exists public.team_round_decisions (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.game_rounds(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  objective public.round_objective not null,
  hv_price_change numeric(8,4) not null,
  std_price_change numeric(8,4) not null,
  marketing_change numeric(8,4) not null,
  rnd_pct numeric(8,4) not null,
  capex_pct numeric(8,4) not null,
  inventory_days integer not null,
  receivable_days integer not null,
  natural_rubber_hedge numeric(8,4) not null,
  connected_rnd_allocation numeric(8,4) not null,
  status public.decision_status not null default 'draft',
  submitted_by uuid references public.profiles(id) on delete set null,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (round_id, team_id),
  constraint trd_hv_price_bounds check (hv_price_change between -0.10 and 0.15),
  constraint trd_std_price_bounds check (std_price_change between -0.15 and 0.10),
  constraint trd_marketing_bounds check (marketing_change between -0.50 and 1.00),
  constraint trd_rnd_bounds check (rnd_pct between 0.02 and 0.08),
  constraint trd_capex_bounds check (capex_pct between 0.03 and 0.10),
  constraint trd_inventory_bounds check (inventory_days between 90 and 170),
  constraint trd_receivable_bounds check (receivable_days between 25 and 60),
  constraint trd_hedge_bounds check (natural_rubber_hedge between 0 and 0.80),
  constraint trd_connected_bounds check (connected_rnd_allocation between 0 and 0.60),
  constraint trd_hv_price_step check (
    mod(((hv_price_change + 0.10) * 10000)::integer, 100) = 0
  ),
  constraint trd_std_price_step check (
    mod(((std_price_change + 0.15) * 10000)::integer, 100) = 0
  ),
  constraint trd_marketing_step check (
    mod(((marketing_change + 0.50) * 10000)::integer, 500) = 0
  ),
  constraint trd_rnd_step check (
    mod(((rnd_pct - 0.02) * 10000)::integer, 50) = 0
  ),
  constraint trd_capex_step check (
    mod(((capex_pct - 0.03) * 10000)::integer, 50) = 0
  ),
  constraint trd_inventory_step check (
    mod(inventory_days - 90, 5) = 0
  ),
  constraint trd_hedge_step check (
    mod((natural_rubber_hedge * 10000)::integer, 500) = 0
  ),
  constraint trd_connected_step check (
    mod((connected_rnd_allocation * 10000)::integer, 500) = 0
  ),
  constraint trd_submit_consistency check (
    (status = 'draft' and submitted_at is null and submitted_by is null)
    or
    (status = 'submitted' and submitted_at is not null and submitted_by is not null)
  )
);

create table if not exists public.team_round_results (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.game_rounds(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  model_version text not null,
  result jsonb not null,
  total_revenue numeric not null,
  adjusted_ebitda_margin numeric not null,
  unlevered_free_cash_flow numeric not null,
  net_debt numeric not null,
  premium_revenue_share numeric not null,
  strategic_health numeric not null,
  calculated_at timestamptz not null default now(),
  unique (round_id, team_id)
);

create index if not exists idx_session_materials_session
  on public.session_materials(session_id, sort_order);

create index if not exists idx_game_rounds_session_status
  on public.game_rounds(session_id, status);

create index if not exists idx_team_round_decisions_team
  on public.team_round_decisions(team_id, round_id);

create index if not exists idx_team_round_decisions_round_status
  on public.team_round_decisions(round_id, status);

create index if not exists idx_team_round_decisions_submitted_by
  on public.team_round_decisions(submitted_by)
  where submitted_by is not null;

create index if not exists idx_team_round_results_team
  on public.team_round_results(team_id, round_id);

drop trigger if exists trg_team_round_decisions_updated_at
  on public.team_round_decisions;
create trigger trg_team_round_decisions_updated_at
before update on public.team_round_decisions
for each row execute function public.touch_updated_at();

create or replace function private.can_edit_team_round_decision(
  p_team_id uuid,
  p_round_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members tm
    join public.teams t on t.id = tm.team_id
    join public.game_rounds gr
      on gr.id = p_round_id
     and gr.session_id = t.session_id
    where tm.team_id = p_team_id
      and tm.user_id = auth.uid()
      and t.status = 'active'
      and gr.status = 'open'
      and (gr.closes_at is null or now() <= gr.closes_at)
  );
$$;

create or replace function private.is_round_staff(p_round_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.game_rounds gr
    where gr.id = p_round_id
      and private.is_session_staff(gr.session_id)
  );
$$;

create or replace function private.can_view_team_round_result(
  p_team_id uuid,
  p_round_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members tm
    join public.game_rounds gr on gr.id = p_round_id
    join public.teams t
      on t.id = p_team_id
     and t.session_id = gr.session_id
    where tm.team_id = p_team_id
      and tm.user_id = auth.uid()
      and gr.status = 'closed'
  );
$$;

revoke all on function private.can_edit_team_round_decision(uuid, uuid)
  from public, anon;
revoke all on function private.is_round_staff(uuid)
  from public, anon;
revoke all on function private.can_view_team_round_result(uuid, uuid)
  from public, anon;

grant execute on function private.can_edit_team_round_decision(uuid, uuid)
  to authenticated;
grant execute on function private.is_round_staff(uuid)
  to authenticated;
grant execute on function private.can_view_team_round_result(uuid, uuid)
  to authenticated;

alter table public.session_materials enable row level security;
alter table public.game_rounds enable row level security;
alter table public.team_round_decisions enable row level security;
alter table public.team_round_results enable row level security;

drop policy if exists session_materials_select_member
  on public.session_materials;
create policy session_materials_select_member
on public.session_materials
for select
to authenticated
using (private.is_session_member(session_id));

drop policy if exists game_rounds_select_member
  on public.game_rounds;
create policy game_rounds_select_member
on public.game_rounds
for select
to authenticated
using (private.is_session_member(session_id));

drop policy if exists team_round_decisions_select_visible
  on public.team_round_decisions;
create policy team_round_decisions_select_visible
on public.team_round_decisions
for select
to authenticated
using (
  private.is_team_member(team_id)
  or private.is_round_staff(round_id)
);

drop policy if exists team_round_decisions_insert_own_team
  on public.team_round_decisions;
create policy team_round_decisions_insert_own_team
on public.team_round_decisions
for insert
to authenticated
with check (
  status = 'draft'
  and submitted_at is null
  and submitted_by is null
  and private.can_edit_team_round_decision(team_id, round_id)
);

drop policy if exists team_round_decisions_update_own_draft
  on public.team_round_decisions;
create policy team_round_decisions_update_own_draft
on public.team_round_decisions
for update
to authenticated
using (
  status = 'draft'
  and private.can_edit_team_round_decision(team_id, round_id)
)
with check (
  status = 'draft'
  and submitted_at is null
  and submitted_by is null
  and private.can_edit_team_round_decision(team_id, round_id)
);

drop policy if exists team_round_results_select_visible
  on public.team_round_results;
create policy team_round_results_select_visible
on public.team_round_results
for select
to authenticated
using (
  private.can_view_team_round_result(team_id, round_id)
  or private.is_round_staff(round_id)
);

grant select on public.session_materials to authenticated;
grant select on public.game_rounds to authenticated;
grant select, insert, update on public.team_round_decisions to authenticated;
grant select on public.team_round_results to authenticated;

create or replace function public.submit_team_round_decision(
  p_round_id uuid
)
returns public.decision_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_session_id uuid;
  v_round_status public.round_status;
  v_closes_at timestamptz;
  v_decision_status public.decision_status;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select gr.session_id, gr.status, gr.closes_at
    into v_session_id, v_round_status, v_closes_at
  from public.game_rounds gr
  where gr.id = p_round_id
  limit 1;

  if v_session_id is null then
    raise exception 'ROUND_NOT_FOUND';
  end if;

  if v_round_status <> 'open'
     or (v_closes_at is not null and now() > v_closes_at) then
    raise exception 'ROUND_NOT_OPEN';
  end if;

  select t.id
    into v_team_id
  from public.team_members tm
  join public.teams t on t.id = tm.team_id
  where tm.user_id = auth.uid()
    and t.session_id = v_session_id
    and t.status = 'active'
  limit 1;

  if v_team_id is null then
    raise exception 'TEAM_NOT_FOUND';
  end if;

  select d.status
    into v_decision_status
  from public.team_round_decisions d
  where d.round_id = p_round_id
    and d.team_id = v_team_id
  limit 1;

  if v_decision_status is null then
    raise exception 'DECISIONS_NOT_FOUND';
  end if;

  if v_decision_status = 'submitted' then
    return v_decision_status;
  end if;

  update public.team_round_decisions
  set status = 'submitted',
      submitted_by = auth.uid(),
      submitted_at = now()
  where round_id = p_round_id
    and team_id = v_team_id
    and status = 'draft';

  insert into public.session_events (
    session_id,
    team_id,
    actor_user_id,
    event_type,
    payload
  )
  values (
    v_session_id,
    v_team_id,
    auth.uid(),
    'round_decisions_submitted',
    jsonb_build_object('round_id', p_round_id)
  );

  return 'submitted';
end;
$$;

create or replace function public.teacher_open_round(
  p_round_id uuid,
  p_window_minutes integer default 12
)
returns public.round_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_round_number smallint;
  v_round_status public.round_status;
  v_session_status public.session_status;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_window_minutes < 1 or p_window_minutes > 120 then
    raise exception 'INVALID_WINDOW';
  end if;

  select gr.session_id, gr.round_number, gr.status, gs.status
    into v_session_id, v_round_number, v_round_status, v_session_status
  from public.game_rounds gr
  join public.game_sessions gs on gs.id = gr.session_id
  where gr.id = p_round_id
  limit 1;

  if v_session_id is null then
    raise exception 'ROUND_NOT_FOUND';
  end if;

  if not private.is_session_staff(v_session_id) then
    raise exception 'FORBIDDEN';
  end if;

  if v_session_status <> 'live' then
    raise exception 'SESSION_NOT_LIVE';
  end if;

  if v_round_status <> 'scheduled' then
    raise exception 'ROUND_NOT_SCHEDULED';
  end if;

  if exists (
    select 1
    from public.game_rounds gr
    where gr.session_id = v_session_id
      and gr.status = 'open'
  ) then
    raise exception 'ANOTHER_ROUND_OPEN';
  end if;

  if v_round_number > 1
     and not exists (
       select 1
       from public.game_rounds previous_round
       where previous_round.session_id = v_session_id
         and previous_round.round_number = v_round_number - 1
         and previous_round.status = 'closed'
     ) then
    raise exception 'PREVIOUS_ROUND_NOT_CLOSED';
  end if;

  update public.game_rounds
  set status = 'open',
      decision_window_minutes = p_window_minutes,
      opens_at = now(),
      closes_at = now() + make_interval(mins => p_window_minutes),
      closed_at = null
  where id = p_round_id;

  insert into public.session_events (
    session_id,
    actor_user_id,
    event_type,
    payload
  )
  values (
    v_session_id,
    auth.uid(),
    'round_opened',
    jsonb_build_object(
      'round_id', p_round_id,
      'round_number', v_round_number,
      'decision_window_minutes', p_window_minutes
    )
  );

  return 'open';
end;
$$;

create or replace function public.teacher_extend_round(
  p_round_id uuid,
  p_minutes integer default 2
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_status public.round_status;
  v_closes_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_minutes < 1 or p_minutes > 30 then
    raise exception 'INVALID_EXTENSION';
  end if;

  select gr.session_id, gr.status, gr.closes_at
    into v_session_id, v_status, v_closes_at
  from public.game_rounds gr
  where gr.id = p_round_id
  limit 1;

  if v_session_id is null then
    raise exception 'ROUND_NOT_FOUND';
  end if;

  if not private.is_session_staff(v_session_id) then
    raise exception 'FORBIDDEN';
  end if;

  if v_status <> 'open' then
    raise exception 'ROUND_NOT_OPEN';
  end if;

  update public.game_rounds
  set closes_at = greatest(coalesce(v_closes_at, now()), now())
        + make_interval(mins => p_minutes)
  where id = p_round_id
  returning closes_at into v_closes_at;

  insert into public.session_events (
    session_id,
    actor_user_id,
    event_type,
    payload
  )
  values (
    v_session_id,
    auth.uid(),
    'round_extended',
    jsonb_build_object(
      'round_id', p_round_id,
      'minutes', p_minutes,
      'closes_at', v_closes_at
    )
  );

  return v_closes_at;
end;
$$;

create or replace function public.teacher_finalize_round(
  p_round_id uuid,
  p_results jsonb
)
returns public.round_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_round_number smallint;
  v_status public.round_status;
  v_closes_at timestamptz;
  v_team_count integer;
  v_submitted_count integer;
  v_result_count integer;
  v_item jsonb;
  v_team_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select gr.session_id, gr.round_number, gr.status, gr.closes_at
    into v_session_id, v_round_number, v_status, v_closes_at
  from public.game_rounds gr
  where gr.id = p_round_id
  for update;

  if v_session_id is null then
    raise exception 'ROUND_NOT_FOUND';
  end if;

  if not private.is_session_staff(v_session_id) then
    raise exception 'FORBIDDEN';
  end if;

  if v_status <> 'open' then
    raise exception 'ROUND_NOT_OPEN';
  end if;

  select count(*)::integer
    into v_team_count
  from public.teams
  where session_id = v_session_id
    and status = 'active';

  select count(*)::integer
    into v_submitted_count
  from public.team_round_decisions d
  join public.teams t on t.id = d.team_id
  where d.round_id = p_round_id
    and d.status = 'submitted'
    and t.session_id = v_session_id
    and t.status = 'active';

  if v_submitted_count < v_team_count
     and (v_closes_at is null or now() < v_closes_at) then
    raise exception 'ROUND_STILL_IN_PROGRESS';
  end if;

  if jsonb_typeof(p_results) <> 'array' then
    raise exception 'INVALID_RESULTS_PAYLOAD';
  end if;

  select jsonb_array_length(p_results)
    into v_result_count;

  if v_result_count <> v_submitted_count then
    raise exception 'RESULT_COUNT_MISMATCH';
  end if;

  for v_item in
    select value
    from jsonb_array_elements(p_results)
  loop
    v_team_id := (v_item ->> 'team_id')::uuid;

    if not exists (
      select 1
      from public.team_round_decisions d
      join public.teams t on t.id = d.team_id
      where d.round_id = p_round_id
        and d.team_id = v_team_id
        and d.status = 'submitted'
        and t.session_id = v_session_id
        and t.status = 'active'
    ) then
      raise exception 'RESULT_TEAM_NOT_SUBMITTED';
    end if;

    insert into public.team_round_results (
      round_id,
      team_id,
      model_version,
      result,
      total_revenue,
      adjusted_ebitda_margin,
      unlevered_free_cash_flow,
      net_debt,
      premium_revenue_share,
      strategic_health,
      calculated_at
    )
    values (
      p_round_id,
      v_team_id,
      v_item ->> 'model_version',
      v_item -> 'result',
      (v_item ->> 'total_revenue')::numeric,
      (v_item ->> 'adjusted_ebitda_margin')::numeric,
      (v_item ->> 'unlevered_free_cash_flow')::numeric,
      (v_item ->> 'net_debt')::numeric,
      (v_item ->> 'premium_revenue_share')::numeric,
      (v_item ->> 'strategic_health')::numeric,
      now()
    )
    on conflict (round_id, team_id) do nothing;
  end loop;

  update public.game_rounds
  set status = 'closed',
      closed_at = now()
  where id = p_round_id;

  insert into public.session_events (
    session_id,
    actor_user_id,
    event_type,
    payload
  )
  values (
    v_session_id,
    auth.uid(),
    'round_closed',
    jsonb_build_object(
      'round_id', p_round_id,
      'round_number', v_round_number,
      'submitted_count', v_submitted_count,
      'team_count', v_team_count,
      'missing_count', v_team_count - v_submitted_count
    )
  );

  return 'closed';
end;
$$;

revoke all on function public.submit_team_round_decision(uuid)
  from public, anon;
revoke all on function public.teacher_open_round(uuid, integer)
  from public, anon;
revoke all on function public.teacher_extend_round(uuid, integer)
  from public, anon;
revoke all on function public.teacher_finalize_round(uuid, jsonb)
  from public, anon;

grant execute on function public.submit_team_round_decision(uuid)
  to authenticated;
grant execute on function public.teacher_open_round(uuid, integer)
  to authenticated;
grant execute on function public.teacher_extend_round(uuid, integer)
  to authenticated;
grant execute on function public.teacher_finalize_round(uuid, jsonb)
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
        started_at = coalesce(started_at, now())
    where id = p_session_id;

    update public.teams
    set status = 'active'
    where session_id = p_session_id
      and status = 'confirmed';

    insert into public.game_rounds (
      session_id,
      round_number,
      period_label,
      scenario_title,
      scenario_summary
    )
    values
      (
        p_session_id,
        1,
        '2026',
        'CRESCE IL PREMIUM',
        'Domanda totale stabile · Premium in crescita · Pressione sui costi e sul mix'
      ),
      (
        p_session_id,
        2,
        '2027–2028',
        'CRISI DEI COSTI E GUERRA DEI PREZZI',
        'Gomma e trasporti più cari · approvvigionamenti meno affidabili · forte pressione sui prezzi Standard'
      ),
      (
        p_session_id,
        3,
        '2029–2030',
        'OPPORTUNITÀ TECNOLOGICA E STRESS FINALE',
        'Mercato più lento · interesse crescente per EV e connected tyre · Standard debole · compliance più costosa'
      )
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

insert into public.game_rounds (
  session_id,
  round_number,
  period_label,
  scenario_title,
  scenario_summary
)
select
  gs.id,
  seed.round_number,
  seed.period_label,
  seed.scenario_title,
  seed.scenario_summary
from public.game_sessions gs
cross join (
  values
    (
      1::smallint,
      '2026'::text,
      'CRESCE IL PREMIUM'::text,
      'Domanda totale stabile · Premium in crescita · Pressione sui costi e sul mix'::text
    ),
    (
      2::smallint,
      '2027–2028'::text,
      'CRISI DEI COSTI E GUERRA DEI PREZZI'::text,
      'Gomma e trasporti più cari · approvvigionamenti meno affidabili · forte pressione sui prezzi Standard'::text
    ),
    (
      3::smallint,
      '2029–2030'::text,
      'OPPORTUNITÀ TECNOLOGICA E STRESS FINALE'::text,
      'Mercato più lento · interesse crescente per EV e connected tyre · Standard debole · compliance più costosa'::text
    )
) as seed(round_number, period_label, scenario_title, scenario_summary)
on conflict (session_id, round_number) do nothing;

insert into public.session_materials (
  session_id,
  title,
  description,
  file_type,
  source_url,
  sort_order,
  required
)
select
  gs.id,
  material.title,
  material.description,
  material.file_type,
  null,
  material.sort_order,
  true
from public.game_sessions gs
cross join (
  values
    (
      'Bilancio consolidato semplificato'::text,
      'Conto economico · stato patrimoniale · rendiconto finanziario'::text,
      'XLSX'::text,
      1::smallint
    ),
    (
      'Nota integrativa 2025 — Aurora Tyres'::text,
      'Principi contabili · dettaglio voci · capitale circolante · rischi'::text,
      'PDF'::text,
      2::smallint
    )
) as material(title, description, file_type, sort_order)
on conflict (session_id, sort_order) do nothing;

do $$
begin
  alter publication supabase_realtime add table public.game_rounds;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.team_round_decisions;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.team_round_results;
exception
  when duplicate_object then null;
end $$;
