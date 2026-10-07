# Aurora Tyres World Model v0.5.3 RC1

This directory contains the isolated **v0.5.3 release candidate** selected after the quantitative balance audit of v0.5.2.

## Status

- Model identifier: `aurora-tyres-v0.5.3-rc.1`
- Status: **final validation PASSED**, awaiting explicit classroom activation
- Application routing: **not enabled**
- Database default: **unchanged**
- Current production/reference model: **v0.5.2**
- v0.4 and v0.5.2 remain frozen and untouched

The RC has passed the final numerical, accounting, regression and compatibility gate. It remains deliberately isolated from live session routing until a separate promotion change is approved.

## Why v0.5.3 exists

The v0.5.2 audit showed sound numerical behaviour and meaningful outcome dispersion, but systematic optimization exposed several corner solutions:

- Marketing frequently converged to extreme values.
- R&D frequently converged to its upper bound in the first two rounds and its lower bound in the final round.
- Standard pricing frequently converged to +10% in the final phases.
- Expected financial distress was active in only 0.235% of 20,000 random admissible strategies.

RC1 preserves the v0.5.2 structure and scenarios while recalibrating only the mechanisms implicated by those findings.

## RC1 calibration changes versus v0.5.2

| Parameter / mechanism | v0.5.2 | v0.5.3 RC1 |
| --- | ---: | ---: |
| Standard price elasticity | 3.3776 | 5.2 |
| Standard contractual capacity share | 0.50 | 0.25 |
| Leverage threshold | 2.5x | 1.5x |
| Immediate marketing coefficient, Premium | 0.015 | 0.020 |
| Immediate marketing coefficient, Standard | 0.008 | 0.011 |
| Brand coefficient | 0.1784 | 0.20 |
| Terminal intangible persistence | 0.85 | 0.88 |
| R&D diminishing-return threshold | none | 6.0% |
| R&D excess multiplier | none | 0.40 |
| Positive marketing diminishing threshold | none | +25% |
| Positive marketing excess multiplier | none | 0.35 |
| Negative marketing strategic multiplier | none | 1.50 |
| Negative marketing immediate multiplier | none | 1.25 |

The accounting expense for Marketing and R&D still uses the actual decision selected by the team. The nonlinear transformations affect demand/strategic-state response, not the booked expense.

## Selected balance results

A deterministic audit of 20,000 admissible strategies produced:

- default FGV: €13,281.853m;
- random FGV median: €12,341.865m;
- random FGV P5–P95: €11,362.895m–€12,938.319m;
- distress activation: 4.665%;
- full-information best FGV found: €13,633.401m;
- rolling-horizon FGV: €13,518.361m.

In the 24-start full-information optimization, no R1 or R2 numeric decision hit a lower/upper bound in more than 4.2% of starts. In R3, Standard price hit +10% in 8.3% and Marketing hit -50% in 8.3%. This is a substantial reduction in corner concentration versus v0.5.2.

## Frozen RC1 anchors

Default FGV:

`13281.852539946707`

Intermediate FGV after R1:

`10111.34699234464`

Intermediate FGV after R2:

`12195.491488569633`

The complete annual default anchors and the 12-case regression suite are frozen in `engine.test.ts` and `reference-cases.ts`.

## Rules for this directory

1. Do not back-port RC calibration changes into `v05/`.
2. Do not route live sessions to RC1 until the separate classroom-promotion change is approved.
3. Any further economic calibration must change the model identifier.
4. Regression anchors must be updated only when the economics intentionally change and a new balance audit has been run.
5. Heavy Monte Carlo / optimization audits should remain on research branches; the production test suite keeps only deterministic regression anchors.
