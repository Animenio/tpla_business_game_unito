create or replace function private.can_create_sessions()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.session_members sm
    where sm.user_id = auth.uid()
      and sm.role = 'admin'
  );
$$;

revoke all on function private.can_create_sessions() from public, anon;
grant execute on function private.can_create_sessions() to authenticated;

create or replace function private.validate_session_code_format(p_code text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select upper(trim(p_code)) ~ '^[A-Z0-9][A-Z0-9_-]{3,31}$';
$$;

revoke all on function private.validate_session_code_format(text)
  from public, anon, authenticated;

create or replace function public.admin_create_session(
  p_code text,
  p_title text,
  p_academic_year text,
  p_model_version text
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
  v_model_version := coalesce(nullif(trim(p_model_version), ''), 'aurora-tyres-v0.4');

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
    created_by
  )
  values (
    v_code,
    v_title,
    v_academic_year,
    'registration_open',
    v_model_version,
    auth.uid()
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
      'model_version', v_model_version
    )
  );

  return v_session_id;
end;
$$;

revoke all on function public.admin_create_session(text, text, text, text)
  from public, anon;
grant execute on function public.admin_create_session(text, text, text, text)
  to authenticated;

create or replace function public.admin_duplicate_session(
  p_source_session_id uuid,
  p_code text,
  p_title text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source public.game_sessions%rowtype;
  v_new_session_id uuid;
  v_code text;
  v_title text;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not private.is_session_admin(p_source_session_id) then
    raise exception 'ADMIN_REQUIRED';
  end if;

  select *
    into v_source
  from public.game_sessions
  where id = p_source_session_id;

  if v_source.id is null then
    raise exception 'SESSION_NOT_FOUND';
  end if;

  v_code := upper(trim(p_code));
  v_title := coalesce(nullif(trim(p_title), ''), v_source.title);

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
    created_by
  )
  values (
    v_code,
    v_title,
    v_source.academic_year,
    'registration_open',
    v_source.model_version,
    auth.uid()
  )
  returning id into v_new_session_id;

  insert into public.session_members (session_id, user_id, role)
  values (v_new_session_id, auth.uid(), 'admin');

  insert into public.staff_authorizations (
    session_id,
    email,
    role,
    authorized_by,
    claimed_by,
    claimed_at
  )
  values (
    v_new_session_id,
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
    v_new_session_id,
    auth.uid(),
    'session_duplicated',
    jsonb_build_object(
      'source_session_id', p_source_session_id,
      'source_code', v_source.code,
      'new_code', v_code
    )
  );

  return v_new_session_id;
end;
$$;

revoke all on function public.admin_duplicate_session(uuid, text, text)
  from public, anon;
grant execute on function public.admin_duplicate_session(uuid, text, text)
  to authenticated;

create or replace function public.admin_archive_session(
  p_session_id uuid
)
returns public.session_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_status public.session_status;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not private.is_session_admin(p_session_id) then
    raise exception 'ADMIN_REQUIRED';
  end if;

  select status
    into v_current_status
  from public.game_sessions
  where id = p_session_id
  for update;

  if v_current_status is null then
    raise exception 'SESSION_NOT_FOUND';
  end if;

  if v_current_status = 'archived' then
    return v_current_status;
  end if;

  update public.game_sessions
  set status = 'archived'
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
    'session_archived',
    jsonb_build_object('from', v_current_status)
  );

  return 'archived';
end;
$$;

revoke all on function public.admin_archive_session(uuid)
  from public, anon;
grant execute on function public.admin_archive_session(uuid)
  to authenticated;

create or replace function public.validate_registration_access(
  p_email text,
  p_code text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.game_sessions gs
    where gs.code = upper(trim(p_code))
      and gs.status <> 'archived'
      and (
        gs.status = 'registration_open'
        or exists (
          select 1
          from public.staff_authorizations sa
          where sa.session_id = gs.id
            and sa.email = lower(trim(p_email))
            and sa.revoked_at is null
            and sa.role in ('teacher', 'admin')
        )
      )
  );
$$;

revoke all on function public.validate_registration_access(text, text)
  from public;
grant execute on function public.validate_registration_access(text, text)
  to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_session_code text;
  v_session_status public.session_status;
  v_role public.app_role := 'student';
  v_authorization_id uuid;
begin
  v_session_code := upper(trim(coalesce(
    new.raw_user_meta_data ->> 'session_code',
    ''
  )));

  if v_session_code <> '' then
    select gs.id, gs.status
      into v_session_id, v_session_status
    from public.game_sessions gs
    where gs.code = v_session_code
      and gs.status <> 'archived'
    limit 1;

    if v_session_id is not null then
      select sa.id, sa.role
        into v_authorization_id, v_role
      from public.staff_authorizations sa
      where sa.session_id = v_session_id
        and sa.email = lower(trim(coalesce(new.email, '')))
        and sa.revoked_at is null
        and sa.role in ('teacher', 'admin')
      order by sa.authorized_at desc
      limit 1;

      if v_authorization_id is null then
        v_role := 'student';
      end if;
    end if;
  end if;

  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    lower(coalesce(new.email, '')),
    v_role
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email,
        role = case
          when public.profiles.role = 'admin' then 'admin'::public.app_role
          when excluded.role = 'admin' then 'admin'::public.app_role
          when public.profiles.role = 'teacher' then 'teacher'::public.app_role
          else excluded.role
        end;

  if v_session_id is not null
     and v_session_status <> 'archived'
     and (
       v_role in ('teacher', 'admin')
       or v_session_status = 'registration_open'
     ) then

    insert into public.session_members (session_id, user_id, role)
    values (v_session_id, new.id, v_role)
    on conflict (session_id, user_id) do update
      set role = excluded.role;

    if v_authorization_id is not null then
      update public.staff_authorizations
      set claimed_by = new.id,
          claimed_at = coalesce(claimed_at, now())
      where id = v_authorization_id;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.handle_new_user()
  from public, anon, authenticated;
