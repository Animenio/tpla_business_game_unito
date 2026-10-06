# Implementation Plan

## Milestone 0 — Specification freeze

- inspect repository
- inspect Figma
- import Aurora Tyres World Model v0.4
- map Excel formulas to engine specification
- freeze decision dictionary
- freeze state vector
- freeze scoring

Exit criterion: every formula needed by the game is traceable to the source model.

## Milestone 1 — Project foundation

- initialize Next.js + TypeScript
- configure linting/formatting
- configure environment validation
- add Supabase clients
- define route groups
- implement shared design tokens
- establish CI

## Milestone 2 — Database + authentication

- create Supabase migrations
- profiles / roles
- sessions / teams / membership
- RLS policies
- registration and login

## Milestone 3 — Lobby and teacher orchestration

- create/join team
- lobby realtime
- teacher session dashboard
- lock teams
- session state machine

## Milestone 4 — Case-study pack

- Drive-linked materials
- case-study UI
- timing/state transitions

## Milestone 5 — Economic engine

- explicit v0.4 TypeScript types
- formula modules
- constraints
- shock/scenario layer
- golden tests against World Model
- calculation service

This milestone must not be considered complete until numerical parity with v0.4 is demonstrated.

## Milestone 6 — Round workflow

- round briefing
- nine decision controls
- tooltips/help
- autosaved drafts
- rationale
- review
- submit/lock
- waiting state

## Milestone 7 — Results

- annual results
- KPI visualisation
- cumulative state
- round release controls

## Milestone 8 — Final scoring

- final score
- leaderboard
- student final result
- teacher debrief

## Milestone 9 — AI evidence submission

- provider declaration
- Drive/Form handoff
- submission status
- teacher verification

## Milestone 10 — Hardening

- RLS penetration checks
- concurrency tests
- idempotency tests
- classroom load test
- error monitoring
- accessibility
- responsive QA
- production deployment

## Recommended implementation order

```
foundation
→ database/auth
→ teams/lobby
→ teacher state machine
→ World Model engine
→ decisions
→ results
→ scoring
→ AI submission
→ hardening
```

The engine should be implemented before polishing downstream results screens, because its data contract determines much of the final UI.
