import { describe, expect, it } from "vitest";

import { REFERENCE_CASES as V052_REFERENCE_CASES } from "../v05/reference-cases";
import {
  simulateGame,
  simulateIntermediateValue,
} from "./engine";
import { DEFAULT_DECISIONS } from "./spec";

describe("Aurora Tyres v0.5.3 RC anchor dump", () => {
  it("emits candidate anchors for freezing", () => {
    const game = simulateGame(DEFAULT_DECISIONS);

    const annual = Object.fromEntries(
      ([2026, 2027, 2028, 2029, 2030, 2031] as const).map((year) => [
        year,
        {
          revenue: game.annual[year].totalRevenue,
          ebitda: game.annual[year].adjustedEbitda,
          service: game.annual[year].serviceFactor,
          debt: game.annual[year].netDebt,
          strategicHealth: game.annual[year].strategicHealth,
          distress: game.annual[year].expectedDistressCost,
        },
      ]),
    );

    const references = V052_REFERENCE_CASES.map((testCase) => ({
      name: testCase.name,
      fgv: simulateGame(testCase.decisions).valuation.finalGameValue,
    }));

    console.log(
      "V053_RC_DEFAULT=" +
        JSON.stringify({
          fgv: game.valuation.finalGameValue,
          intermediateR1: simulateIntermediateValue(
            DEFAULT_DECISIONS,
            1,
          ).valuation.finalGameValue,
          intermediateR2: simulateIntermediateValue(
            DEFAULT_DECISIONS,
            2,
          ).valuation.finalGameValue,
          annual,
        }),
    );
    console.log("V053_RC_REFERENCES=" + JSON.stringify(references));

    expect(Number.isFinite(game.valuation.finalGameValue)).toBe(true);
  });
});
