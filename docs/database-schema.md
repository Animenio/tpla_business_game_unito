# Database Schema — v0.1

This is the initial relational model. It intentionally excludes Aurora Tyres formula-specific fields until World Model v0.4 is imported and mapped.

## Core tables

### profiles

- id uuid PK -> auth.users.id
- full_name text
- email text
- role enum(student, teacher, admin)
- created_at timestamptz

### game_sessions

- id uuid PK
- code text UNIQUE
- title text
- academic_year text
- status enum(draft, registration_open, locked, live, completed, archived)
- model_version text
- created_by uuid -> profiles.id
- created_at timestamptz
- updated_at timestamptz

### session_members

- session_id uuid
- user_id uuid
- role enum(student, teacher)
- joined_at timestamptz
- PK(session_id, user_id)

### teams

- id uuid PK
- session_id uuid -> game_sessions.id
- name text
- join_code text UNIQUE
- status enum(forming, confirmed, active, completed)
- created_by uuid -> profiles.id
- created_at timestamptz

### team_members

- team_id uuid
- user_id uuid
- joined_at timestamptz
- PK(team_id, user_id)

Constraint: a student may belong to at most one team per session.

### rounds

- id uuid PK
- session_id uuid
- round_number smallint
- label text
- start_year smallint
- end_year smallint
- status enum(locked, open, closed, calculated, released)
- opened_at timestamptz
- closes_at timestamptz
- closed_at timestamptz

UNIQUE(session_id, round_number)

### decision_submissions

- id uuid PK
- team_id uuid
- round_id uuid
- version integer
- status enum(draft, submitted, locked)
- rationale text
- submitted_by uuid
- submitted_at timestamptz
- created_at timestamptz
- updated_at timestamptz

UNIQUE(team_id, round_id, version)

### decision_values

Generic schema until World Model v0.4 mapping is frozen.

- id uuid PK
- submission_id uuid
- decision_key text
- numeric_value numeric
- text_value text
- unit text

UNIQUE(submission_id, decision_key)

After model freeze, strongly typed columns or a typed JSON payload may replace this generic mapping depending on the final decision matrix.

### yearly_results

- id uuid PK
- team_id uuid
- round_id uuid
- year smallint
- model_version text
- input_hash text
- calculated_at timestamptz
- metrics jsonb
- state jsonb

UNIQUE(team_id, year, model_version)

### team_scores

- id uuid PK
- team_id uuid
- session_id uuid
- model_version text
- score_total numeric
- score_components jsonb
- rank integer
- calculated_at timestamptz

### source_materials

- id uuid PK
- session_id uuid
- title text
- type text
- external_url text
- sort_order integer
- active boolean

### ai_chat_submissions

- id uuid PK
- team_id uuid
- provider text
- external_url text
- submitted_by uuid
- submitted_at timestamptz
- status enum(missing, submitted, verified)

### audit_events

- id bigint generated always as identity PK
- session_id uuid
- actor_id uuid
- event_type text
- entity_type text
- entity_id uuid
- payload jsonb
- created_at timestamptz

## Recommended database functions

- join_team(join_code)
- submit_round(team_id, round_id)
- open_round(session_id, round_number)
- close_round(session_id, round_number)
- release_results(session_id, round_number)

Each function must enforce authorization and session state atomically.

## RLS outline

Students:
- read active session they belong to
- read their own team and teammates
- CRUD own team's draft decisions while round=open
- read own team results after released
- read leaderboard only after final release

Teachers:
- manage sessions they own/are assigned to
- read all teams and submissions in those sessions
- execute round state transitions

No student policy should expose another team's decision payload before the simulation is complete.
