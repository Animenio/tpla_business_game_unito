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

The decision form contains the nine World Model controls. Percentages are displayed in human units and converted to decimal ratios at the server-action boundary.

Strict student validation uses the UI bounds and steps from Aurora Tyres v0.4. The economic engine keeps its separate bounds-only validation so the workbook's 4.6% Round-1 Balanced R&D reference remains reproducible.

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
3. calls `simulateRound()` server-side;
4. sends only the calculated payload to the authenticated finalization RPC;
5. the RPC validates staff authorization, round state, team uniqueness and model version;
6. results are persisted and the round is closed in the same database transaction.

For Round 1 the opening state comes from `createOpeningState()`. For later rounds the opening state is the previous persisted `closingState`.

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
