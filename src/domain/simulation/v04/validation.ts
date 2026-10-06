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

const EPSILON = 1e-9;

function isOnStep(value: number, min: number, step: number): boolean {
  const scaled = (value - min) / step;
  return Math.abs(scaled - Math.round(scaled)) < EPSILON;
}

export function validateDecisionSet(
  decisions: DecisionSet,
): DecisionValidationResult {
  const errors: DecisionValidationError[] = [];

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

    if (!isOnStep(value, definition.min, definition.step)) {
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
