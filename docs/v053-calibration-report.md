# Aurora Tyres v0.5.3 — Calibration report

Date: 2026-10-07  
Selected candidate: **v0.5.3 RC1**, derived from calibration candidate 3  
Production impact: **none** — v0.5.2 remains the active model

## 1. Objective

The v0.5.2 game-balance audit confirmed deterministic correctness and strong outcome differentiation, but identified an AMBER-HIGH corner-solution risk. Optimizers repeatedly selected extreme Marketing, R&D and Standard-price decisions, and expected distress activated in only 0.235% of 20,000 random strategies.

The v0.5.3 calibration therefore targeted four issues without changing the case structure:

1. make Marketing a genuine intertemporal trade-off rather than an extreme cost-cutting/investment lever;
2. reduce the systematic incentive to push Standard price to +10%;
3. introduce diminishing marginal strategic returns to R&D;
4. make financial distress a meaningful tail risk without turning it into a routine penalty.

v0.5.2 is not modified. All calibration work was performed in the isolated `v053/` engine.

## 2. Calibration mechanics

Compared with v0.5.2, the selected RC uses:

| Parameter / mechanism | v0.5.2 | RC1 |
| --- | ---: | ---: |
| Standard price elasticity | 3.3776 | 5.2 |
| Standard contractual capacity share | 50% | 25% |
| Leverage threshold | 2.5x | 1.5x |
| Immediate Marketing effect — Premium | 0.015 | 0.020 |
| Immediate Marketing effect — Standard | 0.008 | 0.011 |
| Brand coefficient | 0.1784 | 0.20 |
| Terminal intangible persistence | 0.85 | 0.88 |
| R&D diminishing threshold | none | 6.0% |
| R&D excess-return multiplier | none | 0.40 |
| Positive Marketing diminishing threshold | none | +25% |
| Positive Marketing excess multiplier | none | 0.35 |
| Marketing-cut strategic multiplier | none | 1.50 |
| Marketing-cut immediate multiplier | none | 1.25 |

Marketing and R&D expenses remain based on the actual selected budgets. Diminishing-return functions modify the economic response of demand and strategic-state accumulation, not the accounting amount charged to the income statement.

## 3. Candidate sequence

Four parameter variants were tested using the same deterministic 20,000-strategy audit, 3,000 single-round perturbations, one-at-a-time sweeps, 24-start coordinate ascent and rolling-horizon optimization.

| Metric | v0.5.2 | Candidate 1 | Candidate 2 | Candidate 3 | Candidate 4 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Standard elasticity | 3.3776 | 3.9 | 4.4 | **5.2** | 4.8 |
| Contractual Standard share | 50% | 35% | 25% | **25%** | 25% |
| Leverage threshold | 2.5x | 2.0x | 1.5x | **1.5x** | 1.5x |
| Default FGV (€m) | 13,103.499 | 13,240.115 | 13,281.853 | **13,281.853** | 13,281.853 |
| Distress frequency | 0.235% | 0.695% | 4.585% | **4.665%** | 4.645% |
| R3 Standard at +10%, optimizer starts | 100% | 100% | 91.7% | **8.3%** | 41.7% |
| R1 numeric boundary concentration | material | none | none | **none** | none |
| R2 numeric boundary concentration | material | limited | none | **none** | none |
| Rolling R3 Standard | +10% | +10% | +10% | **+7%** | +10% |

Candidate 1 solved most Marketing/R&D corners but left R3 Standard pricing effectively pinned to the upper bound and distress too rare.

Candidate 2 made distress materially active and removed most R1/R2 boundaries, but R3 Standard still converged to +10% in 91.7% of full-information starts.

Candidate 4 tested a midpoint Standard elasticity of 4.8. It improved the issue versus Candidate 2 but still produced +10% Standard pricing in 41.7% of optimizer starts and in the rolling-horizon solution.

Candidate 3, with Standard elasticity 5.2, reduced that boundary concentration to 8.3% and produced +7% rather than +10% Standard pricing in the rolling solution. It was therefore selected as RC1.

## 4. Selected RC1 random-space results

20,000 admissible random strategies, deterministic seed 20261007:

| Statistic | FGV (€m) |
| --- | ---: |
| Minimum | 9,928.142 |
| P1 | 10,808.922 |
| P5 | 11,362.895 |
| P25 | 12,023.325 |
| Median | 12,341.865 |
| P75 | 12,611.989 |
| P95 | 12,938.319 |
| P99 | 13,114.785 |
| Maximum sampled | 13,412.356 |
| Mean | 12,278.227 |
| Standard deviation | 479.513 |

Expected distress activated in **4.665%** of strategies. Approximately **73.96%** of strategies ended 2030 in net cash. This preserves distress as a tail mechanism while making it visible often enough to matter in poorly financed strategies.

## 5. Optimization stress test

The 24-start full-information search found 21 distinct local optima.

Best discovered FGV:

`€13,633.401m`

Worst local optimum:

`€13,597.693m`

The best discovered value is approximately **2.65% above the RC default**, compared with approximately **4.81%** upside between the v0.5.2 default and its best discovered optimization result. The exploitable value gap is therefore materially smaller.

Numeric boundary concentration across optimized solutions:

| Decision family | R1 | R2 | R3 |
| --- | ---: | ---: | ---: |
| Premium at min/max | max 4.2% | max 4.2% | 0% |
| Standard at min/max | 0% | 0% | max 8.3% |
| Marketing at min/max | 0% | 0% | min 8.3% |
| R&D at min/max | 0% | 0% | 0% |
| CapEx at min/max | 0% | 0% | 0% |

The remaining categorical convergence is economically scenario-linked: R2 selects Robusta resilience and Connected R&D orientation, while R1/R3 predominantly select Standard resilience. This is different from a generic numeric boundary exploit.

## 6. Rolling-horizon test

The selected RC was also optimized sequentially using only the valuation checkpoint appropriate to each stage.

| Round | Premium | Standard | Marketing | R&D | Orientation | CapEx | Resilience |
| --- | ---: | ---: | ---: | ---: | --- | ---: | --- |
| R1 | +5% | -5% | +25% | 6.0% | Bilanciato | 10.0% | Standard |
| R2 | +4% | 0% | +25% | 6.5% | Connected | 6.5% | Robusta |
| R3 | +5% | +7% | -15% | 4.5% | Bilanciato | 4.5% | Standard |

Final FGV:

`€13,518.361m`

This is approximately **1.78% above the RC default**, versus approximately **3.33%** for the analogous v0.5.2 rolling strategy.

The pattern remains economically intelligible — invest and build strategic capability early, protect the supply shock in R2, then harvest selectively — but it no longer requires repeatedly choosing the allowed numerical extremes.

## 7. Round dispersion

Randomizing one round while holding the others at the RC default produced:

| Round | FGV SD (€m) | P95–P5 spread (€m) |
| --- | ---: | ---: |
| R1 | 104.2 | 340.1 |
| R2 | 209.5 | 683.7 |
| R3 | 293.8 | 912.3 |

R3 remains the most influential round. This is partly structural because it covers 2029–2030 and sits closest to terminal value. The calibration deliberately did not flatten this timing effect artificially.

## 8. Frozen RC1 anchors

Default FGV:

`13281.852539946707`

Intermediate FGV:
- R1: `10111.34699234464`
- R2: `12195.491488569633`

Default annual path:

| Year | Revenue | EBITDA | Service | Net debt | Strategic health |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2026 | 5,698.433 | 1,078.033 | 0.9963 | 697.117 | 1.0061 |
| 2027 | 6,051.954 | 995.667 | 0.9964 | 729.212 | 1.0351 |
| 2028 | 6,455.776 | 1,216.822 | 0.9959 | 535.275 | 1.0634 |
| 2029 | 6,882.572 | 1,564.116 | 0.9333 | 46.395 | 1.1084 |
| 2030 | 7,268.707 | 1,820.632 | 0.8737 | -328.930 | 1.1436 |
| 2031 | 7,696.406 | 2,198.814 | 0.9120 | -980.622 | 1.1255 |

The exact full-precision values and 12 reference cases are encoded as deterministic regression tests in `src/domain/simulation/v053/`.

## 9. Reference-strategy regression values

| Strategy | RC1 FGV (€m) |
| --- | ---: |
| Segue il mercato | 13,281.853 |
| Premium Innovator | 12,895.679 |
| Cost Defender | 11,986.256 |
| Volume Player | 11,834.422 |
| Cash Maximizer | 11,143.456 |
| Overinvestor | 11,099.517 |
| Resilient Hedger | 13,176.374 |
| Harvester | 12,161.089 |
| Tech all-in | 12,968.287 |
| Status quo | 13,018.854 |
| Estremo tutto minimo | 10,123.229 |
| Estremo tutto massimo | 12,111.049 |

Neither pathological all-minimum nor all-maximum play is competitive.

## 10. Decision

**Candidate 3 is selected as Aurora Tyres v0.5.3 RC1.**

The RC is sufficiently improved to move to the next validation stage because:

- the Marketing recipe is removed;
- R&D optima are predominantly interior;
- Standard pricing no longer systematically hits the upper bound;
- financial distress is a meaningful but non-dominant tail risk;
- outcome dispersion remains substantial;
- multiple local optima remain;
- extreme strategies remain inferior;
- v0.5.2 is preserved intact for reproducibility and production rollback.

This selection does **not** activate v0.5.3 in the application. Integration into session routing, database defaults and classroom UX requires a separate approval and pull request after RC validation.
