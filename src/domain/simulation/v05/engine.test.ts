import { describe, expect, it } from "vitest";

import {
  PARITY_CASES,
  PARITY_TOLERANCE_EUR_M,
} from "./parity-vectors";
import {
  simulateGame,
  simulateIntermediateValue,
} from "./engine";
import { REFERENCE_CASES } from "./reference-cases";
import { DEFAULT_DECISIONS } from "./spec";

const FGV_TOLERANCE = PARITY_TOLERANCE_EUR_M;

describe("Aurora Tyres World Model v0.5.2", () => {
  it("matches all 27 frozen workbook parity vectors", () => {
    for (const testCase of PARITY_CASES) {
      const actual = simulateGame(
        testCase.decisions,
      ).valuation.finalGameValue;
      expect(
        Math.abs(
          actual - testCase.expectedFgv,
        ),
        testCase.name,
      ).toBeLessThanOrEqual(FGV_TOLERANCE);
    }
  });

  it("matches all frozen G12 reference cases", () => {
    for (const testCase of REFERENCE_CASES) {
      const actual = simulateGame(
        testCase.decisions,
      ).valuation.finalGameValue;
      expect(
        Math.abs(
          actual - testCase.expectedFgv,
        ),
        testCase.name,
      ).toBeLessThanOrEqual(FGV_TOLERANCE);
    }
  });

  it("matches the frozen default annual path and intermediate values", () => {
    const game = simulateGame(DEFAULT_DECISIONS);

    expect(
      game.valuation.finalGameValue,
    ).toBeCloseTo(13103.4989267348, 8);
    expect(
      simulateIntermediateValue(
        DEFAULT_DECISIONS,
        1,
      ).valuation.finalGameValue,
    ).toBeCloseTo(10119.126298273353, 8);
    expect(
      simulateIntermediateValue(
        DEFAULT_DECISIONS,
        2,
      ).valuation.finalGameValue,
    ).toBeCloseTo(12182.31091630062, 8);

    const anchors = {
      2026: {
        revenue: 5698.433327736892,
        ebitda: 1078.0322057326407,
        service: 0.9963051107377712,
        debt: 697.1175184030051,
      },
      2027: {
        revenue: 6048.038530585732,
        ebitda: 994.5263142333883,
        service: 0.9964556131510693,
        debt: 729.253579093885,
      },
      2028: {
        revenue: 6449.714039789956,
        ebitda: 1214.8184066618608,
        service: 0.9959803223505722,
        debt: 535.5720862434184,
      },
      2029: {
        revenue: 6879.093178342866,
        ebitda: 1558.613938778736,
        service: 0.9343193409689784,
        debt: 48.00934812202348,
      },
      2030: {
        revenue: 7225.0211474936295,
        ebitda: 1746.4202834323967,
        service: 0.8746560701670232,
        debt: -312.04389433558845,
      },
      2031: {
        revenue: 7662.750763990479,
        ebitda: 2146.482798440057,
        service: 0.9140963431154818,
        debt: -944.2842934410102,
      },
    } as const;

    for (const year of [
      2026,
      2027,
      2028,
      2029,
      2030,
      2031,
    ] as const) {
      const actual = game.annual[year];
      const expected = anchors[year];
      expect(
        actual.totalRevenue,
      ).toBeCloseTo(expected.revenue, 8);
      expect(
        actual.adjustedEbitda,
      ).toBeCloseTo(expected.ebitda, 8);
      expect(
        actual.serviceFactor,
      ).toBeCloseTo(expected.service, 10);
      expect(
        actual.netDebt,
      ).toBeCloseTo(expected.debt, 8);
      expect(
        Math.abs(actual.balanceCheck),
      ).toBeLessThan(1e-6);
      expect(
        actual.serviceFactor,
      ).toBeGreaterThan(0);
      expect(
        actual.serviceFactor,
      ).toBeLessThanOrEqual(1);
    }
  });

  it("is deterministic", () => {
    const first = simulateGame(DEFAULT_DECISIONS);
    const second = simulateGame(DEFAULT_DECISIONS);
    expect(second).toEqual(first);
  });
});
