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

The decision form is model-version aware. Aurora Tyres v0.5.2 exposes six economic decisions: Premium price positioning, Standard price positioning, marketing, R&D with an orientation choice, CapEx, and a resilience policy. The v0.4 legacy flow retains its original nine controls. Percentages are displayed in human units and converted to decimal ratios at the server-action boundary.

Server-side validation and simulation are routed from the session's persisted `model_version`. The v0.5.2 storage adapter maps the reduced categorical choices onto the existing decision columns so the database can support both versions without rewriting historical v0.4 sessions.

## Teacher flow

From `/teacher` the instructor can open the next eligible round. The live console is:

```
/teacher/rounds/[round]
```

It provides:

- synchronized countdown;
- submitted / total teams;
- class medians for selected decisions;
- submission status by team;
- +2 minute extension;
- atomic close-and-calculate operation.

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

The teacher can close before the deadline only when every active team has submitted. After the deadline, the teacher can finalize the available submitted teams.

## Realtime

Realtime is state propagation only. It refreshes clients when:

- a round opens/closes/extends;
- a team submits;
- results become available.

Economic calculations remain authoritative synchronous server-side work.

## Data Room

`session_materials` stores metadata and external URLs only. Current seed metadata mirrors the approved Figma, while URLs remain null until the final Drive files are shared for classroom access.
