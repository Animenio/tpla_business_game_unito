-- Make Aurora Tyres v0.5.2 the default for newly created sessions.
-- Existing sessions keep their persisted model_version and remain fully compatible with v0.4.

alter table public.game_sessions
  alter column model_version set default 'aurora-tyres-v0.5.2';

create or replace function public.admin_create_session(
  p_code text,
  p_title text,
  p_academic_year text,
  p_model_version text,
  p_is_test boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_title text;
  v_academic_year text;
  v_model_version text;
  v_session_id uuid;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not private.can_create_sessions() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  v_code := upper(trim(p_code));
  v_title := trim(p_title);
  v_academic_year := nullif(trim(p_academic_year), '');
  v_model_version := coalesce(
    nullif(trim(p_model_version), ''),
    'aurora-tyres-v0.5.2'
  );

  if not private.validate_session_code_format(v_code) then
    raise exception 'INVALID_SESSION_CODE';
  end if;

  if char_length(v_title) < 3 or char_length(v_title) > 120 then
    raise exception 'INVALID_SESSION_TITLE';
  end if;

  if exists (
    select 1
    from public.game_sessions gs
    where gs.code = v_code
  ) then
    raise exception 'SESSION_CODE_EXISTS';
  end if;

  select lower(p.email)
    into v_email
  from public.profiles p
  where p.id = auth.uid();

  insert into public.game_sessions (
    code,
    title,
    academic_year,
    status,
    model_version,
    created_by,
    is_test
  )
  values (
    v_code,
    v_title,
    v_academic_year,
    'registration_open',
    v_model_version,
    auth.uid(),
    coalesce(p_is_test, false)
  )
  returning id into v_session_id;

  insert into public.session_members (session_id, user_id, role)
  values (v_session_id, auth.uid(), 'admin');

  insert into public.staff_authorizations (
    session_id,
    email,
    role,
    authorized_by,
    claimed_by,
    claimed_at
  )
  values (
    v_session_id,
    v_email,
    'admin',
    auth.uid(),
    auth.uid(),
    now()
  );

  insert into public.session_events (
    session_id,
    actor_user_id,
    event_type,
    payload
  )
  values (
    v_session_id,
    auth.uid(),
    'session_created',
    jsonb_build_object(
      'code', v_code,
      'model_version', v_model_version,
      'is_test', coalesce(p_is_test, false)
    )
  );

  return v_session_id;
end;
$$;
