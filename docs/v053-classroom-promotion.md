# Aurora Tyres v0.5.3 — Classroom promotion

Date: 2026-10-07  
Stable identifier: `aurora-tyres-v0.5.3`

## Promotion rule

The stable classroom model is the validated v0.5.3 RC1 with **no economic changes**. Promotion changes only the persisted model identifier, application routing, version-aware UI/defaults and local seed configuration.

The frozen engines remain available:

- `aurora-tyres-v0.4` — legacy;
- `aurora-tyres-v0.5.2` — previous calibrated release;
- `aurora-tyres-v0.5.3` — current classroom release.

Routing always follows `game_sessions.model_version`. Unknown versions fail closed.

## Application changes

The promotion enables v0.5.3 in:

- server-side round and full-game simulation routing;
- six-decision student flow;
- decision validation;
- round briefing, review, submitted and results views;
- teacher submission monitor;
- final report and value bridge;
- admin session model selector;
- new-session app default;
- local development seed.

The v0.5.2 decision storage adapter is intentionally reused because v0.5.3 preserves exactly the same six-decision storage architecture and the existing PostgreSQL constraints cover the complete v0.5.3 decision space.

## Regression protection

The session-engine integration suite now verifies all three supported versions.

Stable v0.5.3 default FGV:

`13281.852539946707`

Frozen v0.5.2 default FGV:

`13103.4989267348`

Frozen v0.4 balanced FGV:

`8541.720849945874`

The former RC identifier `aurora-tyres-v0.5.3-rc.1` remains unsupported and fails closed so no session can accidentally persist a prerelease version.

## Database rollout sequence

The production database default is **not changed in the application promotion PR**.

Safe order:

1. merge the application promotion;
2. wait for the production Vercel deployment to reach `READY`;
3. verify stable v0.5.3 routing in production code;
4. apply a separate Supabase migration changing only the new-session default/fallback to `aurora-tyres-v0.5.3`;
5. run a transactional end-to-end session workflow with rollback;
6. verify existing v0.4/v0.5.2 sessions retain their persisted versions.

This ordering prevents the database from creating a v0.5.3 session before production application code can execute that model.
