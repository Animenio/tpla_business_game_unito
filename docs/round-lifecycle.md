# Round lifecycle

## State model

Session:

```
registration_open
→ locked
→ live
```

Round:

```
scheduled
→ open
→ closed
```

Team decision:

```
draft
→ submitted
```

A submitted decision is immutable.

## Student flow

```
/case-study
→ /rounds/[round]/briefing
→ /rounds/[round]/decisions
→ /rounds/[round]/review
→ /rounds/[round]/submitted
→ /rounds/[round]/results
```

The decision form is model-version aware. Aurora Tyres v0.5.3 and v0.5.2 expose six economic decisions: Premium price positioning, Standard price positioning, marketing, R&D with an orientation choice, CapEx, and a resilience policy. The v0.4 legacy flow retains its original nine controls. Percentages are displayed in human units and converted to decimal ratios at the server-action boundary.

Server-side validation and simulation are routed from the session's persisted `model_version`. The reduced-model storage adapter maps the categorical choices onto the existing decision columns so the database can support v0.5.3, v0.5.2 and historical v0.4 sessions without rewriting old records.

## Teacher flow

From `/teacher` the instructor can open the next eligible round. The live console is:

```
/teacher/rounds/[round]
```

It provides:

- synchronized countdown;
- submitted / total teams;
- model-aware class signals for selected decisions;
- submission status by team;
- +2 minute extension;
- close-and-calculate only when every active team has submitted.

## Calculation boundary

The browser never executes the economic model.

On close, the teacher Server Action:

1. loads submitted decision sets;
2. loads each team's previous closing state for rounds 2 and 3;
3. routes to the correct versioned engine and calls the corresponding round simulation server-side;
4. sends only the calculated payload to the authenticated finalization RPC;
5. the RPC validates staff authorization, round state, team uniqueness and model version;
6. results are persisted and the round is closed in the same database transaction.

For Round 1 the opening state comes from the versioned opening-state factory. For later rounds the opening state is the previous persisted `closingState`. Unknown model versions are rejected explicitly.

## Time semantics

A team can edit its draft only while:

- the team is active;
- the round is `open`;
- `now() <= closes_at`.

The teacher can close the round only when every active team has submitted. If the decision window expires while submissions are missing, the teacher must extend the round before those teams can submit; incomplete classes are not finalized silently.

## Realtime

Realtime is state propagation only. It refreshes clients when:

- a round opens/closes/extends;
- a team submits;
- results become available.

Economic calculations remain authoritative synchronous server-side work.

## Data Room

`session_materials` stores metadata and external URLs only. Current seed metadata mirrors the approved Figma, while URLs remain null until the final Drive files are shared for classroom access.


## Final debrief and ranking release

Round 3 completion calculates and persists every team's final score, but the comparative ranking is not automatically published.

The classroom sequence is:

1. all teams complete Round 3;
2. students can review their own operating KPIs and decision history, while Final Game Value, rank and class benchmark remain hidden;
3. every team uploads the required AI-conversation file through the configured external form and clicks **Registra la consegna** in the app;
4. the teacher console shows a pre-ranking debrief with class medians and decision tendencies for all three rounds;
5. when every completed team has registered an AI submission, the **Mostra risultati** control becomes available;
6. the teacher releases the ranking;
7. student final pages refresh and reveal Final Game Value, position and class benchmark.

The release gate is server-authoritative. `student_final_benchmark` rejects access before `game_sessions.results_released_at` is set. Restarting a simulation clears the release state.
