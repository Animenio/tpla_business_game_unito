import { describe, expect, it } from "vitest";

import { simulateGame } from "./engine";
import {
  DEFAULT_DECISIONS,
  type DecisionSet,
  type RoundNumber,
  type RndOrientation,
  type ResiliencePolicy,
} from "./spec";

const SAMPLE_SIZE = 20_000;
const ROUND_ONLY_SAMPLE_SIZE = 3_000;
const SEED = 20261007;

type NumericKey =
  | "premium_price_positioning"
  | "standard_price_positioning"
  | "marketing_change"
  | "rnd_pct"
  | "capex_pct";

const NUMERIC_KEYS: readonly NumericKey[] = [
  "premium_price_positioning",
  "standard_price_positioning",
  "marketing_change",
  "rnd_pct",
  "capex_pct",
];

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

interface AuditSample {
  fgv: number;
  distress: number;
  finalRevenue: number;
  finalEbitdaMargin: number;
  finalNetDebt: number;
  strategicHealth: number;
  numeric: Record<string, number>;
  categorical: Record<string, string>;
}

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

function copyDefaults(): Record<RoundNumber, DecisionSet> {
  return {
    1: { ...DEFAULT_DECISIONS[1] },
    2: { ...DEFAULT_DECISIONS[2] },
    3: { ...DEFAULT_DECISIONS[3] },
  };
}

function randomRoundDecision(
  rand: () => number,
  round: RoundNumber,
): DecisionSet {
  return {
    premium_price_positioning: pick(
      rand,
      GRID.premium_price_positioning,
    ),
    standard_price_positioning: pick(
      rand,
      GRID.standard_price_positioning,
    ),
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
    1: randomRoundDecision(rand, 1),
    2: randomRoundDecision(rand, 2),
    3: randomRoundDecision(rand, 3),
  };
}

function flatten(
  decisions: Record<RoundNumber, DecisionSet>,
): {
  numeric: Record<string, number>;
  categorical: Record<string, string>;
} {
  const numeric: Record<string, number> = {};
  const categorical: Record<string, string> = {};

  for (const round of [1, 2, 3] as const) {
    for (const key of NUMERIC_KEYS) {
      numeric[`r${round}.${key}`] = decisions[round][key];
    }
    categorical[`r${round}.rnd_orientation`] =
      decisions[round].rnd_orientation;
    categorical[`r${round}.resilience_policy`] =
      decisions[round].resilience_policy;
  }

  return { numeric, categorical };
}

function sampleStrategy(
  decisions: Record<RoundNumber, DecisionSet>,
): AuditSample {
  const game = simulateGame(decisions);
  const final = game.annual[2030];
  const flat = flatten(decisions);

  return {
    fgv: game.valuation.finalGameValue,
    distress: game.valuation.pvExpectedDistressCost,
    finalRevenue: final.totalRevenue,
    finalEbitdaMargin: final.adjustedEbitdaMargin,
    finalNetDebt: final.netDebt,
    strategicHealth: final.strategicHealth,
    numeric: flat.numeric,
    categorical: flat.categorical,
  };
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: readonly number[]): number {
  const avg = mean(values);
  return Math.sqrt(
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) /
      values.length,
  );
}

function quantile(sorted: readonly number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const lower = Math.floor(pos);
  const upper = Math.ceil(pos);
  if (lower === upper) return sorted[lower]!;
  const weight = pos - lower;
  return sorted[lower]! * (1 - weight) + sorted[upper]! * weight;
}

function summarize(values: readonly number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    min: sorted[0],
    p01: quantile(sorted, 0.01),
    p05: quantile(sorted, 0.05),
    p25: quantile(sorted, 0.25),
    median: quantile(sorted, 0.50),
    p75: quantile(sorted, 0.75),
    p95: quantile(sorted, 0.95),
    p99: quantile(sorted, 0.99),
    max: sorted[sorted.length - 1],
    mean: mean(sorted),
    sd: standardDeviation(sorted),
  };
}

function pearson(xs: readonly number[], ys: readonly number[]): number {
  const mx = mean(xs);
  const my = mean(ys);
  let covariance = 0;
  let varianceX = 0;
  let varianceY = 0;

  for (let index = 0; index < xs.length; index += 1) {
    const dx = xs[index]! - mx;
    const dy = ys[index]! - my;
    covariance += dx * dy;
    varianceX += dx * dx;
    varianceY += dy * dy;
  }

  const denominator = Math.sqrt(varianceX * varianceY);
  return denominator === 0 ? 0 : covariance / denominator;
}

function numericCorrelationReport(samples: readonly AuditSample[]) {
  const fgv = samples.map((sample) => sample.fgv);
  const keys = Object.keys(samples[0]!.numeric);

  return keys
    .map((key) => ({
      key,
      correlation: pearson(
        samples.map((sample) => sample.numeric[key]!),
        fgv,
      ),
    }))
    .sort(
      (left, right) =>
        Math.abs(right.correlation) - Math.abs(left.correlation),
    );
}

function categoricalMeanReport(samples: readonly AuditSample[]) {
  const keys = Object.keys(samples[0]!.categorical);
  const report: Record<string, Record<string, { n: number; meanFgv: number }>> =
    {};

  for (const key of keys) {
    const groups = new Map<string, number[]>();
    for (const sample of samples) {
      const category = sample.categorical[key]!;
      const values = groups.get(category) ?? [];
      values.push(sample.fgv);
      groups.set(category, values);
    }

    report[key] = Object.fromEntries(
      [...groups.entries()].map(([category, values]) => [
        category,
        { n: values.length, meanFgv: mean(values) },
      ]),
    );
  }

  return report;
}

function quantileCohort(
  samples: readonly AuditSample[],
  fraction: number,
  fromTop: boolean,
): AuditSample[] {
  const sorted = [...samples].sort((a, b) => a.fgv - b.fgv);
  const count = Math.max(1, Math.floor(sorted.length * fraction));
  return fromTop ? sorted.slice(-count) : sorted.slice(0, count);
}

function cohortSummary(samples: readonly AuditSample[]) {
  const numericKeys = Object.keys(samples[0]!.numeric);
  const categoricalKeys = Object.keys(samples[0]!.categorical);

  const numericMean = Object.fromEntries(
    numericKeys.map((key) => [
      key,
      mean(samples.map((sample) => sample.numeric[key]!)),
    ]),
  );

  const categoricalShare: Record<string, Record<string, number>> = {};
  for (const key of categoricalKeys) {
    const counts = new Map<string, number>();
    for (const sample of samples) {
      const value = sample.categorical[key]!;
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    categoricalShare[key] = Object.fromEntries(
      [...counts.entries()].map(([value, count]) => [
        value,
        count / samples.length,
      ]),
    );
  }

  return {
    n: samples.length,
    fgv: summarize(samples.map((sample) => sample.fgv)),
    numericMean,
    categoricalShare,
  };
}

function boundaryConcentration(samples: readonly AuditSample[]) {
  const report: Record<
    string,
    { min: number; max: number; shareAtMin: number; shareAtMax: number }
  > = {};

  for (const round of [1, 2, 3] as const) {
    for (const key of NUMERIC_KEYS) {
      const values = GRID[key];
      const minValue = values[0]!;
      const maxValue = values[values.length - 1]!;
      const flatKey = `r${round}.${key}`;
      let minCount = 0;
      let maxCount = 0;

      for (const sample of samples) {
        const value = sample.numeric[flatKey]!;
        if (Math.abs(value - minValue) < 1e-12) minCount += 1;
        if (Math.abs(value - maxValue) < 1e-12) maxCount += 1;
      }

      report[flatKey] = {
        min: minValue,
        max: maxValue,
        shareAtMin: minCount / samples.length,
        shareAtMax: maxCount / samples.length,
      };
    }
  }

  return report;
}

function setNumeric(
  decisions: Record<RoundNumber, DecisionSet>,
  round: RoundNumber,
  key: NumericKey,
  value: number,
): void {
  (
    decisions[round] as unknown as Record<string, number | string>
  )[key] = value;
}

function oneAtATimeNumeric() {
  const report: Record<
    string,
    {
      baselineValue: number;
      bestValue: number;
      bestFgv: number;
      worstValue: number;
      worstFgv: number;
      span: number;
    }
  > = {};

  for (const round of [1, 2, 3] as const) {
    for (const key of NUMERIC_KEYS) {
      const observations = GRID[key].map((value) => {
        const decisions = copyDefaults();
        setNumeric(decisions, round, key, value);
        return {
          value,
          fgv: simulateGame(decisions).valuation.finalGameValue,
        };
      });

      const best = observations.reduce((a, b) => (b.fgv > a.fgv ? b : a));
      const worst = observations.reduce((a, b) => (b.fgv < a.fgv ? b : a));

      report[`r${round}.${key}`] = {
        baselineValue: DEFAULT_DECISIONS[round][key],
        bestValue: best.value,
        bestFgv: best.fgv,
        worstValue: worst.value,
        worstFgv: worst.fgv,
        span: best.fgv - worst.fgv,
      };
    }
  }

  return report;
}

function oneAtATimeCategories() {
  const report: Record<string, Record<string, number>> = {};

  for (const round of [1, 2, 3] as const) {
    report[`r${round}.rnd_orientation`] = Object.fromEntries(
      ORIENTATIONS[round].map((orientation) => {
        const decisions = copyDefaults();
        decisions[round].rnd_orientation = orientation;
        return [
          orientation,
          simulateGame(decisions).valuation.finalGameValue,
        ];
      }),
    );

    report[`r${round}.resilience_policy`] = Object.fromEntries(
      RESILIENCE.map((resilience) => {
        const decisions = copyDefaults();
        decisions[round].resilience_policy = resilience;
        return [
          resilience,
          simulateGame(decisions).valuation.finalGameValue,
        ];
      }),
    );
  }

  return report;
}

function roundOnlyDispersion() {
  const report: Record<
    string,
    ReturnType<typeof summarize> & { p95MinusP05: number }
  > = {};

  for (const round of [1, 2, 3] as const) {
    const rand = mulberry32(SEED + round * 1000);
    const values: number[] = [];

    for (let index = 0; index < ROUND_ONLY_SAMPLE_SIZE; index += 1) {
      const decisions = copyDefaults();
      decisions[round] = randomRoundDecision(rand, round);
      values.push(simulateGame(decisions).valuation.finalGameValue);
    }

    const summary = summarize(values);
    report[`round${round}`] = {
      ...summary,
      p95MinusP05: summary.p95 - summary.p05,
    };
  }

  return report;
}

function topBoundaryFlags(
  boundary: ReturnType<typeof boundaryConcentration>,
) {
  return Object.entries(boundary)
    .filter(
      ([, values]) =>
        values.shareAtMin >= 0.50 || values.shareAtMax >= 0.50,
    )
    .map(([key, values]) => ({
      key,
      dominantBoundary:
        values.shareAtMax >= values.shareAtMin ? "max" : "min",
      share: Math.max(values.shareAtMin, values.shareAtMax),
    }))
    .sort((a, b) => b.share - a.share);
}

describe("v0.5.2 quantitative game-balance audit", () => {
  it(
    "samples the admissible strategy space and emits a deterministic audit report",
    () => {
      const rand = mulberry32(SEED);
      const samples: AuditSample[] = [];

      for (let index = 0; index < SAMPLE_SIZE; index += 1) {
        samples.push(sampleStrategy(randomStrategy(rand)));
      }

      const defaultGame = simulateGame(copyDefaults());
      const fgv = samples.map((sample) => sample.fgv);
      const top1 = quantileCohort(samples, 0.01, true);
      const bottom1 = quantileCohort(samples, 0.01, false);
      const top5 = quantileCohort(samples, 0.05, true);
      const boundary = boundaryConcentration(top1);

      const report = {
        meta: {
          model: defaultGame.modelVersion,
          seed: SEED,
          sampleSize: SAMPLE_SIZE,
          roundOnlySampleSize: ROUND_ONLY_SAMPLE_SIZE,
        },
        anchors: {
          defaultFgv: defaultGame.valuation.finalGameValue,
          defaultDistress: defaultGame.valuation.pvExpectedDistressCost,
        },
        randomSpace: {
          fgv: summarize(fgv),
          distressFrequency:
            samples.filter((sample) => sample.distress > 1e-9).length /
            samples.length,
          negativeFinalNetDebtFrequency:
            samples.filter((sample) => sample.finalNetDebt < 0).length /
            samples.length,
          finalRevenue: summarize(
            samples.map((sample) => sample.finalRevenue),
          ),
          finalEbitdaMargin: summarize(
            samples.map((sample) => sample.finalEbitdaMargin),
          ),
          strategicHealth: summarize(
            samples.map((sample) => sample.strategicHealth),
          ),
        },
        correlations: numericCorrelationReport(samples),
        categoricalMeans: categoricalMeanReport(samples),
        top1: cohortSummary(top1),
        top5: cohortSummary(top5),
        bottom1: cohortSummary(bottom1),
        top1BoundaryConcentration: boundary,
        topBoundaryFlags: topBoundaryFlags(boundary),
        oneAtATimeNumeric: oneAtATimeNumeric(),
        oneAtATimeCategories: oneAtATimeCategories(),
        roundOnlyDispersion: roundOnlyDispersion(),
      };

      expect(samples).toHaveLength(SAMPLE_SIZE);
      expect(fgv.every(Number.isFinite)).toBe(true);
      expect(defaultGame.valuation.finalGameValue).toBeCloseTo(
        13103.4989267348,
        8,
      );

      console.log("BALANCE_META=" + JSON.stringify(report.meta));
      console.log("BALANCE_ANCHORS=" + JSON.stringify(report.anchors));
      console.log("BALANCE_RANDOM_SPACE=" + JSON.stringify(report.randomSpace));
      console.log("BALANCE_CORRELATIONS=" + JSON.stringify(report.correlations));
      console.log("BALANCE_CATEGORY_MEANS=" + JSON.stringify(report.categoricalMeans));
      console.log("BALANCE_TOP1=" + JSON.stringify(report.top1));
      console.log("BALANCE_TOP5=" + JSON.stringify(report.top5));
      console.log("BALANCE_BOTTOM1=" + JSON.stringify(report.bottom1));
      console.log("BALANCE_TOP_BOUNDARY_FLAGS=" + JSON.stringify(report.topBoundaryFlags));
      console.log("BALANCE_OAT_NUMERIC=" + JSON.stringify(report.oneAtATimeNumeric));
      console.log("BALANCE_OAT_CATEGORIES=" + JSON.stringify(report.oneAtATimeCategories));
      console.log("BALANCE_ROUND_DISPERSION=" + JSON.stringify(report.roundOnlyDispersion));
    },
    60_000,
  );
});
