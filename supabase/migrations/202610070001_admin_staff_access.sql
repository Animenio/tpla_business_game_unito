create table if not exists public.staff_authorizations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  email text not null,
  role public.app_role not null,
  authorized_by uuid not null references public.profiles(id) on delete restrict,
  authorized_at timestamptz not null default now(),
  claimed_by uuid references public.profiles(id) on delete set null,
  claimed_at timestamptz,
  revoked_by uuid references public.profiles(id) on delete set null,
  revoked_at timestamptz,
  constraint staff_authorizations_staff_role
    check (role in ('teacher', 'admin')),
  constraint staff_authorizations_email_normalized
    check (email = lower(trim(email)))
);

create unique index if not exists uq_staff_authorizations_active_email
  on public.staff_authorizations(session_id, lower(email))
  where revoked_at is null;

create index if not exists idx_staff_authorizations_session
  on public.staff_authorizations(session_id, revoked_at, authorized_at desc);

create index if not exists idx_staff_authorizations_claimed_by
  on public.staff_authorizations(claimed_by)
  where claimed_by is not null;

create index if not exists idx_staff_authorizations_authorized_by
  on public.staff_authorizations(authorized_by);

create index if not exists idx_staff_authorizations_revoked_by
  on public.staff_authorizations(revoked_by)
  where revoked_by is not null;

create or replace function private.is_session_admin(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.session_members sm
    where sm.session_id = p_session_id
      and sm.user_id = auth.uid()
      and sm.role = 'admin'
  );
$$;

revoke all on function private.is_session_admin(uuid) from public, anon;
grant execute on function private.is_session_admin(uuid) to authenticated;

create or replace function private.is_unito_email(p_email text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select lower(trim(p_email)) ~ '^[^@[:space:]]+@(edu\.)?unito\.it$';
$$;

revoke all on function private.is_unito_email(text) from public, anon, authenticated;

alter table public.staff_authorizations enable row level security;

drop policy if exists staff_authorizations_select_admin
  on public.staff_authorizations;
create policy staff_authorizations_select_admin
on public.staff_authorizations
for select
to authenticated
using (private.is_session_admin(session_id));

revoke insert, update, delete on public.staff_authorizations
  from anon, authenticated;
grant select on public.staff_authorizations to authenticated;

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

create or replace function public.admin_authorize_staff(
  p_session_id uuid,
  p_email text,
  p_role public.app_role
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_authorization_id uuid;
  v_target_user_id uuid;
  v_target_in_team boolean;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not private.is_session_admin(p_session_id) then
    raise exception 'ADMIN_REQUIRED';
  end if;

  if p_role not in ('teacher'::public.app_role, 'admin'::public.app_role) then
    raise exception 'INVALID_STAFF_ROLE';
  end if;

  v_email := lower(trim(p_email));

  if not private.is_unito_email(v_email) then
    raise exception 'INVALID_UNITO_EMAIL';
  end if;

  select p.id
    into v_target_user_id
  from public.profiles p
  where lower(p.email) = v_email
  limit 1;

  if v_target_user_id is not null then
    select exists (
      select 1
      from public.team_members tm
      join public.teams t on t.id = tm.team_id
      where tm.user_id = v_target_user_id
        and t.session_id = p_session_id
    )
    into v_target_in_team;

    if v_target_in_team then
      raise exception 'TARGET_IN_STUDENT_TEAM';
    end if;
  end if;

  select sa.id
    into v_authorization_id
  from public.staff_authorizations sa
  where sa.session_id = p_session_id
    and sa.email = v_email
  order by sa.authorized_at desc
  limit 1;

  if v_authorization_id is null then
    insert into public.staff_authorizations (
      session_id,
      email,
      role,
      authorized_by
    )
    values (
      p_session_id,
      v_email,
      p_role,
      auth.uid()
    )
    returning id into v_authorization_id;
  else
    update public.staff_authorizations
    set role = p_role,
        authorized_by = auth.uid(),
        authorized_at = now(),
        revoked_by = null,
        revoked_at = null
    where id = v_authorization_id;
  end if;

  if v_target_user_id is not null then
    insert into public.session_members (session_id, user_id, role)
    values (p_session_id, v_target_user_id, p_role)
    on conflict (session_id, user_id) do update
      set role = excluded.role;

    update public.profiles
    set role = case
      when role = 'admin' then 'admin'::public.app_role
      when p_role = 'admin' then 'admin'::public.app_role
      else 'teacher'::public.app_role
    end
    where id = v_target_user_id;

    update public.staff_authorizations
    set claimed_by = v_target_user_id,
        claimed_at = coalesce(claimed_at, now())
    where id = v_authorization_id;
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
    'staff_authorized',
    jsonb_build_object(
      'authorization_id', v_authorization_id,
      'email', v_email,
      'role', p_role,
      'claimed', v_target_user_id is not null
    )
  );

  return v_authorization_id;
end;
$$;

revoke all on function public.admin_authorize_staff(
  uuid,
  text,
  public.app_role
) from public, anon;
grant execute on function public.admin_authorize_staff(
  uuid,
  text,
  public.app_role
) to authenticated;

create or replace function public.admin_revoke_staff(
  p_authorization_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_target_user_id uuid;
  v_email text;
  v_target_role public.app_role;
  v_new_profile_role public.app_role;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select
    sa.session_id,
    sa.claimed_by,
    sa.email,
    sa.role
  into
    v_session_id,
    v_target_user_id,
    v_email,
    v_target_role
  from public.staff_authorizations sa
  where sa.id = p_authorization_id
    and sa.revoked_at is null
  limit 1;

  if v_session_id is null then
    raise exception 'AUTHORIZATION_NOT_FOUND';
  end if;

  if not private.is_session_admin(v_session_id) then
    raise exception 'ADMIN_REQUIRED';
  end if;

  if v_target_user_id = auth.uid() then
    raise exception 'CANNOT_REVOKE_SELF';
  end if;

  update public.staff_authorizations
  set revoked_by = auth.uid(),
      revoked_at = now()
  where id = p_authorization_id;

  if v_target_user_id is not null then
    delete from public.session_members
    where session_id = v_session_id
      and user_id = v_target_user_id
      and role in ('teacher', 'admin');

    select case
      when exists (
        select 1 from public.session_members sm
        where sm.user_id = v_target_user_id
          and sm.role = 'admin'
      ) then 'admin'::public.app_role
      when exists (
        select 1 from public.session_members sm
        where sm.user_id = v_target_user_id
          and sm.role = 'teacher'
      ) then 'teacher'::public.app_role
      else 'student'::public.app_role
    end
    into v_new_profile_role;

    update public.profiles
    set role = v_new_profile_role
    where id = v_target_user_id;
  end if;

  insert into public.session_events (
    session_id,
    actor_user_id,
    event_type,
    payload
  )
  values (
    v_session_id,
    auth.uid(),
    'staff_authorization_revoked',
    jsonb_build_object(
      'authorization_id', p_authorization_id,
      'email', v_email,
      'role', v_target_role
    )
  );
end;
$$;

revoke all on function public.admin_revoke_staff(uuid)
  from public, anon;
grant execute on function public.admin_revoke_staff(uuid)
  to authenticated;
