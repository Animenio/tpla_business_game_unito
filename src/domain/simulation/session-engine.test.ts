import { describe, expect, it } from "vitest";

import {
  createSessionOpeningState,
  simulateSessionGame,
  simulateSessionRound,
  usesV05,
} from "./session-engine";
import {
  BALANCED_DECISIONS,
  MODEL_VERSION as V04_MODEL_VERSION,
  type DecisionSet as V04DecisionSet,
  type RoundNumber,
} from "./v04/spec";
import {
  DEFAULT_DECISIONS,
  MODEL_VERSION as V05_MODEL_VERSION,
} from "./v05/spec";
import {
  decisionFromStoredRow,
  decisionToStoredRow,
  type StoredDecisionRow,
} from "./v05/storage";

function v04Stored(row: V04DecisionSet): StoredDecisionRow {
  return {
    hv_price_change: row.hv_price_change,
    std_price_change: row.std_price_change,
    marketing_change: row.marketing_change,
    rnd_pct: row.rnd_pct,
    capex_pct: row.capex_pct,
    inventory_days: row.inventory_days,
    receivable_days: row.receivable_days,
    natural_rubber_hedge: row.natural_rubber_hedge,
    connected_rnd_allocation: row.connected_rnd_allocation,
  };
}

describe("session engine integration", () => {
  it("round-trips every default v0.5.2 decision through the legacy storage adapter", () => {
    for (const round of [1, 2, 3] as const) {
      const stored = decisionToStoredRow(DEFAULT_DECISIONS[round]);
      const restored = decisionFromStoredRow(stored, round);
      expect(restored).toEqual(DEFAULT_DECISIONS[round]);
      expect(stored.receivable_days).toBe(34);
    }
  });

  it("routes the default v0.5.2 session through R1 -> R2 -> R3 and preserves the frozen FGV", () => {
    let state = createSessionOpeningState(V05_MODEL_VERSION);
    let finalRound = null as ReturnType<typeof simulateSessionRound> | null;

    for (const round of [1, 2, 3] as const) {
      const result = simulateSessionRound(
        V05_MODEL_VERSION,
        state,
        decisionToStoredRow(DEFAULT_DECISIONS[round]),
        round,
      );
      expect(result.modelVersion).toBe(V05_MODEL_VERSION);
      expect(result.totalRevenue).toBeGreaterThan(0);
      expect(result.adjustedEbitdaMargin).toBeGreaterThan(0);
      state = result.closingState;
      finalRound = result;
    }

    const rows = {
      1: decisionToStoredRow(DEFAULT_DECISIONS[1]),
      2: decisionToStoredRow(DEFAULT_DECISIONS[2]),
      3: decisionToStoredRow(DEFAULT_DECISIONS[3]),
    } satisfies Record<RoundNumber, StoredDecisionRow>;

    const game = simulateSessionGame(V05_MODEL_VERSION, rows);

    expect(game.modelVersion).toBe(V05_MODEL_VERSION);
    expect(game.finalGameValue).toBeCloseTo(13103.4989267348, 8);
    expect(game.finalRevenue).toBeCloseTo(
      finalRound!.totalRevenue,
      8,
    );
    expect(game.finalNetDebt).toBeCloseTo(
      finalRound!.netDebt,
      8,
    );
    expect(game.strategicHealth).toBeCloseTo(
      finalRound!.strategicHealth,
      10,
    );
  });

  it("keeps the legacy v0.4 routing frozen", () => {
    const rows = {
      1: v04Stored(BALANCED_DECISIONS[1]),
      2: v04Stored(BALANCED_DECISIONS[2]),
      3: v04Stored(BALANCED_DECISIONS[3]),
    } satisfies Record<RoundNumber, StoredDecisionRow>;

    const game = simulateSessionGame(V04_MODEL_VERSION, rows);

    expect(game.modelVersion).toBe(V04_MODEL_VERSION);
    expect(game.finalGameValue).toBeCloseTo(
      8541.720849945874,
      8,
    );
  });

  it("fails closed on an unknown model version instead of silently using v0.4", () => {
    expect(usesV05(V05_MODEL_VERSION)).toBe(true);
    expect(usesV05(V04_MODEL_VERSION)).toBe(false);
    expect(() => usesV05("aurora-tyres-v0.5.3")).toThrow(
      "UNSUPPORTED_MODEL_VERSION:aurora-tyres-v0.5.3",
    );
  });
});
