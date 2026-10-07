import { describe, expect, it } from "vitest";

import {
  decisionFromStoredRow,
  decisionToStoredRow,
} from "../v05/storage";
import {
  createOpeningState,
  simulateGame,
  simulateIntermediateValue,
  simulateRound,
} from "./engine";
import { REFERENCE_CASES } from "./reference-cases";
import {
  DEFAULT_DECISIONS,
  type DecisionSet,
  type ModelYear,
} from "./spec";
import { validateDecisionSet } from "./validation";

describe("Aurora Tyres v0.5.3 RC1 invariants", () => {
  it("keeps all frozen reference cases numerically and accounting sane", () => {
    for (const testCase of REFERENCE_CASES) {
      const game = simulateGame(testCase.decisions);

      expect(Number.isFinite(game.valuation.finalGameValue)).toBe(true);
      expect(game.valuation.finalGameValue).toBeGreaterThan(0);
      expect(game.terminal.terminalValue).toBeGreaterThan(0);
      expect(game.valuation.pvExpectedDistressCost).toBeGreaterThanOrEqual(0);

      for (const year of [
        2026,
        2027,
        2028,
        2029,
        2030,
        2031,
      ] as const satisfies readonly ModelYear[]) {
        const annual = game.annual[year];

        expect(Number.isFinite(annual.totalRevenue)).toBe(true);
        expect(Number.isFinite(annual.adjustedEbitda)).toBe(true);
        expect(Number.isFinite(annual.netDebt)).toBe(true);
        expect(annual.totalRevenue).toBeGreaterThan(0);
        expect(annual.serviceFactor).toBeGreaterThan(0);
        expect(annual.serviceFactor).toBeLessThanOrEqual(1 + 1e-12);
        expect(annual.stockAvailability).toBeGreaterThanOrEqual(0.8 - 1e-12);
        expect(annual.stockAvailability).toBeLessThanOrEqual(1 + 1e-12);
        expect(annual.assetReliability).toBeGreaterThanOrEqual(0.88 - 1e-12);
        expect(annual.assetReliability).toBeLessThanOrEqual(1 + 1e-12);
        expect(annual.fixedAssets).toBeGreaterThan(0);
        expect(annual.equity).toBeGreaterThan(0);
        expect(Math.abs(annual.balanceCheck)).toBeLessThan(1e-8);
      }
    }
  });

  it("keeps round-by-round execution identical to the full default annual path", () => {
    let state = createOpeningState();

    const r1 = simulateRound(state, DEFAULT_DECISIONS[1], 1);
    state = r1.closingState;
    const r2 = simulateRound(state, DEFAULT_DECISIONS[2], 2);
    state = r2.closingState;
    const r3 = simulateRound(state, DEFAULT_DECISIONS[3], 3);

    const full = simulateGame(DEFAULT_DECISIONS);

    expect(r1.finalYear).toEqual(full.annual[2026]);
    expect(r2.finalYear).toEqual(full.annual[2028]);
    expect(r3.finalYear).toEqual(full.annual[2030]);
    expect(r3.closingState).toEqual(full.annual[2030].closingState);
    expect(simulateIntermediateValue(DEFAULT_DECISIONS, 3)).toEqual(full);
  });

  it("preserves the valuation bridge identities exactly within floating tolerance", () => {
    const game = simulateGame(DEFAULT_DECISIONS);

    expect(game.valuation.enterpriseValue).toBeCloseTo(
      game.valuation.pvExplicitUfcf + game.terminal.pvTerminalValue,
      10,
    );
    expect(game.valuation.impliedEquityValue).toBeCloseTo(
      game.valuation.enterpriseValue - game.valuation.openingNetDebt,
      10,
    );
    expect(game.valuation.finalGameValue).toBeCloseTo(
      game.valuation.impliedEquityValue -
        game.valuation.pvExpectedDistressCost,
      10,
    );
  });

  it("round-trips the RC decision architecture through the existing storage adapter", () => {
    for (const round of [1, 2, 3] as const) {
      const stored = decisionToStoredRow(DEFAULT_DECISIONS[round]);
      const restored = decisionFromStoredRow(stored, round);

      expect(restored).toEqual(DEFAULT_DECISIONS[round]);
      expect(stored.receivable_days).toBe(34);
      expect(stored.inventory_days).toBeGreaterThanOrEqual(90);
      expect(stored.inventory_days).toBeLessThanOrEqual(170);
      expect(stored.natural_rubber_hedge).toBeGreaterThanOrEqual(0);
      expect(stored.natural_rubber_hedge).toBeLessThanOrEqual(0.8);
      expect(stored.connected_rnd_allocation).toBeGreaterThanOrEqual(0);
      expect(stored.connected_rnd_allocation).toBeLessThanOrEqual(0.6);
    }
  });

  it("rejects invalid, off-grid and round-incompatible decisions", () => {
    const outOfRange: DecisionSet = {
      ...DEFAULT_DECISIONS[1],
      premium_price_positioning: 0.11,
    };
    const offGrid: DecisionSet = {
      ...DEFAULT_DECISIONS[1],
      rnd_pct: 0.046,
    };
    const invalidCategory = {
      ...DEFAULT_DECISIONS[2],
      resilience_policy: "Fragile",
    } as unknown as DecisionSet;
    const connectedR1: DecisionSet = {
      ...DEFAULT_DECISIONS[1],
      rnd_orientation: "Connected",
    };

    expect(validateDecisionSet(outOfRange, 1).valid).toBe(false);
    expect(validateDecisionSet(offGrid, 1).valid).toBe(false);
    expect(validateDecisionSet(invalidCategory, 2).valid).toBe(false);
    expect(validateDecisionSet(connectedR1, 1).valid).toBe(false);
  });
});
