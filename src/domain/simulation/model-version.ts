import { MODEL_VERSION as V04_MODEL_VERSION } from "./v04/spec";
import { MODEL_VERSION as V05_MODEL_VERSION } from "./v05/spec";
import { MODEL_VERSION as V053_MODEL_VERSION } from "./v053/spec";

export {
  V04_MODEL_VERSION,
  V05_MODEL_VERSION,
  V053_MODEL_VERSION,
};

export const DEFAULT_MODEL_VERSION = V053_MODEL_VERSION;

export function isReducedDecisionModelVersion(
  modelVersion: string,
): boolean {
  return (
    modelVersion === V05_MODEL_VERSION ||
    modelVersion === V053_MODEL_VERSION
  );
}

export function isSupportedModelVersion(
  modelVersion: string,
): boolean {
  return (
    modelVersion === V04_MODEL_VERSION ||
    modelVersion === V05_MODEL_VERSION ||
    modelVersion === V053_MODEL_VERSION
  );
}

export function assertSupportedModelVersion(
  modelVersion: string,
): void {
  if (!isSupportedModelVersion(modelVersion)) {
    throw new Error(
      `UNSUPPORTED_MODEL_VERSION:${modelVersion}`,
    );
  }
}
