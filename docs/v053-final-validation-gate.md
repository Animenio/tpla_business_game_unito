# Aurora Tyres v0.5.3 RC1 — Final validation gate

Date: 2026-10-07  
Model: `aurora-tyres-v0.5.3-rc.1`  
Decision: **PASS — ready for a separate classroom-promotion change**

## 1. Scope

This gate validates the RC itself without activating it in live sessions.

The checks cover:

- frozen numerical anchors and 12 reference strategies;
- accounting identities and balance-sheet closure;
- deterministic repeatability;
- equivalence between round-by-round execution and full-game execution;
- decision validation;
- compatibility with the existing decision-storage schema;
- isolation from the current live session router;
- a 50,000-strategy admissible stress test;
- current production database safety.

No v0.5.2 or v0.4 formula, anchor or route was modified.

## 2. 50,000-strategy stress test

A temporary deterministic stress harness sampled **50,000 complete admissible strategies** from the exact decision grids, with seed `20261007`.

Result:

`violations = 0`

Every sampled game completed with finite positive valuation outputs and every annual state satisfied the tested numerical/accounting invariants.

Observed envelope:

| Metric | Minimum | Maximum |
| --- | ---: | ---: |
| Final Game Value (€m) | 9,928.142 | 13,412.356 |
| Annual revenue (€m) | 4,583.414 | — |
| Annual EBITDA (€m) | 249.581 | — |
| EBITDA margin | 4.695% | 33.044% |
| Service factor | 55.161% | 99.978% |
| Stock availability | 94.540% | 99.978% |
| Asset reliability | 97.000% | 100.000% |
| Strategic health | 0.6897x | 1.2640x |
| Competitive position | 0.6677x | 1.2500x |
| Net debt (€m) | -1,715.962 | 1,426.618 |
| Minimum equity (€m) | 5,282.254 | — |
| Minimum fixed assets (€m) | 6,412.915 | — |
| Minimum terminal value (€m) | 13,509.540 | — |

Maximum absolute balance-sheet residual:

`6.37e-12`

Expected-distress activation frequency:

`4.672%`

This is consistent with the prior 20,000-strategy calibration result of 4.665% and confirms that distress remains a tail mechanism rather than a dominant scoring component.

The stress harness was removed after execution so normal production builds do not carry the 50,000-strategy test.

## 3. Accounting and valuation integrity

The gate confirms:

- annual balance-sheet closure within `1e-8`;
- positive fixed assets and equity across the 50,000-strategy sample;
- non-negative expected distress costs;
- positive enterprise value and terminal value;
- finite values throughout the explicit forecast and terminal bridge.

The following valuation identities are now covered by permanent tests:

`Enterprise Value = PV explicit UFCF + PV terminal value`

`Implied Equity Value = Enterprise Value - opening net debt`

`Final Game Value = Implied Equity Value - PV expected distress cost`

## 4. Execution-path consistency

The default strategy was executed both:

1. as one full 2026–2031 simulation; and
2. sequentially through `simulateRound()` for R1, R2 and R3.

The persisted closing state and the final-year outputs match the corresponding full-game annual path.

The gate also confirms:

`simulateIntermediateValue(..., 3) = simulateGame(...)`

This prevents a divergence between classroom round execution and the final valuation engine.

## 5. Regression protection

The existing RC regression suite remains frozen:

- default FGV: `13281.852539946707`;
- R1 intermediate FGV: `10111.34699234464`;
- R2 intermediate FGV: `12195.491488569633`;
- full annual default anchors 2026–2031;
- 12 named reference strategies;
- all-minimum and all-maximum strategies remain below the default.

Permanent invariant tests now additionally cover:

- numerical sanity of every frozen reference case;
- annual service/availability/reliability bounds;
- balance-sheet closure;
- valuation identities;
- round/full-game equivalence;
- storage-adapter round trip;
- rejection of invalid, off-grid and R1-incompatible decisions.

## 6. Storage and database compatibility

RC1 retains the same six-decision architecture as v0.5.2, so the existing storage adapter remains compatible.

The production database constraints were inspected directly. The complete RC decision space fits the current schema:

| RC decision | RC range / mapping | Production DB constraint | Result |
| --- | --- | --- | --- |
| Premium positioning | -10% to +10%, 1 pp | -10% to +15%, 1 pp | PASS |
| Standard positioning | -10% to +10%, 1 pp | -15% to +10%, 1 pp | PASS |
| Marketing | -50% to +100%, 5 pp | same | PASS |
| R&D | 2% to 8%, 0.5 pp | same | PASS |
| CapEx | 3% to 10%, 0.5 pp | same | PASS |
| Connected allocation | 10% / 30% / 50% | 0%–60%, 5 pp | PASS |
| Inventory days | 125 / 140 / 160 | 90–170, step 5 | PASS |
| Natural-rubber hedge | 0% / 30% / 70% | 0%–80%, 5 pp | PASS |
| Receivable days | fixed 34 | 25–60 | PASS |

No database migration is required merely to store RC1 decisions.

## 7. Production-isolation check

The RC is intentionally **not yet active**.

Current production state was checked directly:

- `game_sessions.model_version` default remains `aurora-tyres-v0.5.2`;
- the existing persisted sessions are still v0.4;
- no v0.5.3 session exists;
- the session router still accepts only v0.4 and v0.5.2.

A permanent regression assertion now verifies that the exact RC identifier:

`aurora-tyres-v0.5.3-rc.1`

is rejected by the live session router with `UNSUPPORTED_MODEL_VERSION` until the explicit promotion change is made.

This is intentional fail-closed behaviour.

## 8. Remaining observations

Two observations remain, neither is a release blocker.

First, the worst sampled service factor is approximately **55.2%**. This occurs under poor capacity/demand combinations and is economically interpretable as severe under-service rather than a numerical failure. It creates meaningful downside for teams that mismanage capacity.

Second, R3 remains the most influential round. This was already identified in the calibration audit and is structurally linked to its proximity to terminal valuation. The RC does not artificially flatten that effect.

## 9. Gate decision

| Validation dimension | Result |
| --- | --- |
| Frozen numerical anchors | PASS |
| Reference cases | PASS |
| Accounting closure | PASS |
| Valuation identities | PASS |
| Determinism | PASS |
| Round/full-game consistency | PASS |
| Decision validation | PASS |
| Storage compatibility | PASS |
| 50k admissible-strategy stress | PASS |
| Financial-risk activation | PASS |
| Production isolation | PASS |
| Backward compatibility | PASS |

**Final decision: PASS.**

Aurora Tyres v0.5.3 RC1 is technically ready to be promoted to the classroom model.

The next change should be a separate, explicit promotion PR that:

1. freezes the stable identifier as `aurora-tyres-v0.5.3`;
2. adds v0.5.3 to the session-engine router;
3. reuses the current v0.5.2 storage adapter;
4. updates the admin model selector and new-session default;
5. updates version-aware student/teacher copy;
6. changes the database default only after application routing is deployed;
7. performs a transactional Supabase end-to-end workflow with rollback;
8. preserves v0.5.2 and v0.4 routing for historical sessions.

No economic parameter should change during promotion. Any formula or calibration change would require a new RC and a repeat of this gate.
