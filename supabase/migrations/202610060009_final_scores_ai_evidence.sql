do $$
begin
  create type public.ai_submission_status as enum ('submitted', 'verified');
exception
  when duplicate_object then null;
end $$;

alter table public.game_sessions
  add column if not exists ai_submission_form_url text,
  add column if not exists completed_at timestamptz;

create table if not exists public.team_final_scores (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  model_version text not null,
  full_game_result jsonb not null,
  final_game_value numeric not null,
  enterprise_value numeric not null,
  implied_equity_value numeric not null,
  risk_penalty numeric not null,
  pv_explicit_ufcf numeric not null,
  pv_terminal_value numeric not null,
  cumulative_ufcf numeric not null,
  final_revenue numeric not null,
  final_ebitda_margin numeric not null,
  final_premium_share numeric not null,
  final_net_debt numeric not null,
  competitive_position numeric not null,
  strategic_health numeric not null,
  calculated_at timestamptz not null default now(),
  unique (session_id, team_id)
);

create table if not exists public.team_ai_submissions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  provider text not null,
  external_reference_url text,
  status public.ai_submission_status not null default 'submitted',
  confirmed_cleaned boolean not null default false,
  submitted_by uuid not null references public.profiles(id) on delete restrict,
  submitted_at timestamptz not null default now(),
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  unique (session_id, team_id),
  constraint team_ai_submissions_provider_check
    check (provider in ('chatgpt', 'claude', 'gemini', 'other')),
  constraint team_ai_submissions_reference_url_check
    check (
      external_reference_url is null
      or external_reference_url ~ '^https://'
    ),
  constraint team_ai_submissions_verification_check
    check (
      (status = 'submitted' and verified_by is null and verified_at is null)
      or
      (status = 'verified' and verified_by is not null and verified_at is not null)
    )
);

create index if not exists idx_team_final_scores_session_value
  on public.team_final_scores(session_id, final_game_value desc);

create index if not exists idx_team_final_scores_team
  on public.team_final_scores(team_id);

create index if not exists idx_team_ai_submissions_session
  on public.team_ai_submissions(session_id, status);

create index if not exists idx_team_ai_submissions_team
  on public.team_ai_submissions(team_id);

create index if not exists idx_team_ai_submissions_submitted_by
  on public.team_ai_submissions(submitted_by);

create index if not exists idx_team_ai_submissions_verified_by
  on public.team_ai_submissions(verified_by)
  where verified_by is not null;

alter table public.team_final_scores enable row level security;
alter table public.team_ai_submissions enable row level security;

drop policy if exists team_final_scores_select_visible
  on public.team_final_scores;
create policy team_final_scores_select_visible
on public.team_final_scores
for select
to authenticated
using (
  (
    private.is_team_member(team_id)
    and exists (
      select 1
      from public.game_sessions gs
      where gs.id = session_id
        and gs.status = 'completed'
    )
  )
  or private.is_session_staff(session_id)
);

drop policy if exists team_ai_submissions_select_visible
  on public.team_ai_submissions;
create policy team_ai_submissions_select_visible
on public.team_ai_submissions
for select
to authenticated
using (
  private.is_team_member(team_id)
  or private.is_session_staff(session_id)
);

grant select on public.team_final_scores to authenticated;
grant select on public.team_ai_submissions to authenticated;

create or replace function public.student_final_benchmark(
  p_session_id uuid
)
returns table (
  own_rank integer,
  total_teams integer,
  median_final_game_value numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_session_status public.session_status;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select gs.status
    into v_session_status
  from public.game_sessions gs
  where gs.id = p_session_id
  limit 1;

  if v_session_status <> 'completed' then
    raise exception 'SIMULATION_NOT_COMPLETED';
  end if;

  select t.id
    into v_team_id
  from public.team_members tm
  join public.teams t on t.id = tm.team_id
  where tm.user_id = auth.uid()
    and t.session_id = p_session_id
  limit 1;

  if v_team_id is null then
    raise exception 'TEAM_NOT_FOUND';
  end if;

  return query
  with ranked as (
    select
      fs.team_id,
      fs.final_game_value,
      rank() over (
        order by fs.final_game_value desc, fs.team_id
      )::integer as position
    from public.team_final_scores fs
    where fs.session_id = p_session_id
  ),
  stats as (
    select
      count(*)::integer as team_count,
      percentile_cont(0.5) within group (
        order by fs.final_game_value
      )::numeric as median_value
    from public.team_final_scores fs
    where fs.session_id = p_session_id
  )
  select
    r.position,
    s.team_count,
    s.median_value
  from ranked r
  cross join stats s
  where r.team_id = v_team_id;
end;
$$;

create or replace function public.submit_ai_evidence(
  p_provider text,
  p_confirmed_cleaned boolean,
  p_external_reference_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_team_id uuid;
  v_form_url text;
  v_submission_id uuid;
  v_provider text;
  v_reference text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  v_provider := lower(trim(coalesce(p_provider, '')));
  v_reference := nullif(trim(coalesce(p_external_reference_url, '')), '');

  if v_provider not in ('chatgpt', 'claude', 'gemini', 'other') then
    raise exception 'INVALID_PROVIDER';
  end if;

  if not coalesce(p_confirmed_cleaned, false) then
    raise exception 'CONFIRMATION_REQUIRED';
  end if;

  if v_reference is not null and v_reference !~ '^https://' then
    raise exception 'INVALID_REFERENCE_URL';
  end if;

  select gs.id, gs.ai_submission_form_url, t.id
    into v_session_id, v_form_url, v_team_id
  from public.team_members tm
  join public.teams t on t.id = tm.team_id
  join public.game_sessions gs on gs.id = t.session_id
  where tm.user_id = auth.uid()
    and gs.status = 'completed'
  order by gs.completed_at desc nulls last
  limit 1;

  if v_session_id is null or v_team_id is null then
    raise exception 'COMPLETED_TEAM_NOT_FOUND';
  end if;

  if nullif(trim(coalesce(v_form_url, '')), '') is null then
    raise exception 'SUBMISSION_FORM_NOT_CONFIGURED';
  end if;

  insert into public.team_ai_submissions (
    session_id,
    team_id,
    provider,
    external_reference_url,
    status,
    confirmed_cleaned,
    submitted_by,
    submitted_at,
    verified_by,
    verified_at
  )
  values (
    v_session_id,
    v_team_id,
    v_provider,
    v_reference,
    'submitted',
    true,
    auth.uid(),
    now(),
    null,
    null
  )
  on conflict (session_id, team_id)
  do update set
    provider = excluded.provider,
    external_reference_url = excluded.external_reference_url,
    status = 'submitted',
    confirmed_cleaned = true,
    submitted_by = auth.uid(),
    submitted_at = now(),
    verified_by = null,
    verified_at = null
  returning id into v_submission_id;

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
    'ai_evidence_declared_submitted',
    jsonb_build_object(
      'provider', v_provider,
      'has_external_reference', v_reference is not null
    )
  );

  return v_submission_id;
end;
$$;

create or replace function public.teacher_set_ai_submission_form_url(
  p_session_id uuid,
  p_url text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not private.is_session_staff(p_session_id) then
    raise exception 'FORBIDDEN';
  end if;

  v_url := trim(coalesce(p_url, ''));

  if v_url = '' then
    update public.game_sessions
    set ai_submission_form_url = null
    where id = p_session_id;

    return null;
  end if;

  if v_url !~ '^https://' then
    raise exception 'INVALID_URL';
  end if;

  update public.game_sessions
  set ai_submission_form_url = v_url
  where id = p_session_id;

  insert into public.session_events (
    session_id,
    actor_user_id,
    event_type,
    payload
  )
  values (
    p_session_id,
    auth.uid(),
    'ai_submission_form_configured',
    jsonb_build_object('configured', true)
  );

  return v_url;
end;
$$;

create or replace function public.teacher_verify_ai_evidence(
  p_team_id uuid
)
returns public.ai_submission_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select t.session_id
    into v_session_id
  from public.teams t
  where t.id = p_team_id
  limit 1;

  if v_session_id is null then
    raise exception 'TEAM_NOT_FOUND';
  end if;

  if not private.is_session_staff(v_session_id) then
    raise exception 'FORBIDDEN';
  end if;

  update public.team_ai_submissions
  set status = 'verified',
      verified_by = auth.uid(),
      verified_at = now()
  where session_id = v_session_id
    and team_id = p_team_id;

  if not found then
    raise exception 'AI_EVIDENCE_NOT_FOUND';
  end if;

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
    'ai_evidence_verified',
    '{}'::jsonb
  );

  return 'verified';
end;
$$;

drop function if exists public.teacher_finalize_round(uuid, jsonb);

create or replace function public.teacher_finalize_round(
  p_round_id uuid,
  p_results jsonb,
  p_final_scores jsonb default null
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
  v_model_version text;
  v_team_count integer;
  v_submitted_count integer;
  v_result_count integer;
  v_distinct_team_count integer;
  v_final_count integer;
  v_final_distinct_count integer;
  v_item jsonb;
  v_team_id uuid;
  v_decision_count integer;
  v_result_history_count integer;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select gr.session_id,
         gr.round_number,
         gr.status,
         gs.model_version
    into v_session_id,
         v_round_number,
         v_status,
         v_model_version
  from public.game_rounds gr
  join public.game_sessions gs on gs.id = gr.session_id
  where gr.id = p_round_id
  for update of gr;

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

  if v_submitted_count <> v_team_count then
    raise exception 'TEAMS_MISSING_SUBMISSION';
  end if;

  if jsonb_typeof(p_results) <> 'array' then
    raise exception 'INVALID_RESULTS_PAYLOAD';
  end if;

  select jsonb_array_length(p_results)
    into v_result_count;

  if v_result_count <> v_submitted_count then
    raise exception 'RESULT_COUNT_MISMATCH';
  end if;

  select count(distinct value ->> 'team_id')::integer
    into v_distinct_team_count
  from jsonb_array_elements(p_results);

  if v_distinct_team_count <> v_result_count then
    raise exception 'DUPLICATE_RESULT_TEAM';
  end if;

  for v_item in
    select value
    from jsonb_array_elements(p_results)
  loop
    if coalesce(v_item ->> 'model_version', '') <> v_model_version then
      raise exception 'MODEL_VERSION_MISMATCH';
    end if;

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
      v_model_version,
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

  if v_round_number = 3 then
    if jsonb_typeof(p_final_scores) <> 'array' then
      raise exception 'FINAL_SCORES_REQUIRED';
    end if;

    select jsonb_array_length(p_final_scores)
      into v_final_count;

    if v_final_count <> v_team_count then
      raise exception 'FINAL_SCORE_COUNT_MISMATCH';
    end if;

    select count(distinct value ->> 'team_id')::integer
      into v_final_distinct_count
    from jsonb_array_elements(p_final_scores);

    if v_final_distinct_count <> v_final_count then
      raise exception 'DUPLICATE_FINAL_SCORE_TEAM';
    end if;

    for v_item in
      select value
      from jsonb_array_elements(p_final_scores)
    loop
      if coalesce(v_item ->> 'model_version', '') <> v_model_version then
        raise exception 'MODEL_VERSION_MISMATCH';
      end if;

      v_team_id := (v_item ->> 'team_id')::uuid;

      if not exists (
        select 1
        from public.teams t
        where t.id = v_team_id
          and t.session_id = v_session_id
          and t.status = 'active'
      ) then
        raise exception 'FINAL_SCORE_TEAM_NOT_ACTIVE';
      end if;

      select count(*)::integer
        into v_decision_count
      from public.team_round_decisions d
      join public.game_rounds gr on gr.id = d.round_id
      where gr.session_id = v_session_id
        and d.team_id = v_team_id
        and d.status = 'submitted';

      if v_decision_count <> 3 then
        raise exception 'INCOMPLETE_TEAM_DECISIONS';
      end if;

      select count(*)::integer
        into v_result_history_count
      from public.team_round_results rr
      join public.game_rounds gr on gr.id = rr.round_id
      where gr.session_id = v_session_id
        and rr.team_id = v_team_id;

      if v_result_history_count <> 3 then
        raise exception 'INCOMPLETE_TEAM_RESULTS';
      end if;

      insert into public.team_final_scores (
        session_id,
        team_id,
        model_version,
        full_game_result,
        final_game_value,
        enterprise_value,
        implied_equity_value,
        risk_penalty,
        pv_explicit_ufcf,
        pv_terminal_value,
        cumulative_ufcf,
        final_revenue,
        final_ebitda_margin,
        final_premium_share,
        final_net_debt,
        competitive_position,
        strategic_health,
        calculated_at
      )
      values (
        v_session_id,
        v_team_id,
        v_model_version,
        v_item -> 'full_game_result',
        (v_item ->> 'final_game_value')::numeric,
        (v_item ->> 'enterprise_value')::numeric,
        (v_item ->> 'implied_equity_value')::numeric,
        (v_item ->> 'risk_penalty')::numeric,
        (v_item ->> 'pv_explicit_ufcf')::numeric,
        (v_item ->> 'pv_terminal_value')::numeric,
        (v_item ->> 'cumulative_ufcf')::numeric,
        (v_item ->> 'final_revenue')::numeric,
        (v_item ->> 'final_ebitda_margin')::numeric,
        (v_item ->> 'final_premium_share')::numeric,
        (v_item ->> 'final_net_debt')::numeric,
        (v_item ->> 'competitive_position')::numeric,
        (v_item ->> 'strategic_health')::numeric,
        now()
      )
      on conflict (session_id, team_id) do nothing;
    end loop;
  elsif p_final_scores is not null then
    raise exception 'FINAL_SCORES_ONLY_ON_ROUND_3';
  end if;

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
      'model_version', v_model_version
    )
  );

  if v_round_number = 3 then
    update public.teams
    set status = 'completed'
    where session_id = v_session_id
      and status = 'active';

    update public.game_sessions
    set status = 'completed',
        completed_at = now()
    where id = v_session_id;

    insert into public.session_events (
      session_id,
      actor_user_id,
      event_type,
      payload
    )
    values (
      v_session_id,
      auth.uid(),
      'simulation_completed',
      jsonb_build_object(
        'team_count', v_team_count,
        'model_version', v_model_version
      )
    );
  end if;

  return 'closed';
end;
$$;

revoke all on function public.student_final_benchmark(uuid)
  from public, anon;
revoke all on function public.submit_ai_evidence(text, boolean, text)
  from public, anon;
revoke all on function public.teacher_set_ai_submission_form_url(uuid, text)
  from public, anon;
revoke all on function public.teacher_verify_ai_evidence(uuid)
  from public, anon;
revoke all on function public.teacher_finalize_round(uuid, jsonb, jsonb)
  from public, anon;

grant execute on function public.student_final_benchmark(uuid)
  to authenticated;
grant execute on function public.submit_ai_evidence(text, boolean, text)
  to authenticated;
grant execute on function public.teacher_set_ai_submission_form_url(uuid, text)
  to authenticated;
grant execute on function public.teacher_verify_ai_evidence(uuid)
  to authenticated;
grant execute on function public.teacher_finalize_round(uuid, jsonb, jsonb)
  to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.team_final_scores;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.team_ai_submissions;
exception
  when duplicate_object then null;
end $$;
