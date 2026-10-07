import { describe, expect, it } from "vitest";

import {
  createOpeningState,
  simulateGame,
  simulateIntermediateValue,
  simulateRound,
} from "./engine";
import {
  DEFAULT_DECISIONS,
  type DecisionSet,
  type ModelYear,
  type RoundNumber,
  type RndOrientation,
  type ResiliencePolicy,
} from "./spec";

const SAMPLE_SIZE = 50_000;
const SEED = 20261007;

type NumericKey =
  | "premium_price_positioning"
  | "standard_price_positioning"
  | "marketing_change"
  | "rnd_pct"
  | "capex_pct";

const GRID: Record<NumericKey, readonly number[]> = {
  premium_price_positioning: range(-0.10, 0.10, 0.01),
  standard_price_positioning: range(-0.10, 0.10, 0.01),
  marketing_change: range(-0.50, 1.00, 0.05),
  rnd_pct: range(0.02, 0.08, 0.005),
  capex_pct: range(0.03, 0.10, 0.005),
};

const ORIENTATIONS: Record<RoundNumber, readonly RndOrientation[]> = {
  1: ["Core", "Bilanciato"],
  2: ["Core", "Bilanciato", "Connected"],
  3: ["Core", "Bilanciato", "Connected"],
};

const RESILIENCE: readonly ResiliencePolicy[] = [
  "Snella",
  "Standard",
  "Robusta",
];

function range(start: number, end: number, step: number): number[] {
  const values: number[] = [];
  for (let value = start; value <= end + 1e-12; value += step) {
    values.push(Number(value.toFixed(12)));
  }
  return values;
}

function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, values: readonly T[]): T {
  return values[Math.floor(rand() * values.length)]!;
}

function randomDecision(
  rand: () => number,
  round: RoundNumber,
): DecisionSet {
  return {
    premium_price_positioning: pick(rand, GRID.premium_price_positioning),
    standard_price_positioning: pick(rand, GRID.standard_price_positioning),
    marketing_change: pick(rand, GRID.marketing_change),
    rnd_pct: pick(rand, GRID.rnd_pct),
    rnd_orientation: pick(rand, ORIENTATIONS[round]),
    capex_pct: pick(rand, GRID.capex_pct),
    resilience_policy: pick(rand, RESILIENCE),
  };
}

function randomStrategy(
  rand: () => number,
): Record<RoundNumber, DecisionSet> {
  return {
    1: randomDecision(rand, 1),
    2: randomDecision(rand, 2),
    3: randomDecision(rand, 3),
  };
}

function minUpdate(current: number, value: number): number {
  return Math.min(current, value);
}

function maxUpdate(current: number, value: number): number {
  return Math.max(current, value);
}

function allFinite(values: readonly number[]): boolean {
  return values.every(Number.isFinite);
}

describe("Aurora Tyres v0.5.3 RC1 final validation gate", () => {
  it(
    "stress-tests 50k admissible strategies for numerical and accounting invariants",
    () => {
      const rand = mulberry32(SEED);

      let minFgv = Number.POSITIVE_INFINITY;
      let maxFgv = Number.NEGATIVE_INFINITY;
      let minRevenue = Number.POSITIVE_INFINITY;
      let minEbitda = Number.POSITIVE_INFINITY;
      let minEbitdaMargin = Number.POSITIVE_INFINITY;
      let maxEbitdaMargin = Number.NEGATIVE_INFINITY;
      let minService = Number.POSITIVE_INFINITY;
      let maxService = Number.NEGATIVE_INFINITY;
      let minStockAvailability = Number.POSITIVE_INFINITY;
      let maxStockAvailability = Number.NEGATIVE_INFINITY;
      let minAssetReliability = Number.POSITIVE_INFINITY;
      let maxAssetReliability = Number.NEGATIVE_INFINITY;
      let minEquity = Number.POSITIVE_INFINITY;
      let minFixedAssets = Number.POSITIVE_INFINITY;
      let minTerminalValue = Number.POSITIVE_INFINITY;
      let minStrategicHealth = Number.POSITIVE_INFINITY;
      let maxStrategicHealth = Number.NEGATIVE_INFINITY;
      let minCompetitivePosition = Number.POSITIVE_INFINITY;
      let maxCompetitivePosition = Number.NEGATIVE_INFINITY;
      let minNetDebt = Number.POSITIVE_INFINITY;
      let maxNetDebt = Number.NEGATIVE_INFINITY;
      let maxAbsBalanceCheck = 0;
      let distressCount = 0;
      let violations = 0;

      for (let index = 0; index < SAMPLE_SIZE; index += 1) {
        const game = simulateGame(randomStrategy(rand));

        if (
          !allFinite([
            game.valuation.finalGameValue,
            game.valuation.enterpriseValue,
            game.valuation.impliedEquityValue,
            game.valuation.pvExplicitUfcf,
            game.valuation.pvExpectedDistressCost,
            game.terminal.terminalValue,
            game.terminal.pvTerminalValue,
          ]) ||
          game.valuation.finalGameValue <= 0 ||
          game.valuation.enterpriseValue <= 0 ||
          game.terminal.terminalValue <= 0 ||
          game.valuation.pvExpectedDistressCost < 0
        ) {
          violations += 1;
        }

        minFgv = minUpdate(minFgv, game.valuation.finalGameValue);
        maxFgv = maxUpdate(maxFgv, game.valuation.finalGameValue);
        minTerminalValue = minUpdate(minTerminalValue, game.terminal.terminalValue);

        if (game.valuation.pvExpectedDistressCost > 1e-9) {
          distressCount += 1;
        }

        for (const year of [2026, 2027, 2028, 2029, 2030, 2031] as const) {
          const annual = game.annual[year];

          const annualFinite = allFinite([
            annual.totalRevenue,
            annual.adjustedEbitda,
            annual.adjustedEbitdaMargin,
            annual.serviceFactor,
            annual.stockAvailability,
            annual.assetReliability,
            annual.netDebt,
            annual.expectedDistressCost,
            annual.balanceCheck,
            annual.fixedAssets,
            annual.equity,
            annual.closingInnovation,
            annual.closingBrand,
            annual.closingDigital,
            annual.closingAssetHealth,
            annual.strategicHealth,
            annual.competitivePosition,
          ]);

          const annualValid =
            annualFinite &&
            annual.totalRevenue > 0 &&
            annual.premiumRevenue >= 0 &&
            annual.standardRevenue >= 0 &&
            annual.premiumRevenueShare >= 0 &&
            annual.premiumRevenueShare <= 1 &&
            annual.serviceFactor > 0 &&
            annual.serviceFactor <= 1 + 1e-12 &&
            annual.stockAvailability >= 0.8 - 1e-12 &&
            annual.stockAvailability <= 1 + 1e-12 &&
            annual.assetReliability >= 0.88 - 1e-12 &&
            annual.assetReliability <= 1 + 1e-12 &&
            annual.expectedDistressCost >= 0 &&
            annual.fixedAssets > 0 &&
            annual.equity > 0 &&
            annual.closingInnovation >= 0.6 - 1e-12 &&
            annual.closingInnovation <= 1.45 + 1e-12 &&
            annual.closingBrand >= 0.65 - 1e-12 &&
            annual.closingBrand <= 1.4 + 1e-12 &&
            annual.closingDigital >= 0.65 - 1e-12 &&
            annual.closingDigital <= 1.5 + 1e-12 &&
            annual.closingAssetHealth >= 0.7 - 1e-12 &&
            annual.closingAssetHealth <= 1.3 + 1e-12 &&
            annual.competitivePosition >= 0.65 - 1e-12 &&
            annual.competitivePosition <= 1.4 + 1e-12 &&
            Math.abs(annual.balanceCheck) < 1e-8;

          if (!annualValid) violations += 1;

          minRevenue = minUpdate(minRevenue, annual.totalRevenue);
          minEbitda = minUpdate(minEbitda, annual.adjustedEbitda);
          minEbitdaMargin = minUpdate(minEbitdaMargin, annual.adjustedEbitdaMargin);
          maxEbitdaMargin = maxUpdate(maxEbitdaMargin, annual.adjustedEbitdaMargin);
          minService = minUpdate(minService, annual.serviceFactor);
          maxService = maxUpdate(maxService, annual.serviceFactor);
          minStockAvailability = minUpdate(minStockAvailability, annual.stockAvailability);
          maxStockAvailability = maxUpdate(maxStockAvailability, annual.stockAvailability);
          minAssetReliability = minUpdate(minAssetReliability, annual.assetReliability);
          maxAssetReliability = maxUpdate(maxAssetReliability, annual.assetReliability);
          minEquity = minUpdate(minEquity, annual.equity);
          minFixedAssets = minUpdate(minFixedAssets, annual.fixedAssets);
          minStrategicHealth = minUpdate(minStrategicHealth, annual.strategicHealth);
          maxStrategicHealth = maxUpdate(maxStrategicHealth, annual.strategicHealth);
          minCompetitivePosition = minUpdate(minCompetitivePosition, annual.competitivePosition);
          maxCompetitivePosition = maxUpdate(maxCompetitivePosition, annual.competitivePosition);
          minNetDebt = minUpdate(minNetDebt, annual.netDebt);
          maxNetDebt = maxUpdate(maxNetDebt, annual.netDebt);
          maxAbsBalanceCheck = maxUpdate(maxAbsBalanceCheck, Math.abs(annual.balanceCheck));
        }
      }

      const report = {
        sampleSize: SAMPLE_SIZE,
        seed: SEED,
        violations,
        fgv: { min: minFgv, max: maxFgv },
        annual: {
          minRevenue,
          minEbitda,
          ebitdaMargin: { min: minEbitdaMargin, max: maxEbitdaMargin },
          service: { min: minService, max: maxService },
          stockAvailability: {
            min: minStockAvailability,
            max: maxStockAvailability,
          },
          assetReliability: {
            min: minAssetReliability,
            max: maxAssetReliability,
          },
          minEquity,
          minFixedAssets,
          strategicHealth: {
            min: minStrategicHealth,
            max: maxStrategicHealth,
          },
          competitivePosition: {
            min: minCompetitivePosition,
            max: maxCompetitivePosition,
          },
          netDebt: { min: minNetDebt, max: maxNetDebt },
          maxAbsBalanceCheck,
        },
        minTerminalValue,
        distressFrequency: distressCount / SAMPLE_SIZE,
      };

      console.log("V053_VALIDATION_STRESS=" + JSON.stringify(report));
      expect(violations).toBe(0);
    },
    60_000,
  );

  it("keeps round-by-round execution equivalent to the full-game annual path", () => {
    let state = createOpeningState();

    const r1 = simulateRound(state, DEFAULT_DECISIONS[1], 1);
    state = r1.closingState;
    const r2 = simulateRound(state, DEFAULT_DECISIONS[2], 2);
    state = r2.closingState;
    const r3 = simulateRound(state, DEFAULT_DECISIONS[3], 3);

    const full = simulateGame(DEFAULT_DECISIONS);

    const checkpoints: Array<[ModelYear, ReturnType<typeof simulateRound>]> = [
      [2026, r1],
      [2028, r2],
      [2030, r3],
    ];

    for (const [year, roundResult] of checkpoints) {
      expect(roundResult.finalYear.totalRevenue).toBeCloseTo(
        full.annual[year].totalRevenue,
        10,
      );
      expect(roundResult.finalYear.adjustedEbitda).toBeCloseTo(
        full.annual[year].adjustedEbitda,
        10,
      );
      expect(roundResult.finalYear.netDebt).toBeCloseTo(
        full.annual[year].netDebt,
        10,
      );
      expect(roundResult.finalYear.strategicHealth).toBeCloseTo(
        full.annual[year].strategicHealth,
        10,
      );
      expect(roundResult.finalYear.balanceCheck).toBeCloseTo(0, 8);
    }

    expect(r3.closingState).toEqual(full.annual[2030].closingState);
  });

  it("preserves valuation identities, determinism and R3 intermediate/final equivalence", () => {
    const first = simulateGame(DEFAULT_DECISIONS);
    const second = simulateGame(DEFAULT_DECISIONS);
    const r3 = simulateIntermediateValue(DEFAULT_DECISIONS, 3);

    expect(second).toEqual(first);
    expect(r3).toEqual(first);

    expect(first.valuation.enterpriseValue).toBeCloseTo(
      first.valuation.pvExplicitUfcf + first.terminal.pvTerminalValue,
      10,
    );
    expect(first.valuation.impliedEquityValue).toBeCloseTo(
      first.valuation.enterpriseValue - first.valuation.openingNetDebt,
      10,
    );
    expect(first.valuation.finalGameValue).toBeCloseTo(
      first.valuation.impliedEquityValue -
        first.valuation.pvExpectedDistressCost,
      10,
    );
  });
});
