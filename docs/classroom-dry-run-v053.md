# Classroom dry run — Aurora Tyres v0.5.3

Date: 2026-10-07  
Scope: pre-classroom workflow and UX hardening  
Production model: `aurora-tyres-v0.5.3`

## Executive result

The technical classroom workflow is ready from the database and application-contract perspective. The production RPC lifecycle has already completed end-to-end with rollback, the stable v0.5.3 engine is active for new sessions, and a fresh-session provisioning check confirms the Data Room and all three rounds are created automatically.

A source-level UX walkthrough identified a small set of classroom-facing inconsistencies. They are fixed in this hardening change without modifying the World Model or production database.

This pass does **not** claim a real authenticated browser click-through. No browser/computer-use surface was available in this validation environment. The remaining manual acceptance task is therefore visual/interaction QA in a real browser, not economic or backend validation.

## 1. Production provisioning check

A disposable production transaction created a new test session through the real `admin_create_session` RPC using the default model version and then rolled back.

Observed before rollback:

| Check | Result |
| --- | --- |
| Session model | `aurora-tyres-v0.5.3` |
| Initial status | `registration_open` |
| Seeded rounds | 3 |
| Seeded Data Room materials | 2 |
| Required materials with URL | 2 |

The disposable `DRYRUN53` row was confirmed absent after rollback.

This complements the earlier full transactional production workflow:

`create session → student join → team → confirm → live → R1 → R2 → R3 → final score → benchmark → rollback`

That workflow completed successfully under v0.5.3.

## 2. Student journey source audit

Reviewed the current routes:

```
/team
/lobby
/case-study
/rounds/[round]/briefing
/rounds/[round]/decisions
/rounds/[round]/review
/rounds/[round]/submitted
/rounds/[round]/results
/final
/ai-chat
```

Confirmed from source:

- live-session redirect from lobby to Data Room;
- model-aware 6-decision flow for v0.5.3/v0.5.2;
- server-side validation before review/submission;
- submitted decisions are redirected away from editing;
- closed rounds redirect submitted teams to their result;
- next-round state is shown after results;
- Round 3 completion exposes the final report;
- final report includes FGV, value bridge, final KPIs and class benchmark;
- responsive CSS collapses the decision grid, results metrics and final-value panels for tablet/mobile widths.

### Issue found and fixed — Data Room round label

The Data Room entry card was hard-coded to `ROUND 1`. After Round 1 closed, a student returning to the Data Room could therefore see “Attendi l’apertura del Round 1” even while waiting for Round 2 or Round 3.

The card now derives its label and waiting copy from the actual open round or the next scheduled round.

## 3. Teacher journey source audit

Reviewed:

```
/teacher
/teacher/rounds/[round]
/teacher/leaderboard
/admin/sessions
```

The current teacher flow provides:

- registration/team readiness metrics;
- server-authoritative start guard;
- round sequencing guard;
- countdown and +2 minute extension;
- realtime submission count;
- per-team submission status and timestamp;
- simultaneous server-side calculation;
- final leaderboard and AI-evidence state;
- restart control.

### Issue found and fixed — close-round affordance

The backend requires every active team to have submitted before `teacher_finalize_round` succeeds, but the live console previously left the close button enabled and its copy implied that the restriction applied only before the deadline.

The UI now mirrors the authoritative rule:

- close button disabled until all active teams submit;
- button states how many teams are still missing;
- copy explicitly tells the teacher to extend the decision window if time expires before all submissions arrive.

The database remains the final authority, so this is UX hardening rather than a security change.

### Issue found and fixed — reduced-model live signals

Students in v0.5.3 choose one categorical resilience policy, but the teacher console displayed its implementation columns separately as median inventory days and median rubber hedge. That exposed storage mechanics rather than the decision language used in class.

For v0.5.3/v0.5.2 the live console now shows:

- predominant resilience policy: Snella / Standard / Robusta;
- predominant R&D orientation: Core / Bilanciato / Connected;
- `Misto` when the leading categories are tied.

Legacy v0.4 retains the original numeric medians.

### Issue found and fixed — model-version visibility

The teacher session and live-round headings now surface the active World Model version. This reduces the risk of running a class on an unintended historical model.

### Issue found and fixed — closed-round debrief

The teacher round page previously kept showing decision-side live metrics after closure and the “Vedi risultati” action led to a page with little outcome information.

Closed rounds now show class medians for:

- revenue;
- EBITDA margin;
- net debt;
- strategic health;

together with the number of team results calculated. Open rounds continue to show live decision/submission signals.

### Issue found and fixed — completed-session lobby

A student manually revisiting `/lobby` after completion could remain on the pre-game screen. Completed sessions now redirect directly to `/final`.

## 4. Documentation inconsistencies fixed

Active documentation had three stale statements:

- architecture still described v0.5.2 as the default;
- round-lifecycle documentation still described only v0.5.2 as the reduced model;
- time semantics incorrectly suggested that, after expiry, a teacher could finalize only the teams that had submitted.

These are now aligned with the actual v0.5.3 production behavior. The teacher-control guide was also updated from its old pre-round implementation scope to the current complete classroom lifecycle.

## 5. Responsive-layout source check

The source contains explicit breakpoints for the main classroom surfaces:

- teacher live grid collapses below 1100px;
- decision columns collapse below 1100px;
- live/result KPI cards reduce to three columns and then one column;
- decision-card stacks collapse to one column on smaller screens;
- submission tables switch to a two-column mobile layout;
- final-value cards collapse from four to two to one column;
- teacher dashboard metrics collapse from four to two to one column.

This is a source-level check. Pixel-level overflow, focus behavior, mobile keyboard interaction and actual device rendering still require browser QA.

## 6. Release assessment

| Dimension | Status |
| --- | --- |
| World Model v0.5.3 | PASS |
| Production default | PASS |
| New-session provisioning | PASS |
| Data Room provisioning | PASS |
| Student route logic | PASS after fix |
| Teacher route logic | PASS after fix |
| Closed-round debrief | PASS after fix |
| Completed-session redirect | PASS after fix |
| Close-round UX/backend consistency | PASS after fix |
| Reduced-model teacher semantics | PASS after fix |
| Version visibility | PASS after fix |
| Responsive rules in source | PASS |
| Authenticated real-browser walkthrough | MANUAL CHECK REMAINING |

## 7. Manual browser acceptance checklist

Before the first live class, perform one short authenticated browser run with one teacher and at least two student accounts:

1. create a test session and confirm v0.5.3 is selected;
2. join two students, create/confirm teams, lock and start;
3. open both Data Room documents;
4. open R1 and inspect decision controls on desktop and one phone;
5. submit only one team and confirm the teacher close button remains disabled;
6. submit the remaining team, close R1 and confirm both students move to results;
7. confirm the Data Room waiting card now references Round 2;
8. repeat the transition through R3 and open the final report/leaderboard;
9. verify AI evidence upload/link workflow;
10. restart the test simulation only if restart behavior is intended for classroom recovery.

No economic recalibration should be performed as part of this acceptance run.
