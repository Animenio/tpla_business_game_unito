alter table public.game_sessions
  add column if not exists results_released_at timestamptz,
  add column if not exists results_released_by uuid references public.profiles(id) on delete set null;

update public.game_sessions
set results_released_at = coalesce(completed_at, now())
where status = 'completed'
  and results_released_at is null;

create or replace function public.teacher_release_final_results(
  p_session_id uuid
)
returns timestamptz
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_status public.session_status;
  v_team_count integer;
  v_score_count integer;
  v_submission_count integer;
  v_released_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select gs.status, gs.results_released_at
    into v_status, v_released_at
  from public.game_sessions gs
  where gs.id = p_session_id
  for update;

  if v_status is null then
    raise exception 'SESSION_NOT_FOUND';
  end if;

  if not private.is_session_staff(p_session_id) then
    raise exception 'FORBIDDEN';
  end if;

  if v_status <> 'completed' then
    raise exception 'SIMULATION_NOT_COMPLETED';
  end if;

  if v_released_at is not null then
    return v_released_at;
  end if;

  select count(*)::integer
    into v_team_count
  from public.teams t
  where t.session_id = p_session_id
    and t.status = 'completed';

  select count(*)::integer
    into v_score_count
  from public.team_final_scores fs
  where fs.session_id = p_session_id;

  if v_team_count = 0 or v_score_count <> v_team_count then
    raise exception 'FINAL_SCORES_INCOMPLETE';
  end if;

  select count(distinct ai.team_id)::integer
    into v_submission_count
  from public.team_ai_submissions ai
  join public.teams t on t.id = ai.team_id
  where ai.session_id = p_session_id
    and t.session_id = p_session_id
    and t.status = 'completed';

  if v_submission_count <> v_team_count then
    raise exception 'AI_SUBMISSIONS_INCOMPLETE';
  end if;

  update public.game_sessions
  set results_released_at = now(),
      results_released_by = auth.uid()
  where id = p_session_id
  returning results_released_at into v_released_at;

  insert into public.session_events (
    session_id,
    actor_user_id,
    event_type,
    payload
  )
  values (
    p_session_id,
    auth.uid(),
    'final_results_released',
    jsonb_build_object(
      'team_count', v_team_count,
      'ai_submission_count', v_submission_count,
      'released_at', v_released_at
    )
  );

  return v_released_at;
end;
$function$;

revoke all on function public.teacher_release_final_results(uuid)
  from public, anon;
grant execute on function public.teacher_release_final_results(uuid)
  to authenticated;

create or replace function public.student_final_benchmark(
  p_session_id uuid
)
returns table(
  own_rank integer,
  total_teams integer,
  median_final_game_value numeric
)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_team_id uuid;
  v_session_status public.session_status;
  v_results_released_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select gs.status, gs.results_released_at
    into v_session_status, v_results_released_at
  from public.game_sessions gs
  where gs.id = p_session_id
  limit 1;

  if v_session_status <> 'completed' then
    raise exception 'SIMULATION_NOT_COMPLETED';
  end if;

  if v_results_released_at is null then
    raise exception 'FINAL_RESULTS_NOT_RELEASED';
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
$function$;

create or replace function public.teacher_restart_simulation(
  p_session_id uuid
)
returns session_status
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_current_status public.session_status;
  v_deleted_decisions integer := 0;
  v_deleted_results integer := 0;
  v_deleted_final_scores integer := 0;
  v_deleted_ai_submissions integer := 0;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select gs.status
    into v_current_status
  from public.game_sessions gs
  where gs.id = p_session_id
  for update;

  if v_current_status is null then
    raise exception 'SESSION_NOT_FOUND';
  end if;

  if not private.is_session_staff(p_session_id) then
    raise exception 'FORBIDDEN';
  end if;

  if v_current_status not in ('live', 'completed') then
    raise exception 'SESSION_NOT_RESTARTABLE';
  end if;

  delete from public.team_ai_submissions
  where session_id = p_session_id;
  get diagnostics v_deleted_ai_submissions = row_count;

  delete from public.team_final_scores
  where session_id = p_session_id;
  get diagnostics v_deleted_final_scores = row_count;

  delete from public.team_round_results trr
  using public.game_rounds gr
  where trr.round_id = gr.id
    and gr.session_id = p_session_id;
  get diagnostics v_deleted_results = row_count;

  delete from public.team_round_decisions trd
  using public.game_rounds gr
  where trd.round_id = gr.id
    and gr.session_id = p_session_id;
  get diagnostics v_deleted_decisions = row_count;

  update public.game_rounds
  set status = 'scheduled',
      opens_at = null,
      closes_at = null,
      closed_at = null
  where session_id = p_session_id;

  update public.teams
  set status = 'confirmed'
  where session_id = p_session_id;

  update public.game_sessions
  set status = 'locked',
      registration_locked_at = now(),
      started_at = null,
      completed_at = null,
      results_released_at = null,
      results_released_by = null
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
    'simulation_restarted',
    jsonb_build_object(
      'from_status', v_current_status,
      'to_status', 'locked',
      'deleted_decisions', v_deleted_decisions,
      'deleted_results', v_deleted_results,
      'deleted_final_scores', v_deleted_final_scores,
      'deleted_ai_submissions', v_deleted_ai_submissions
    )
  );

  return 'locked';
end;
$function$;
