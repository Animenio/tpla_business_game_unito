# Teacher control panel

## Scope

The teacher control vertical manages the complete classroom lifecycle:

```
registration_open
→ locked
→ live
→ completed
```

It covers team readiness, round opening/extension/closure, live submission monitoring, server-side calculation, final leaderboard, AI-evidence tracking and simulation restart.

## Access model

A teacher must:

1. exist in Supabase Auth;
2. have a row in `profiles`;
3. have a `session_members` row for the target session with role `teacher` or `admin`.

Teacher accounts are not self-promotable. Administrators manage staff access through the application admin flow; direct SQL is not part of the normal classroom operating procedure.

## Teacher dashboard

Route:

```
/teacher
```

The dashboard exposes:

- active World Model version;
- registered-student count;
- team count;
- confirmed-team count;
- students without a team;
- team membership and join codes;
- team confirmation / reopening;
- registration lock / reopen;
- simulation start;
- round controls once the simulation is live.

Updates propagate through Supabase Realtime.

## Start guard

The transition from `locked` to `live` is server-authoritative.

It is rejected unless:

- at least one team exists;
- every team is confirmed;
- every student belongs to a team.

When the session becomes `live`, confirmed teams become `active` and the three round records are available to the teacher.

## Live round console

Route:

```
/teacher/rounds/[round]
```

For an open round the console exposes:

- synchronized countdown;
- submitted / total teams;
- Premium-price class median;
- reduced-model class signals for resilience and R&D orientation;
- per-team submission state, timestamp and declared objective;
- +2 minute extension;
- close-and-calculate control.

The close control is enabled only when every active team has submitted. The database RPC independently enforces the same condition, so the UI is not the authority.

If the timer reaches zero while one or more teams are missing, the teacher must extend the decision window before those teams can submit. The application does not silently finalize an incomplete class.

## Round calculation

Closing a round triggers the server-side versioned engine selected by `game_sessions.model_version`.

The browser never calculates authoritative economic results.

For rounds 2 and 3 the opening state is reconstructed from the previous persisted result. Round 3 also calculates and persists the full-game score. Unknown World Model identifiers fail closed.

## Final leaderboard

After Round 3, the session becomes `completed` and the teacher is redirected to:

```
/teacher/leaderboard
```

The leaderboard exposes team ranking by Final Game Value, final operating metrics and AI-evidence status. The model version used for the run is shown explicitly.

## Restart

An authorized teacher/admin can restart a completed simulation while preserving the class, team composition and source materials. Decisions, round results, final scores and AI evidence are cleared by the restart RPC before a new run begins.

## Audit trail

Teacher state changes are written to:

```
public.session_events
```

Events include session-state transitions, round opening/closure, submissions and other controlled workflow actions. Records include actor, session, optional team, payload and timestamp.

## Security boundaries

- staff membership is verified inside SECURITY DEFINER RPCs;
- students cannot call teacher mutations successfully;
- staff accounts cannot use student team creation/join flows;
- staff can read profiles only for users sharing a managed session;
- teacher mutations are not granted to anonymous users;
- World Model selection is validated by the application and persisted per session;
- historical v0.5.2/v0.4 sessions continue to route to their frozen engines.
