# Simulation Engine Contract — Draft v0.1

Status: structural contract only.

The exact decision keys, formulas, state variables, shocks, constraints and scoring functions must be derived from Aurora Tyres World Model v0.4 before implementation.

## Design goals

The engine must be:

- deterministic
- pure where possible
- server-side
- versioned
- testable independently from the UI/database
- reproducible from persisted inputs

## Proposed TypeScript contract

```ts
export type ModelVersion = "aurora-tyres-v0.4";

export type SimulationYear = 2026 | 2027 | 2028 | 2029 | 2030;
export type RoundNumber = 1 | 2 | 3;

export interface SimulationContext {
  modelVersion: ModelVersion;
  sessionId: string;
  teamId: string;
  round: RoundNumber;
}

export interface CompanyState {
  year: SimulationYear;

  // To be replaced by the exact v0.4 state vector.
  financial: Record<string, number>;
  operating: Record<string, number>;
  strategic: Record<string, number>;
}

export interface DecisionSet {
  round: RoundNumber;

  // Temporary generic representation.
  // Freeze to explicit fields after mapping v0.4.
  values: Record<string, number | string | boolean>;

  rationale?: string;
}

export interface ExternalScenario {
  round: RoundNumber;
  parameters: Record<string, number | string | boolean>;
}

export interface YearResult {
  year: SimulationYear;
  openingState: CompanyState;
  decisions: DecisionSet;
  scenario: ExternalScenario;
  closingState: CompanyState;
  metrics: Record<string, number>;
}

export interface RoundResult {
  round: RoundNumber;
  years: YearResult[];
  finalState: CompanyState;
}

export interface FinalScore {
  total: number;
  components: Record<string, number>;
}

export interface SimulationEngine {
  readonly modelVersion: ModelVersion;

  validateDecisions(
    state: CompanyState,
    decisions: DecisionSet,
    scenario: ExternalScenario
  ): ValidationResult;

  runRound(
    state: CompanyState,
    decisions: DecisionSet,
    scenario: ExternalScenario
  ): RoundResult;

  calculateFinalScore(history: RoundResult[]): FinalScore;
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    key: string;
    code: string;
    message: string;
  }>;
}
```

## Determinism

A simulation result must depend only on:

```
model version
+ opening state
+ submitted decisions
+ scenario parameters
= result
```

No LLM may participate in the numerical calculation path.

AI can support student reasoning, but it cannot alter the authoritative engine output.

## Execution policy

1. load locked decision submission
2. load opening state
3. load round scenario
4. validate
5. execute engine
6. persist full result in one transaction
7. compute input hash
8. prevent duplicate calculation for same input hash/model version
9. publish results only when teacher releases them

## Testing requirement

For every Excel/World Model reference scenario, create a golden test:

```ts
expect(runRound(referenceInput)).toEqual(referenceOutput)
```

The migration from Excel to TypeScript is accepted only when reference outputs match within explicitly defined numerical tolerances.

## World Model mapping checklist

When v0.4 is available:

1. inventory every input cell / decision variable
2. inventory every endogenous state variable
3. identify yearly dependencies
4. identify round-level shocks
5. map constraints and bounds
6. map rounding rules
7. map scoring functions
8. define units
9. define null/blank semantics
10. create golden input/output fixtures
11. replace generic Record types with explicit TypeScript interfaces
