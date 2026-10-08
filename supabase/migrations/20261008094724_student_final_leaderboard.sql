create or replace function public.student_final_leaderboard(
  p_session_id uuid
)
returns table (
  rank_position integer,
  team_id uuid,
  team_name text,
  final_game_value numeric,
  cumulative_ufcf numeric,
  strategic_health numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_session_status public.session_status;
  v_results_released_at timestamptz;
  v_member_team_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select gs.status, gs.results_released_at
    into v_session_status, v_results_released_at
  from public.game_sessions gs
  where gs.id = p_session_id
  limit 1;

  if v_session_status is null then
    raise exception 'SESSION_NOT_FOUND';
  end if;

  if v_session_status <> 'completed' then
    raise exception 'SIMULATION_NOT_COMPLETED';
  end if;

  if v_results_released_at is null then
    raise exception 'FINAL_RESULTS_NOT_RELEASED';
  end if;

  select t.id
    into v_member_team_id
  from public.team_members tm
  join public.teams t on t.id = tm.team_id
  where tm.user_id = auth.uid()
    and t.session_id = p_session_id
  limit 1;

  if v_member_team_id is null then
    raise exception 'TEAM_NOT_FOUND';
  end if;

  return query
  select
    row_number() over (
      order by fs.final_game_value desc, fs.team_id
    )::integer as rank_position,
    t.id as team_id,
    t.name as team_name,
    fs.final_game_value,
    fs.cumulative_ufcf,
    fs.strategic_health
  from public.team_final_scores fs
  join public.teams t on t.id = fs.team_id
  where fs.session_id = p_session_id
    and t.session_id = p_session_id
    and t.status = 'completed'
  order by fs.final_game_value desc, fs.team_id;
end;
$$;

revoke all on function public.student_final_leaderboard(uuid)
  from public, anon;
grant execute on function public.student_final_leaderboard(uuid)
  to authenticated;
