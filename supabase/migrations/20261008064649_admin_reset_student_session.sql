create or replace function public.admin_reset_student_session(
  p_session_id uuid,
  p_confirmation_code text
)
returns public.session_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_status public.session_status;
  v_session_code text;
  v_deleted_students integer := 0;
  v_deleted_teams integer := 0;
  v_deleted_decisions integer := 0;
  v_deleted_results integer := 0;
  v_deleted_final_scores integer := 0;
  v_deleted_ai_submissions integer := 0;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select gs.status, gs.code
    into v_current_status, v_session_code
  from public.game_sessions gs
  where gs.id = p_session_id
  for update;

  if v_current_status is null then
    raise exception 'SESSION_NOT_FOUND';
  end if;

  if not private.is_session_admin(p_session_id) then
    raise exception 'ADMIN_REQUIRED';
  end if;

  if v_current_status = 'archived' then
    raise exception 'SESSION_ARCHIVED';
  end if;

  if upper(trim(coalesce(p_confirmation_code, ''))) <> v_session_code then
    raise exception 'SESSION_CODE_CONFIRMATION_MISMATCH';
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

  select count(*)::integer
    into v_deleted_teams
  from public.teams t
  where t.session_id = p_session_id;

  delete from public.teams
  where session_id = p_session_id;

  delete from public.session_members
  where session_id = p_session_id
    and role = 'student';
  get diagnostics v_deleted_students = row_count;

  update public.game_rounds
  set status = 'scheduled',
      opens_at = null,
      closes_at = null,
      closed_at = null
  where session_id = p_session_id;

  update public.game_sessions
  set status = 'registration_open',
      registration_locked_at = null,
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
    'student_session_reset',
    jsonb_build_object(
      'from_status', v_current_status,
      'to_status', 'registration_open',
      'deleted_students', v_deleted_students,
      'deleted_teams', v_deleted_teams,
      'deleted_decisions', v_deleted_decisions,
      'deleted_results', v_deleted_results,
      'deleted_final_scores', v_deleted_final_scores,
      'deleted_ai_submissions', v_deleted_ai_submissions
    )
  );

  return 'registration_open';
end;
$$;

revoke all on function public.admin_reset_student_session(uuid, text)
  from public, anon;
grant execute on function public.admin_reset_student_session(uuid, text)
  to authenticated;
