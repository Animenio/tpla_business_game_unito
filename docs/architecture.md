# CFO AI Business Game — Technical Architecture

## 1. Scope

Web application for the University of Turin CFO AI Business Game, implementing the Figma flow and the Aurora Tyres simulation.

Target stack:

- Next.js + TypeScript
- Supabase/PostgreSQL
- Supabase Realtime
- Vercel
- Google Drive for student source materials
- Google Forms/Drive for final AI-chat submission
- deterministic server-side economic simulation engine

The economic World Model v0.4 is the source of truth for simulation formulas and must be translated without reinterpretation.

## 2. Application boundaries

### Student application

Core flow derived from Figma:

1. Registration / login
2. Team setup
3. Lobby
4. Case-study pack
5. Round opening
6. Decisions
7. Review & submit
8. Waiting state
9. Annual results
10. Final result
11. AI chat upload

### Teacher application

1. Session control
2. Live round control
3. Team monitoring
4. Final leaderboard
5. Team debrief

## 3. Architecture

### Frontend

Next.js App Router.

Suggested route groups:

```
app/
  (auth)/
    login/
    register/
  (student)/
    team/
    lobby/
    case-study/
    rounds/[roundId]/
      briefing/
      decisions/
      review/
      submitted/
      results/
    final/
    ai-chat/
  (teacher)/
    teacher/
      sessions/
      sessions/[sessionId]/
      teams/[teamId]/
```

### Server layer

All authoritative simulation operations run server-side.

Use:

- Server Actions for authenticated mutations
- Route Handlers for integrations and machine-oriented endpoints
- Supabase service-role access only in server-only modules
- Zod validation at API boundaries

Never execute the World Model in the browser.

### Domain layer

```
src/
  domain/
    simulation/
    sessions/
    teams/
    decisions/
    scoring/
  lib/
    supabase/
    auth/
    validation/
    integrations/
```

The simulation domain must remain framework-independent so it can be unit-tested without Next.js or Supabase.

## 4. Simulation lifecycle

```
Session created
  -> registration open
  -> teams formed
  -> teacher locks teams
  -> case-study phase
  -> Round 1 opened
  -> decisions submitted
  -> server validates decisions
  -> engine calculates yearly state
  -> results persisted
  -> next round
  -> Round 3 completed
  -> final scoring
  -> leaderboard
  -> debrief
```

A decision submission is immutable after the teacher closes the round, except through an explicit teacher override recorded in the audit log.

## 5. Realtime

Supabase Realtime should be used only for state propagation, not business logic.

Recommended realtime events:

- session status changed
- team membership changed
- round opened/closed
- team submitted
- results released
- leaderboard released

Economic calculations remain synchronous server-side transactions.

## 6. Data integrity principles

- one authoritative result per team/year
- deterministic engine execution
- version every simulation model
- persist model version with every result
- persist raw decisions separately from calculated outputs
- no client-authoritative financial values
- audit teacher overrides
- idempotent round calculation

## 7. Security model

Supabase Auth for authentication.

RLS principles:

- students can read their own profile
- students can read members of their own team
- students can modify decisions only for their own team while a round is open
- students cannot read other teams' decisions
- leaderboard data is exposed only when the teacher releases it
- teacher role can manage assigned sessions
- service role is used only server-side

## 8. External integrations

### Google Drive

Store only document metadata and URLs in PostgreSQL.

The application should not duplicate source materials unless required.

### Final AI chat submission

Preferred implementation:

- student/team declares AI provider
- upload/link through Google Form/Drive
- application stores submission status + external reference
- teacher sees completion state and later the linked document

## 9. Observability

Log:

- engine execution
- validation failures
- round transitions
- submissions
- teacher overrides
- integration failures

Do not log sensitive free-text content unless necessary.

## 10. Deployment

Vercel environments:

- Production
- Preview
- Development

Supabase environments should be separated for production and development before classroom use.
