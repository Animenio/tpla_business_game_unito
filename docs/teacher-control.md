# Teacher control panel

## Scope

The teacher control vertical manages the pre-game lifecycle:

```
registration_open
→ locked
→ live
```

It does not yet implement rounds, decisions, results or the Data Room.

## Access model

A teacher must:

1. exist in Supabase Auth;
2. have a row in `profiles`;
3. have a `session_members` row for the target session with role `teacher` or `admin`.

Teacher accounts are not self-promotable from the web application.

For a controlled classroom bootstrap, an administrator can promote an already registered UniTo account from the Supabase SQL editor:

```sql
with target_user as (
  select id
  from public.profiles
  where lower(email) = lower('DOCENTE@unito.it')
),
target_session as (
  select id
  from public.game_sessions
  where code = 'ACCOUNTING26'
)
update public.profiles
set role = 'teacher'
where id = (select id from target_user);

insert into public.session_members (session_id, user_id, role)
select target_session.id, target_user.id, 'teacher'
from target_session, target_user
on conflict (session_id, user_id)
do update set role = excluded.role;
```

Replace the placeholder email before execution.

## Teacher dashboard

Route:

```
/teacher
```

The dashboard exposes:

- registered-student count;
- team count;
- confirmed-team count;
- students without a team;
- team membership and join codes;
- team confirmation / reopening;
- registration lock / reopen;
- simulation start.

Updates propagate through Supabase Realtime.

## Start guard

The transition from `locked` to `live` is server-authoritative.

It is rejected unless:

- at least one team exists;
- every team is confirmed;
- every student belongs to a team.

When the session becomes `live`, confirmed teams become `active`.

## Audit trail

Teacher state changes are written to:

```
public.session_events
```

Events currently include:

- `team_status_changed`;
- `session_status_changed`.

The record stores actor, session, optional team, payload and timestamp.

## Security boundaries

- staff membership is verified inside SECURITY DEFINER RPCs;
- students cannot call teacher mutations successfully;
- staff accounts cannot use student team creation/join flows;
- staff can read profiles only for users sharing a managed session;
- teacher mutations are not granted to anonymous users.
