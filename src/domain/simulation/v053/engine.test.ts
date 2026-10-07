import { describe, expect, it } from "vitest";

import {
  simulateGame,
  simulateIntermediateValue,
} from "./engine";
import { REFERENCE_CASES } from "./reference-cases";
import {
  DEFAULT_DECISIONS,
  MODEL_VERSION,
  type ModelYear,
} from "./spec";

const DEFAULT_ANNUAL: Record<
  ModelYear,
  {
    revenue: number;
    ebitda: number;
    service: number;
    debt: number;
    strategicHealth: number;
    distress: number;
  }
> = {
  2026: {
    revenue: 5698.433348504161,
    ebitda: 1078.0325634568894,
    service: 0.9963051107377712,
    debt: 697.1174446441137,
    strategicHealth: 1.0060835637614967,
    distress: 0,
  },
  2027: {
    revenue: 6051.953961104199,
    ebitda: 995.6668416111212,
    service: 0.996440021232834,
    debt: 729.212366301716,
    strategicHealth: 1.0351161374197937,
    distress: 0,
  },
  2028: {
    revenue: 6455.776468915685,
    ebitda: 1216.822429640519,
    service: 0.9959098497527555,
    debt: 535.2748289459307,
    strategicHealth: 1.0633993731310962,
    distress: 0,
  },
  2029: {
    revenue: 6882.572352011053,
    ebitda: 1564.1162737310399,
    service: 0.9332983566322857,
    debt: 46.39514650215915,
    strategicHealth: 1.1084030684828905,
    distress: 0,
  },
  2030: {
    revenue: 7268.707258197148,
    ebitda: 1820.631712192931,
    service: 0.8737070872546788,
    debt: -328.9298036983472,
    strategicHealth: 1.1436289236057608,
    distress: 0,
  },
  2031: {
    revenue: 7696.405667612368,
    ebitda: 2198.81358730966,
    service: 0.9120239904935585,
    debt: -980.621639215122,
    strategicHealth: 1.1254838579609245,
    distress: 0,
  },
};

describe("Aurora Tyres v0.5.3 RC1", () => {
  it("matches the frozen default and intermediate anchors", () => {
    const game = simulateGame(DEFAULT_DECISIONS);

    expect(game.modelVersion).toBe(MODEL_VERSION);
    expect(game.valuation.finalGameValue).toBeCloseTo(
      13281.852539946707,
      8,
    );
    expect(
      simulateIntermediateValue(DEFAULT_DECISIONS, 1).valuation
        .finalGameValue,
    ).toBeCloseTo(10111.34699234464, 8);
    expect(
      simulateIntermediateValue(DEFAULT_DECISIONS, 2).valuation
        .finalGameValue,
    ).toBeCloseTo(12195.491488569633, 8);

    for (const year of [
      2026,
      2027,
      2028,
      2029,
      2030,
      2031,
    ] as const) {
      const actual = game.annual[year];
      const expected = DEFAULT_ANNUAL[year];

      expect(actual.totalRevenue).toBeCloseTo(expected.revenue, 8);
      expect(actual.adjustedEbitda).toBeCloseTo(expected.ebitda, 8);
      expect(actual.serviceFactor).toBeCloseTo(expected.service, 10);
      expect(actual.netDebt).toBeCloseTo(expected.debt, 8);
      expect(actual.strategicHealth).toBeCloseTo(
        expected.strategicHealth,
        10,
      );
      expect(actual.expectedDistressCost).toBeCloseTo(
        expected.distress,
        10,
      );
      expect(actual.balanceCheck).toBeCloseTo(0, 8);
    }
  });

  it("matches the frozen 12-case regression suite", () => {
    for (const testCase of REFERENCE_CASES) {
      expect(
        simulateGame(testCase.decisions).valuation.finalGameValue,
        testCase.name,
      ).toBeCloseTo(testCase.expectedFgv, 8);
    }
  });

  it("keeps the pathological min/max strategies below the default", () => {
    const defaultFgv =
      simulateGame(DEFAULT_DECISIONS).valuation.finalGameValue;
    const minCase = REFERENCE_CASES.find((item) =>
      item.name.includes("minimo"),
    );
    const maxCase = REFERENCE_CASES.find((item) =>
      item.name.includes("massimo"),
    );

    expect(minCase).toBeDefined();
    expect(maxCase).toBeDefined();
    expect(minCase!.expectedFgv).toBeLessThan(defaultFgv);
    expect(maxCase!.expectedFgv).toBeLessThan(defaultFgv);
  });
});
