create or replace function public.admin_reset_session_students(
  p_session_id uuid,
  p_confirmation_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_session public.game_sessions%rowtype;
  v_student_count integer := 0;
  v_team_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not private.is_session_admin(p_session_id) then
    raise exception 'ADMIN_REQUIRED';
  end if;

  select *
    into v_session
  from public.game_sessions
  where id = p_session_id
  for update;

  if v_session.id is null then
    raise exception 'SESSION_NOT_FOUND';
  end if;

  if v_session.status = 'archived' then
    raise exception 'SESSION_ARCHIVED';
  end if;

  if upper(trim(coalesce(p_confirmation_code, ''))) <> v_session.code then
    raise exception 'CONFIRMATION_CODE_MISMATCH';
  end if;

  select count(*)::integer
    into v_student_count
  from public.session_members
  where session_id = p_session_id
    and role = 'student';

  select count(*)::integer
    into v_team_count
  from public.teams
  where session_id = p_session_id;

  -- Deleting teams cascades to team_members, decisions, results,
  -- final scores and AI submissions for this session.
  delete from public.teams
  where session_id = p_session_id;

  delete from public.session_members
  where session_id = p_session_id
    and role = 'student';

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
    'admin_full_student_reset',
    jsonb_build_object(
      'previous_status', v_session.status,
      'removed_students', v_student_count,
      'removed_teams', v_team_count,
      'registration_reopened', true
    )
  );

  return jsonb_build_object(
    'status', 'registration_open',
    'removed_students', v_student_count,
    'removed_teams', v_team_count
  );
end;
$function$;

revoke all on function public.admin_reset_session_students(uuid, text)
  from public, anon;
grant execute on function public.admin_reset_session_students(uuid, text)
  to authenticated;
