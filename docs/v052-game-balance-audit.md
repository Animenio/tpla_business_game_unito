# Aurora Tyres v0.5.2 — Game-balance audit

Date: 2026-10-07  
Status: quantitative pre-classroom audit  
Model under test: `aurora-tyres-v0.5.2`

## Executive conclusion

Aurora Tyres v0.5.2 passes the basic discrimination and numerical-behaviour checks: the admissible decision space generates a wide but plausible distribution of outcomes, poor strategies are materially penalized, the all-minimum and all-maximum archetypes are not competitive, multiple high-performing strategies exist, and no single numeric boundary dominates the top 1% of a broad random sample.

The audit nevertheless identifies a material game-design concern before a classroom freeze. When the model is optimized rather than sampled randomly, several decision families converge strongly toward boundary values. The pattern is economically interpretable as **invest early / harvest late**, but it is strong enough that a sophisticated team could potentially discover a repeatable recipe rather than continuously balancing trade-offs.

The most relevant signals are:

- R1 R&D converges to 8% and R1 marketing to +100% under full-information optimization.
- R2 tends toward high R&D, high Standard pricing and Robusta resilience.
- R3 converges to Standard price +10%, marketing -50%, low R&D and Standard resilience.
- More importantly, a rolling-horizon optimization that uses only the valuation information available after each completed round still chooses marketing -50% in every round, R&D 8% in R1/R2, Standard price +10% in R2/R3 and lower late-stage investment.
- Financial distress is technically active but rare: only 0.235% of 20,000 random admissible strategies generated a positive distress penalty, while 73.19% ended 2030 in net cash.

Recommendation: **freeze v0.5.2 as the validated reference, but do not yet label it the final classroom-balanced model.** Any game-balance changes should be developed as a separate v0.5.3 candidate so that v0.5.2 parity and historical reproducibility remain untouched.

## 1. Method

The audit used the production TypeScript v0.5.2 engine without changing formulas or parameters.

A deterministic `mulberry32` generator with seed `20261007` produced **20,000 complete admissible strategies**. Every sampled numeric decision was drawn from the exact student UI grid and categorical choices respected round restrictions, including the prohibition of Connected R&D orientation in Round 1.

Additional diagnostics included:

- 3,000 random perturbations of each individual round while holding the other rounds at the frozen default strategy;
- one-at-a-time sweeps of every numeric and categorical decision around the default path;
- comparison of the top 1%, top 5% and bottom 1% of random strategies;
- 24-start coordinate-ascent optimization over the full three-round strategy space;
- rolling-horizon optimization: R1 optimized against the R1 intermediate valuation, R2 against the R2 intermediate valuation, then R3 against final FGV.

The full-information optimization is intentionally more powerful than a student should be in class and is used as a stress test for exploitable structure. The rolling-horizon test is the more pedagogically relevant diagnostic because it does not optimize R1 directly against the fully revealed future scenario.

## 2. Distribution of outcomes

Frozen default FGV:

`€13,103.499m`

Random-strategy FGV distribution:

| Statistic | FGV (€m) |
| --- | ---: |
| Minimum | 9,696.524 |
| P1 | 10,602.355 |
| P5 | 11,228.346 |
| P25 | 12,002.506 |
| Median | 12,339.294 |
| Mean | 12,254.606 |
| P75 | 12,615.938 |
| P95 | 12,929.962 |
| P99 | 13,116.237 |
| Maximum sampled | 13,427.784 |
| Standard deviation | 516.835 |

The P95–P5 spread is approximately **€1.702bn** and the sampled min–max spread is approximately **€3.731bn**. The frozen default is close to the 99th percentile of uniformly random admissible play.

This is a positive balance signal: decisions matter materially, but the output does not collapse into a narrow band. Equally, simply pushing every decision to its minimum or maximum is not rewarded: the frozen reference cases produce approximately €9.813bn for all-minimum and €12.150bn for all-maximum, both below the default.

## 3. Final operating outcomes

Across the 20,000 random strategies:

| Metric | Min | Median | P95 | Max |
| --- | ---: | ---: | ---: | ---: |
| Revenue 2030 (€m) | 5,069.5 | 6,633.4 | 7,499.3 | 8,378.8 |
| EBITDA margin | 8.42% | 22.58% | 27.63% | 33.38% |
| Strategic Health | 0.717x | 1.010x | 1.170x | 1.335x |
| Net debt 2030 (€m) | -1,379.8 | -246.6 | 399.4 | 1,248.4 |

The model therefore generates meaningful dispersion not only in FGV but also in operating performance and strategic state.

## 4. Financial-risk diagnostic

A positive expected-distress penalty appeared in **0.235%** of random strategies. The largest observed PV distress cost was approximately **€161.7m**.

At the same time, **73.19%** of random strategies ended 2030 in a net-cash position. Median final net debt was approximately **-€246.6m**.

Interpretation: the distress mechanism works, but in the current calibrated decision space it is a tail event. This is acceptable if distress is intended only as a guardrail against pathological strategies. It is weaker if debt discipline and financial resilience are intended to be central learning objectives throughout ordinary gameplay.

## 5. Global sensitivity signals

Simple Pearson correlations over the random design are descriptive, not causal, because the model is nonlinear and interactions are substantial. The largest absolute correlations with FGV were:

| Decision | Correlation with FGV |
| --- | ---: |
| R3 Premium positioning | +0.369 |
| R2 CapEx | +0.352 |
| R2 Premium positioning | +0.238 |
| R1 CapEx | +0.224 |
| R1 Premium positioning | +0.124 |
| R2 R&D | +0.096 |
| R3 CapEx | +0.090 |
| R3 Marketing | -0.083 |
| R3 Standard positioning | +0.080 |

No single numeric decision explains the result on its own. Pricing Premium and the timing of productive investment are the strongest continuous signals in the broad random space.

## 6. Categorical decisions

Mean FGV by category in the random design shows the intended scenario dependence.

Round 1 R&D orientation is nearly neutral on average: Core €12,255.5m versus Bilanciato €12,253.7m.

Round 2 shows a mild advantage for Connected orientation: Core €12,236.9m, Bilanciato €12,258.4m, Connected €12,268.5m.

Round 2 resilience is much more material during the supply shock:

- Snella: €12,184.5m
- Standard: €12,269.5m
- Robusta: €12,308.3m

Round 3 resilience reverses toward Standard on average:

- Snella: €12,242.9m
- Standard: €12,271.5m
- Robusta: €12,249.4m

This is a positive pedagogical property: the preferred resilience posture is scenario-dependent rather than globally monotonic.

## 7. Top and bottom strategy cohorts

The top 1% of the 20,000 random strategies had mean FGV **€13,186.3m**, median **€13,166.5m** and maximum **€13,427.8m**.

Average top-1% decisions were approximately:

| Round | Premium | Standard | Marketing | R&D | CapEx |
| --- | ---: | ---: | ---: | ---: | ---: |
| R1 | +3.2% | +1.0% | +22.3% | 5.88% | 7.29% |
| R2 | +2.7% | +1.9% | +13.9% | 6.78% | 7.55% |
| R3 | +6.1% | +2.0% | -3.5% | 4.76% | 5.60% |

No numeric boundary was used by at least 50% of the top-1% random cohort. This is evidence against a trivial one-variable corner strategy in the broad near-top region.

The bottom 1% tells a different story: it is characterized especially by low CapEx, aggressive negative Premium pricing in R2/R3 and an overrepresentation of Snella resilience in R2. Mean bottom-1% FGV was approximately **€10,379.4m**.

## 8. One-at-a-time sensitivity around the frozen default

One-at-a-time sweeps are conditional on the default strategy and must not be interpreted as independent causal coefficients. They are useful for identifying locally weak or strong levers.

The largest FGV spans were:

- R3 Premium positioning: about €721.7m across its allowed range.
- R2 CapEx: about €540.7m.
- R2 Premium positioning: about €486.2m.
- R3 CapEx: about €430.1m.
- R1 Premium positioning: about €292.5m.
- R1 CapEx: about €281.1m.
- R3 Marketing: about €283.2m.

Local optima around the default include R1 CapEx 8%, R2 CapEx 7.5%, R3 Premium +5%, and R3 R&D 4.5%. R3 Standard price reaches its upper bound (+10%) and R3 Marketing its lower bound (-50%) in this local test.

## 9. Relative importance of the three rounds

Holding the other rounds at the default strategy and randomizing one round at a time gives:

| Round | SD FGV (€m) | P95–P5 spread (€m) |
| --- | ---: | ---: |
| R1 | 131.5 | 421.3 |
| R2 | 227.6 | 733.5 |
| R3 | 280.1 | 869.8 |

R3 therefore produces roughly twice the P95–P5 dispersion of R1. This is not automatically a defect: R2 and R3 each cover two years, while R3 is also closer to terminal valuation. It does mean that the final round carries materially more scoring leverage and should be explained in the teaching design.

## 10. Full-information optimization stress test

A 24-start coordinate-ascent search generated **16 distinct local optima**. Local-optimum FGV ranged from approximately €13,684.8m to €13,733.4m, with standard deviation only €15.5m.

The best discovered strategy was:

| Round | Premium | Standard | Marketing | R&D | Orientation | CapEx | Resilience |
| --- | ---: | ---: | ---: | ---: | --- | ---: | --- |
| R1 | +1% | +7% | +100% | 8% | Core | 8% | Standard |
| R2 | +5% | +10% | -50% | 8% | Connected | 8% | Robusta |
| R3 | +4% | +10% | -50% | 2% | Connected | 3.5% | Standard |

FGV: **€13,733.438m**, approximately **4.81%** above the frozen default.

The search did not converge to one unique strategy, which is positive. However, optimized endpoints display strong boundary concentration:

- R1 Marketing at +100% in 95.8% of starts.
- R1 R&D at 8% in 100%.
- R2 Standard price at +10% in 79.2%.
- R2 R&D at 8% in 70.8%.
- R3 Standard price at +10% in 100%.
- R3 Marketing at -50% in 100%.
- R3 R&D at 2% in 62.5%.
- R1/R2/R3 resilience converges respectively to Standard / Robusta / Standard in 100% of starts.

This looks like a coherent invest-then-harvest solution, but it is stronger than desirable if students can reverse-engineer the mechanics.

## 11. Rolling-horizon optimization

To reduce the perfect-foresight objection, a second optimization was run sequentially.

R1 was optimized against the R1 intermediate valuation, future rounds being represented by the model's neutral continuation. R2 was then optimized against the R2 intermediate valuation. Only R3 was optimized against final FGV.

The resulting strategy was:

| Round | Premium | Standard | Marketing | R&D | Orientation | CapEx | Resilience |
| --- | ---: | ---: | ---: | ---: | --- | ---: | --- |
| R1 | -1% | +3% | -50% | 8% | Bilanciato | 10% | Standard |
| R2 | +5% | +10% | -50% | 8% | Bilanciato | 7% | Robusta |
| R3 | +3% | +10% | -50% | 3% | Connected | 4.5% | Standard |

Intermediate valuation after optimized R1: **€10,297.618m**.  
Intermediate valuation after optimized R2: **€12,346.053m**.  
Final FGV: **€13,540.327m**.

The rolling strategy is approximately **3.33% above the frozen default** and only about **1.41% below** the best full-information solution found.

This is the most important amber signal in the audit. Even without optimizing early rounds directly against the final revealed scenario, the algorithm repeatedly selects:

- minimum Marketing in all three rounds;
- maximum R&D in R1 and R2;
- maximum Standard pricing in R2 and R3;
- lower investment intensity in the final phase;
- Standard → Robusta → Standard resilience.

The model therefore rewards economically understandable timing, but some controls risk becoming too close to a recipe.

## 12. Balance assessment

| Dimension | Assessment | Rationale |
| --- | --- | --- |
| Numerical stability | GREEN | Finite, deterministic, parity already frozen |
| Outcome dispersion | GREEN | Material FGV/KPI differentiation |
| All-min / all-max exploits | GREEN | Neither extreme vector is competitive |
| Multiple good strategies | GREEN | Broad top cohort and multiple local optima |
| Scenario-dependent resilience | GREEN | R2 shock materially rewards Robusta |
| Pricing / investment trade-offs | GREEN–AMBER | Strong effects, but some late boundaries |
| Corner-solution risk | AMBER-HIGH | Optimizers repeatedly hit several bounds |
| Financial-risk relevance | AMBER | Distress in only 0.235% of random strategies |
| Round-weight balance | AMBER-LOW | R3 has ~2x R1 dispersion, partly structural |
| Classroom freeze readiness | AMBER | Model is valid; balance deserves one targeted calibration pass |

## 13. Recommended next step

Do **not** modify v0.5.2 in place. It is now a frozen, validated and production-integrated reference.

Create an isolated **v0.5.3 calibration candidate** and test only a small set of hypotheses:

1. **Marketing economics.** Investigate why rolling-horizon valuation chooses -50% in every round while full-information R1 optimization can choose +100%. The goal is not to force an interior optimum, but to ensure marketing remains a genuine trade-off under the information actually available to students.
2. **Standard pricing in R2/R3.** Test whether the combination of Standard elasticity, contractual share and capacity allocation makes +10% too consistently attractive.
3. **R&D timing.** Check whether R3 investment falling toward 2–3% is an intended harvesting effect or an excessive terminal-timing incentive. Connected orientation remains useful, so budget and composition should be evaluated separately.
4. **Financial risk.** Decide explicitly whether distress is intended as a rare guardrail or an ordinary management constraint. Only in the latter case should leverage/cash calibration be strengthened.
5. **Re-run exactly the same audit** on every v0.5.3 candidate and compare against this v0.5.2 baseline before any production adoption.

Any v0.5.3 change should preserve v0.5.2 code, reference cases and parity tests unchanged.
