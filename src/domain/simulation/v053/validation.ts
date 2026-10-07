import {
  DECISION_DEFINITIONS,
  type DecisionSet,
  type RoundNumber,
} from "./spec";

export interface DecisionValidationError {
  key: keyof DecisionSet;
  code:
    | "NOT_FINITE"
    | "OUT_OF_RANGE"
    | "INVALID_STEP"
    | "INVALID_CATEGORY"
    | "ROUND_RESTRICTION";
  message: string;
}

function isOnStep(value: number, min: number, step: number): boolean {
  const n = (value - min) / step;
  return Math.abs(n - Math.round(n)) < 1e-9;
}

export function validateDecisionSet(
  decisions: DecisionSet,
  round: RoundNumber,
): { valid: boolean; errors: DecisionValidationError[] } {
  const errors: DecisionValidationError[] = [];

  for (const key of Object.keys(DECISION_DEFINITIONS) as (keyof DecisionSet)[]) {
    const definition = DECISION_DEFINITIONS[key];
    const value = decisions[key];

    if (typeof value === "number") {
      if (!Number.isFinite(value)) {
        errors.push({
          key,
          code: "NOT_FINITE",
          message: "Il valore deve essere finito.",
        });
        continue;
      }
      if (definition.min !== undefined && definition.max !== undefined) {
        if (
          value < definition.min - 1e-12 ||
          value > definition.max + 1e-12
        ) {
          errors.push({
            key,
            code: "OUT_OF_RANGE",
            message: `Intervallo ammesso: ${definition.min}…${definition.max}.`,
          });
        }
        if (
          definition.step !== undefined &&
          !isOnStep(value, definition.min, definition.step)
        ) {
          errors.push({
            key,
            code: "INVALID_STEP",
            message: `Passo ammesso: ${definition.step}.`,
          });
        }
      }
    } else if (definition.values && !definition.values.includes(value)) {
      errors.push({
        key,
        code: "INVALID_CATEGORY",
        message: `Categoria non valida: ${String(value)}.`,
      });
    }
  }

  if (round === 1 && decisions.rnd_orientation === "Connected") {
    errors.push({
      key: "rnd_orientation",
      code: "ROUND_RESTRICTION",
      message: "L'orientamento Connected non è disponibile nel Round 1.",
    });
  }

  return { valid: errors.length === 0, errors };
}

export function assertValidDecisionSet(
  decisions: DecisionSet,
  round: RoundNumber,
): void {
  const validation = validateDecisionSet(decisions, round);
  if (!validation.valid) {
    throw new Error(
      validation.errors
        .map((error) => `${error.key}: ${error.message}`)
        .join("; "),
    );
  }
}
