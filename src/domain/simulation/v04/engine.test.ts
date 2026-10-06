import { describe, expect, it } from "vitest";

import { simulateGame } from "./engine";
import {
  BALANCED_ENGINE_REFERENCE,
  BALANCED_FINANCIAL_REFERENCE,
} from "./reference-balanced";
import { BALANCED_DECISIONS } from "./spec";

const INDEX_DIGITS = 9;
const MONEY_DIGITS = 6;

describe("Aurora Tyres World Model v0.4 parity", () => {
  it("reproduces the workbook Balanced reference scenario", () => {
    const result = simulateGame(BALANCED_DECISIONS);

    for (const round of [1, 2, 3] as const) {
      const operating = result.rounds[round].operating;
      const expected = BALANCED_ENGINE_REFERENCE[round];

      expect(operating.totalRevenue).toBeCloseTo(
        expected.total_revenue,
        MONEY_DIGITS,
      );
      expect(operating.adjustedEbitdaMargin).toBeCloseTo(
        expected.adjusted_ebitda_margin,
        INDEX_DIGITS,
      );
      expect(operating.adjustedEbitMargin).toBeCloseTo(
        expected.adjusted_ebit_margin,
        INDEX_DIGITS,
      );
      expect(operating.premiumRevenueShare).toBeCloseTo(
        expected.premium_revenue_share,
        INDEX_DIGITS,
      );
      expect(operating.innovationStock).toBeCloseTo(
        expected.innovation_stock,
        INDEX_DIGITS,
      );
      expect(operating.brandStrength).toBeCloseTo(
        expected.brand_strength,
        INDEX_DIGITS,
      );
      expect(operating.digitalReadiness).toBeCloseTo(
        expected.digital_readiness,
        INDEX_DIGITS,
      );
      expect(operating.assetHealth).toBeCloseTo(
        expected.asset_health,
        INDEX_DIGITS,
      );
      expect(operating.competitivePosition).toBeCloseTo(
        expected.competitive_position,
        INDEX_DIGITS,
      );
      expect(operating.strategicHealth).toBeCloseTo(
        expected.strategic_health,
        INDEX_DIGITS,
      );
      expect(operating.serviceFulfilmentFactor).toBeCloseTo(
        expected.service_fulfilment_factor,
        INDEX_DIGITS,
      );

      const financial = result.rounds[round].financial;
      const expectedFinancial =
        BALANCED_FINANCIAL_REFERENCE.rounds[round];

      expect(financial.unleveredFreeCashFlow).toBeCloseTo(
        expectedFinancial.ufcf,
        MONEY_DIGITS,
      );
      expect(financial.netDebt).toBeCloseTo(
        expectedFinancial.net_debt,
        MONEY_DIGITS,
      );
      expect(financial.pvOfPhaseUfcf).toBeCloseTo(
        expectedFinancial.pv_ufcf,
        MONEY_DIGITS,
      );
    }

    expect(result.terminal.normalizedEbitMargin).toBeCloseTo(
      BALANCED_FINANCIAL_REFERENCE.terminal.normalized_ebit_margin,
      INDEX_DIGITS,
    );
    expect(result.terminal.growth).toBeCloseTo(
      BALANCED_FINANCIAL_REFERENCE.terminal.growth,
      INDEX_DIGITS,
    );
    expect(result.terminal.terminalValue).toBeCloseTo(
      BALANCED_FINANCIAL_REFERENCE.terminal.terminal_value,
      MONEY_DIGITS,
    );
    expect(result.terminal.pvTerminalValue).toBeCloseTo(
      BALANCED_FINANCIAL_REFERENCE.terminal.pv_terminal_value,
      MONEY_DIGITS,
    );

    expect(result.valuation.pvExplicitUfcf).toBeCloseTo(
      BALANCED_FINANCIAL_REFERENCE.final.pv_explicit_ufcf,
      MONEY_DIGITS,
    );
    expect(result.valuation.enterpriseValue).toBeCloseTo(
      BALANCED_FINANCIAL_REFERENCE.final.enterprise_value,
      MONEY_DIGITS,
    );
    expect(result.valuation.impliedEquityValue).toBeCloseTo(
      BALANCED_FINANCIAL_REFERENCE.final.implied_equity_value,
      MONEY_DIGITS,
    );
    expect(result.valuation.riskPenalty).toBeCloseTo(
      BALANCED_FINANCIAL_REFERENCE.final.risk_penalty,
      MONEY_DIGITS,
    );
    expect(result.valuation.finalGameValue).toBeCloseTo(
      BALANCED_FINANCIAL_REFERENCE.final.final_game_value,
      MONEY_DIGITS,
    );
  });
});
