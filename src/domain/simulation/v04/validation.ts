import {
  DECISION_DEFINITIONS,
  type DecisionSet,
} from "./spec";

export interface DecisionValidationError {
  key: keyof DecisionSet;
  code: "NOT_FINITE" | "OUT_OF_RANGE" | "INVALID_STEP";
  message: string;
}

export interface DecisionValidationResult {
  valid: boolean;
  errors: DecisionValidationError[];
}

export interface DecisionValidationOptions {
  /**
   * Enforce the UI step grid from 12_WEB_APP_SCHEMA.
   *
   * Default is false because the authoritative workbook's Round-1 Balanced
   * reference uses rnd_pct = 0.046, which is inside bounds but is not aligned
   * to the declared 0.005 step from a 0.02 minimum.
   */
  enforceStep?: boolean;
}

const EPSILON = 1e-9;

function isOnStep(value: number, min: number, step: number): boolean {
  const scaled = (value - min) / step;
  return Math.abs(scaled - Math.round(scaled)) < EPSILON;
}

export function validateDecisionSet(
  decisions: DecisionSet,
  options: DecisionValidationOptions = {},
): DecisionValidationResult {
  const errors: DecisionValidationError[] = [];
  const enforceStep = options.enforceStep ?? false;

  for (const key of Object.keys(DECISION_DEFINITIONS) as Array<
    keyof DecisionSet
  >) {
    const value = decisions[key];
    const definition = DECISION_DEFINITIONS[key];

    if (!Number.isFinite(value)) {
      errors.push({
        key,
        code: "NOT_FINITE",
        message: `${definition.label}: valore non numerico.`,
      });
      continue;
    }

    if (value < definition.min - EPSILON || value > definition.max + EPSILON) {
      errors.push({
        key,
        code: "OUT_OF_RANGE",
        message: `${definition.label}: valore fuori intervallo [${definition.min}, ${definition.max}].`,
      });
      continue;
    }

    if (
      enforceStep &&
      !isOnStep(value, definition.min, definition.step)
    ) {
      errors.push({
        key,
        code: "INVALID_STEP",
        message: `${definition.label}: il valore deve rispettare uno step di ${definition.step}.`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateStudentDecisionSet(
  decisions: DecisionSet,
): DecisionValidationResult {
  return validateDecisionSet(decisions, { enforceStep: true });
}
