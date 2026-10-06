# Simulation Engine Contract — v0.2

Source model: Aurora Tyres World Model v0.4.

## Status

The workbook has now been mapped at the contract level.

Frozen from the workbook:

- 9 decision keys, bounds, steps and units
- three round/scenario definitions
- 2025 baseline
- calibrated model parameters
- endogenous state/output vector
- Balanced reference decisions
- Balanced engine/financial golden outputs
- validation benchmarks

Not yet frozen:

- original Excel formula expressions for the numerical engine

The current file interface exposes the workbook's values but not the formula strings themselves. Numerical formulas must therefore remain unimplemented until the source expressions can be read/exported. We will not reverse-engineer the formulas from outputs and label them v0.4.

## TypeScript domain contract

Canonical definitions now live in:

- `src/domain/simulation/v04/spec.ts`
- `src/domain/simulation/v04/reference-balanced.ts`
- `src/domain/simulation/v04/validation.ts`

### Decision contract

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

The API/database should use these keys unchanged to preserve direct traceability to sheet `12_WEB_APP_SCHEMA`.

## Required engine outputs

The authoritative engine must return both operating/strategic and financial state.

```ts
export interface SimulationResult {
  round: 1 | 2 | 3;
  modelVersion: "aurora-tyres-v0.4";
  operating: {
    premiumPriceIndex: number;
    standardPriceIndex: number;
    innovationStock: number;
    brandStrength: number;
    digitalReadiness: number;
    assetHealth: number;
    oemQualificationScore: number;
    serviceFulfilmentFactor: number;
    competitivePosition: number;
    strategicHealth: number;
  };
  commercial: {
    premiumRevenue: number;
    standardRevenue: number;
    revenue: number;
    premiumShare: number;
  };
  profitability: {
    adjustedEbitda: number;
    adjustedEbitdaMargin: number;
    adjustedEbit: number;
    adjustedEbitMargin: number;
  };
  cash: {
    tradeReceivables: number;
    inventories: number;
    tradePayables: number;
    netWorkingCapital: number;
    changeInNwc: number;
    capex: number;
    ufcf: number;
    netDebt: number;
    netDebtToEbitda: number;
  };
}
```

## Determinism

```
model version
+ opening state
+ submitted decisions
+ scenario parameters
= authoritative result
```

No LLM may participate in the numerical calculation path.

## Execution policy

1. load a locked decision submission
2. validate against the v0.4 decision schema
3. load opening state
4. load the frozen round scenario
5. execute the model
6. persist inputs and full outputs atomically
7. persist the model version
8. calculate an input hash
9. reject duplicate calculation for the same model/input hash
10. release results only through the teacher session state machine

## Numerical parity requirement

The first acceptance target is the Balanced reference scenario.

The implementation is accepted only when:

```
engine(BALANCED_DECISIONS, v0.4 scenarios)
≈ BALANCED_ENGINE_REFERENCE
≈ BALANCED_FINANCIAL_REFERENCE
```

Tolerance policy must be explicit. Recommended initial tolerance:

- exact equality for integer-like controls and categorical states
- absolute tolerance `1e-9` for indices/ratios
- absolute tolerance `1e-6` €m for monetary results

Tolerance is for floating-point representation only, not model divergence.

## Regression validation

Once formula translation is complete, the test suite must also cover:

- seven strategy archetypes
- sensitivity extremes
- random-strategy envelope
- invalid decision bounds
- invalid step increments
- two-year phase handling
- DCF phase weighting
- terminal-value calculation
- risk-penalty activation
- idempotent re-execution

## Formula translation gate

Do not merge `simulateRound()` under model identifier `aurora-tyres-v0.4` until original workbook formulas are available.

All currently committed TypeScript is contract/specification code, not a substitute numerical implementation.
