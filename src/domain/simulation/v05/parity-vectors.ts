import type {
  DecisionSet,
  RoundNumber,
  RndOrientation,
  ResiliencePolicy,
} from "./spec";

export interface ParityCase {
  name: string;
  decisions: Record<RoundNumber, DecisionSet>;
  expectedFgv: number;
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

const PREM = range(-0.10, 0.10, 0.01);
const STD = range(-0.10, 0.10, 0.01);
const MKT = range(-0.50, 1.00, 0.05);
const RND = range(0.02, 0.08, 0.005);
const CAPEX = range(0.03, 0.10, 0.005);
const RESILIENCE = ["Snella", "Standard", "Robusta"] as const;
const ORIENTATION: Record<RoundNumber, readonly RndOrientation[]> = {
  1: ["Core", "Bilanciato"],
  2: ["Core", "Bilanciato", "Connected"],
  3: ["Core", "Bilanciato", "Connected"],
};

const EXPECTED_RANDOM = [
  12511.5481933871,
  12745.869625726,
  12031.2780660042,
  11076.0358133645,
  12219.2350261416,
  12394.1881569279,
  11721.8949550478,
  12554.2745449933,
  12799.5236418286,
  12637.4231914437,
  13031.3937648087,
  12529.3256564525,
  12108.3244694594,
  11709.1754668269,
  12915.6574016326,
  12858.363861837,
  12904.5835049283,
  11751.2562405714,
  12899.1904268634,
  11031.8099488738,
  12067.1672134271,
  13018.6284330177,
  12447.6528768728,
  13142.9721645627,
  12394.9514356381,
] as const;

function generatedDecisions(
  rand: () => number,
): Record<RoundNumber, DecisionSet> {
  const decisions = {} as Record<RoundNumber, DecisionSet>;
  for (const round of [1, 2, 3] as const) {
    decisions[round] = {
      premium_price_positioning: pick(rand, PREM),
      standard_price_positioning: pick(rand, STD),
      marketing_change: pick(rand, MKT),
      rnd_pct: pick(rand, RND),
      rnd_orientation: pick(rand, ORIENTATION[round]),
      capex_pct: pick(rand, CAPEX),
      resilience_policy: pick(rand, RESILIENCE) as ResiliencePolicy,
    };
  }
  return decisions;
}

const rand = mulberry32(20261007);
const randomCases: ParityCase[] = EXPECTED_RANDOM.map(
  (expectedFgv, index) => ({
    name: `mulberry32 #${index + 1}`,
    decisions: generatedDecisions(rand),
    expectedFgv,
  }),
);

const allMin: Record<RoundNumber, DecisionSet> = {
  1: {
    premium_price_positioning: -0.10,
    standard_price_positioning: -0.10,
    marketing_change: -0.50,
    rnd_pct: 0.02,
    rnd_orientation: "Core",
    capex_pct: 0.03,
    resilience_policy: "Snella",
  },
  2: {
    premium_price_positioning: -0.10,
    standard_price_positioning: -0.10,
    marketing_change: -0.50,
    rnd_pct: 0.02,
    rnd_orientation: "Core",
    capex_pct: 0.03,
    resilience_policy: "Snella",
  },
  3: {
    premium_price_positioning: -0.10,
    standard_price_positioning: -0.10,
    marketing_change: -0.50,
    rnd_pct: 0.02,
    rnd_orientation: "Core",
    capex_pct: 0.03,
    resilience_policy: "Snella",
  },
};

const allMax: Record<RoundNumber, DecisionSet> = {
  1: {
    premium_price_positioning: 0.10,
    standard_price_positioning: 0.10,
    marketing_change: 1.00,
    rnd_pct: 0.08,
    rnd_orientation: "Bilanciato",
    capex_pct: 0.10,
    resilience_policy: "Robusta",
  },
  2: {
    premium_price_positioning: 0.10,
    standard_price_positioning: 0.10,
    marketing_change: 1.00,
    rnd_pct: 0.08,
    rnd_orientation: "Connected",
    capex_pct: 0.10,
    resilience_policy: "Robusta",
  },
  3: {
    premium_price_positioning: 0.10,
    standard_price_positioning: 0.10,
    marketing_change: 1.00,
    rnd_pct: 0.08,
    rnd_orientation: "Connected",
    capex_pct: 0.10,
    resilience_policy: "Robusta",
  },
};

export const PARITY_CASES: readonly ParityCase[] = [
  ...randomCases,
  {
    name: "tutto al minimo",
    decisions: allMin,
    expectedFgv: 9813.42573191823,
  },
  {
    name: "tutto al massimo",
    decisions: allMax,
    expectedFgv: 12150.4644857507,
  },
];

export const PARITY_TOLERANCE_EUR_M = 1e-6;
