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
  v_model_version text;
  v_team_count integer;
  v_submitted_count integer;
  v_result_count integer;
  v_distinct_team_count integer;
  v_item jsonb;
  v_team_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select gr.session_id,
         gr.round_number,
         gr.status,
         gr.closes_at,
         gs.model_version
    into v_session_id,
         v_round_number,
         v_status,
         v_closes_at,
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
      'missing_count', v_team_count - v_submitted_count,
      'model_version', v_model_version
    )
  );

  return 'closed';
end;
$$;

revoke all on function public.teacher_finalize_round(uuid, jsonb)
  from public, anon;
grant execute on function public.teacher_finalize_round(uuid, jsonb)
  to authenticated;
