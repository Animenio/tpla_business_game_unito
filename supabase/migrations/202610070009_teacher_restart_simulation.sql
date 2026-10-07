create or replace function public.teacher_restart_simulation(
  p_session_id uuid
)
returns public.session_status
language plpgsql
security definer
set search_path = public
as $$
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
      registration_locked_at = now()
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
$$;

revoke all on function public.teacher_restart_simulation(uuid)
  from public, anon;
grant execute on function public.teacher_restart_simulation(uuid)
  to authenticated;
