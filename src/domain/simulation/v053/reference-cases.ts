import type { DecisionSet, RoundNumber } from "./spec";

function same(decision: DecisionSet): Record<RoundNumber, DecisionSet> {
  return { 1: { ...decision }, 2: { ...decision }, 3: { ...decision } };
}

export interface ReferenceCase {
  name: string;
  decisions: Record<RoundNumber, DecisionSet>;
  expectedFgv: number;
}

export const REFERENCE_CASES: readonly ReferenceCase[] = [
  {
    name: "Segue il mercato (riferimento)",
    decisions: {
      1: { premium_price_positioning: 0, standard_price_positioning: 0, marketing_change: 0, rnd_pct: 0.045, rnd_orientation: "Bilanciato", capex_pct: 0.065, resilience_policy: "Standard" },
      2: { premium_price_positioning: 0, standard_price_positioning: 0, marketing_change: 0.15, rnd_pct: 0.055, rnd_orientation: "Bilanciato", capex_pct: 0.070, resilience_policy: "Robusta" },
      3: { premium_price_positioning: 0, standard_price_positioning: 0, marketing_change: 0.10, rnd_pct: 0.060, rnd_orientation: "Connected", capex_pct: 0.070, resilience_policy: "Standard" },
    },
    expectedFgv: 13281.852539946707,
  },
  {
    name: "Premium Innovator",
    decisions: {
      1: { premium_price_positioning: 0.02, standard_price_positioning: 0, marketing_change: 0.30, rnd_pct: 0.070, rnd_orientation: "Bilanciato", capex_pct: 0.080, resilience_policy: "Standard" },
      2: { premium_price_positioning: 0.02, standard_price_positioning: 0, marketing_change: 0.30, rnd_pct: 0.070, rnd_orientation: "Connected", capex_pct: 0.080, resilience_policy: "Robusta" },
      3: { premium_price_positioning: 0.02, standard_price_positioning: 0, marketing_change: 0.30, rnd_pct: 0.070, rnd_orientation: "Connected", capex_pct: 0.080, resilience_policy: "Standard" },
    },
    expectedFgv: 12895.679489483638,
  },
  {
    name: "Cost Defender",
    decisions: same({ premium_price_positioning: 0, standard_price_positioning: 0, marketing_change: -0.30, rnd_pct: 0.030, rnd_orientation: "Core", capex_pct: 0.050, resilience_policy: "Snella" }),
    expectedFgv: 11986.256227695314,
  },
  {
    name: "Volume Player",
    decisions: same({ premium_price_positioning: -0.05, standard_price_positioning: -0.05, marketing_change: 0.50, rnd_pct: 0.045, rnd_orientation: "Bilanciato", capex_pct: 0.090, resilience_policy: "Standard" }),
    expectedFgv: 11834.422136621548,
  },
  {
    name: "Cash Maximizer",
    decisions: same({ premium_price_positioning: 0.05, standard_price_positioning: 0.05, marketing_change: -0.50, rnd_pct: 0.025, rnd_orientation: "Core", capex_pct: 0.035, resilience_policy: "Snella" }),
    expectedFgv: 11143.455647712193,
  },
  {
    name: "Overinvestor",
    decisions: {
      1: { premium_price_positioning: 0, standard_price_positioning: 0, marketing_change: 1, rnd_pct: 0.080, rnd_orientation: "Bilanciato", capex_pct: 0.10, resilience_policy: "Robusta" },
      2: { premium_price_positioning: 0, standard_price_positioning: 0, marketing_change: 1, rnd_pct: 0.080, rnd_orientation: "Connected", capex_pct: 0.10, resilience_policy: "Robusta" },
      3: { premium_price_positioning: 0, standard_price_positioning: 0, marketing_change: 1, rnd_pct: 0.080, rnd_orientation: "Connected", capex_pct: 0.10, resilience_policy: "Robusta" },
    },
    expectedFgv: 11099.517381119918,
  },
  {
    name: "Resilient Hedger",
    decisions: same({ premium_price_positioning: 0, standard_price_positioning: 0, marketing_change: 0, rnd_pct: 0.050, rnd_orientation: "Bilanciato", capex_pct: 0.070, resilience_policy: "Robusta" }),
    expectedFgv: 13176.373602046551,
  },
  {
    name: "Harvester",
    decisions: same({ premium_price_positioning: 0.08, standard_price_positioning: 0.10, marketing_change: -0.20, rnd_pct: 0.040, rnd_orientation: "Core", capex_pct: 0.060, resilience_policy: "Standard" }),
    expectedFgv: 12161.088772501229,
  },
  {
    name: "Tech all-in",
    decisions: {
      1: { premium_price_positioning: 0.02, standard_price_positioning: 0, marketing_change: 0, rnd_pct: 0.080, rnd_orientation: "Bilanciato", capex_pct: 0.060, resilience_policy: "Standard" },
      2: { premium_price_positioning: 0.02, standard_price_positioning: 0, marketing_change: 0, rnd_pct: 0.080, rnd_orientation: "Connected", capex_pct: 0.060, resilience_policy: "Standard" },
      3: { premium_price_positioning: 0.02, standard_price_positioning: 0, marketing_change: 0, rnd_pct: 0.080, rnd_orientation: "Connected", capex_pct: 0.060, resilience_policy: "Standard" },
    },
    expectedFgv: 12968.286520918016,
  },
  {
    name: "Status quo",
    decisions: same({ premium_price_positioning: 0, standard_price_positioning: 0, marketing_change: 0, rnd_pct: 0.045, rnd_orientation: "Bilanciato", capex_pct: 0.060, resilience_policy: "Standard" }),
    expectedFgv: 13018.853736269855,
  },
  {
    name: "Estremo: tutto al minimo",
    decisions: same({ premium_price_positioning: -0.10, standard_price_positioning: -0.10, marketing_change: -0.50, rnd_pct: 0.020, rnd_orientation: "Core", capex_pct: 0.030, resilience_policy: "Snella" }),
    expectedFgv: 10123.229009361305,
  },
  {
    name: "Estremo: tutto al massimo",
    decisions: {
      1: { premium_price_positioning: 0.10, standard_price_positioning: 0.10, marketing_change: 1.0, rnd_pct: 0.080, rnd_orientation: "Bilanciato", capex_pct: 0.10, resilience_policy: "Robusta" },
      2: { premium_price_positioning: 0.10, standard_price_positioning: 0.10, marketing_change: 1.0, rnd_pct: 0.080, rnd_orientation: "Connected", capex_pct: 0.10, resilience_policy: "Robusta" },
      3: { premium_price_positioning: 0.10, standard_price_positioning: 0.10, marketing_change: 1.0, rnd_pct: 0.080, rnd_orientation: "Connected", capex_pct: 0.10, resilience_policy: "Robusta" },
    },
    expectedFgv: 12111.04908204095,
  },
] as const;
