# Simulation Engine Contract — v0.3

Source model: Aurora Tyres World Model v0.4.

## Status

The original `.xlsx` is now available with formula expressions intact.

Frozen and translated from the workbook:

- 9 decision keys, bounds, steps and units
- three round/scenario definitions
- 2025 baseline
- calibrated model parameters
- complete `06_MODEL_ENGINE` formula chain
- complete `07_FINANCIALS` formula chain
- `08_DASHBOARD` DCF and risk-penalty calculation
- Balanced reference decisions
- Balanced engine/financial golden outputs
- validation benchmarks

The authoritative implementation is:

- `src/domain/simulation/v04/spec.ts`
- `src/domain/simulation/v04/engine.ts`
- `src/domain/simulation/v04/validation.ts`
- `src/domain/simulation/v04/reference-balanced.ts`
- `src/domain/simulation/v04/engine.test.ts`

## Decision contract

```ts
export interface DecisionSet {
  hv_price_change: number;
  std_price_change: number;
  marketing_change: number;
  rnd_pct: number;
  capex_pct: number;
  inventory_days: number;
  receivable_days: number;
  natural_rubber_hedge: number;
  connected_rnd_allocation: number;
}
```

The API/database should keep these keys unchanged to preserve direct traceability to workbook sheet `12_WEB_APP_SCHEMA`.

## Engine execution

```
opening state
+ round decisions
+ frozen external scenario
+ v0.4 parameters
= operating result
= financial result
= closing state
```

Round 2 and Round 3 each represent two economic years. The workbook implements this through:

- duration exponents in strategic-stock decay/build formulas;
- two-year capacity evolution;
- two-year cash/debt accumulation;
- two annual discount factors per phase.

## Determinism

The engine is pure and deterministic.

No LLM participates in the numerical path.

AI can support the student's analysis, but the server-side result must depend only on the versioned World Model and submitted numeric decisions.

## Excel parity

The TypeScript implementation follows the original formulas cell by cell for:

- price indices and relative price gaps;
- Innovation Stock;
- Brand Strength;
- Digital Readiness;
- Asset Health;
- OEM qualification;
- Premium and Standard demand;
- capacity and service/fulfilment;
- market-share indices;
- Competitive Position;
- revenue and product mix;
- raw-material and variable-cost indices;
- marketing, R&D, fixed opex and compliance;
- EBITDA, D&A and EBIT;
- Strategic Health;
- financial expenses, tax and net income;
- working capital;
- UFCF and levered cash flow;
- debt accumulation;
- invested-capital proxies;
- DCF;
- terminal value;
- risk penalty;
- Final Game Value.

See `docs/excel-typescript-parity.md` for source inconsistencies and hardcoded workbook constants.

## Numerical acceptance target

The first golden scenario is the workbook's Balanced strategy.

Expected final values:

```
PV explicit UFCF      1,914.6915330102684
PV terminal value     7,541.689316935605
Enterprise value      9,456.380849945874
Opening net debt        914.660000000000
Implied equity value  8,541.720849945874
Risk penalty              0.000000000000
FINAL GAME VALUE      8,541.720849945874
```

Tolerance policy:

- ratios / indices: absolute tolerance 1e-9
- monetary values: absolute tolerance 1e-6 €m

Tolerance exists only for floating-point representation; a business-model divergence is a failed parity test.

## Validation

Two validation layers are deliberately separated.

`validateDecisionSet()` verifies finite values and model bounds.

`validateStudentDecisionSet()` additionally enforces the UI step grid.

This distinction is necessary because the workbook itself uses a Round-1 R&D reference value of 4.6%, while `12_WEB_APP_SCHEMA` declares a 0.5 percentage-point R&D step.

The product/UI rule must be resolved before classroom release without changing the authoritative v0.4 golden scenario.

## Server execution policy

1. load locked decision submission;
2. validate server-side;
3. load prior authoritative state;
4. execute `simulateRound()`;
5. persist inputs and complete outputs atomically;
6. persist model version;
7. persist an input hash;
8. make calculation idempotent;
9. release results only through the teacher-controlled session state machine.

## Remaining regression work

Before production classroom deployment, add fixtures for:

- seven strategy archetypes;
- sensitivity extremes;
- risk-penalty activation;
- invalid bounds and student-step validation;
- idempotent persistence/re-execution;
- random-strategy distribution smoke test.

The numerical engine itself is no longer blocked on Excel formula access.
