import {
  createOpeningState as createV04OpeningState,
  simulateGame as simulateV04Game,
  simulateRound as simulateV04Round,
  type OpeningState as V04OpeningState,
  type RoundResult as V04RoundResult,
} from "@/src/domain/simulation/v04/engine";
import {
  MODEL_VERSION as V04_MODEL_VERSION,
  type DecisionSet as V04DecisionSet,
  type RoundNumber,
} from "@/src/domain/simulation/v04/spec";
import {
  createOpeningState as createV05OpeningState,
  simulateGame as simulateV05Game,
  simulateRound as simulateV05Round,
  type ModelState as V05OpeningState,
  type RoundSimulationResult as V05RoundResult,
} from "@/src/domain/simulation/v05/engine";
import { MODEL_VERSION as V05_MODEL_VERSION } from "@/src/domain/simulation/v05/spec";
import {
  decisionFromStoredRow,
  type StoredDecisionRow,
} from "@/src/domain/simulation/v05/storage";

export type SessionOpeningState =
  | V04OpeningState
  | V05OpeningState;

export type SessionRoundRawResult =
  | V04RoundResult
  | V05RoundResult;

export interface NormalizedRoundResult {
  modelVersion: string;
  rawResult: SessionRoundRawResult;
  closingState: SessionOpeningState;
  totalRevenue: number;
  adjustedEbitdaMargin: number;
  unleveredFreeCashFlow: number;
  netDebt: number;
  premiumRevenueShare: number;
  strategicHealth: number;
}

export interface NormalizedGameResult {
  modelVersion: string;
  rawResult: unknown;
  finalGameValue: number;
  enterpriseValue: number;
  impliedEquityValue: number;
  riskPenalty: number;
  pvExplicitUfcf: number;
  pvTerminalValue: number;
  cumulativeUfcf: number;
  finalRevenue: number;
  finalEbitdaMargin: number;
  finalPremiumShare: number;
  finalNetDebt: number;
  competitivePosition: number;
  strategicHealth: number;
}

export function usesV05(modelVersion: string): boolean {
  if (modelVersion === V05_MODEL_VERSION) {
    return true;
  }
  if (modelVersion === V04_MODEL_VERSION) {
    return false;
  }
  throw new Error(`UNSUPPORTED_MODEL_VERSION:${modelVersion}`);
}

function v04Decision(row: StoredDecisionRow): V04DecisionSet {
  return {
    hv_price_change: Number(row.hv_price_change),
    std_price_change: Number(row.std_price_change),
    marketing_change: Number(row.marketing_change),
    rnd_pct: Number(row.rnd_pct),
    capex_pct: Number(row.capex_pct),
    inventory_days: Number(row.inventory_days),
    receivable_days: Number(row.receivable_days),
    natural_rubber_hedge: Number(row.natural_rubber_hedge),
    connected_rnd_allocation: Number(row.connected_rnd_allocation),
  };
}

export function createSessionOpeningState(
  modelVersion: string,
): SessionOpeningState {
  return usesV05(modelVersion)
    ? createV05OpeningState()
    : createV04OpeningState();
}

export function simulateSessionRound(
  modelVersion: string,
  openingState: SessionOpeningState,
  row: StoredDecisionRow,
  round: RoundNumber,
): NormalizedRoundResult {
  if (usesV05(modelVersion)) {
    const result = simulateV05Round(
      openingState as V05OpeningState,
      decisionFromStoredRow(row, round),
      round,
    );
    const annual = result.finalYear;

    return {
      modelVersion: result.modelVersion,
      rawResult: result,
      closingState: result.closingState,
      totalRevenue: annual.totalRevenue,
      adjustedEbitdaMargin: annual.adjustedEbitdaMargin,
      unleveredFreeCashFlow: annual.unleveredFreeCashFlow,
      netDebt: annual.netDebt,
      premiumRevenueShare: annual.premiumRevenueShare,
      strategicHealth: annual.strategicHealth,
    };
  }

  const result = simulateV04Round(
    openingState as V04OpeningState,
    v04Decision(row),
    round,
  );

  return {
    modelVersion: result.modelVersion,
    rawResult: result,
    closingState: result.closingState,
    totalRevenue: result.operating.totalRevenue,
    adjustedEbitdaMargin:
      result.operating.adjustedEbitdaMargin,
    unleveredFreeCashFlow:
      result.financial.unleveredFreeCashFlow,
    netDebt: result.financial.netDebt,
    premiumRevenueShare:
      result.operating.premiumRevenueShare,
    strategicHealth: result.operating.strategicHealth,
  };
}

export function simulateSessionGame(
  modelVersion: string,
  rowsByRound: Record<RoundNumber, StoredDecisionRow>,
): NormalizedGameResult {
  if (usesV05(modelVersion)) {
    const decisions = {
      1: decisionFromStoredRow(rowsByRound[1], 1),
      2: decisionFromStoredRow(rowsByRound[2], 2),
      3: decisionFromStoredRow(rowsByRound[3], 3),
    } as const;
    const game = simulateV05Game(decisions);
    const final = game.annual[2030];
    const cumulativeUfcf =
      game.annual[2026].unleveredFreeCashFlow +
      game.annual[2027].unleveredFreeCashFlow +
      game.annual[2028].unleveredFreeCashFlow +
      game.annual[2029].unleveredFreeCashFlow +
      game.annual[2030].unleveredFreeCashFlow;

    return {
      modelVersion: game.modelVersion,
      rawResult: game,
      finalGameValue: game.valuation.finalGameValue,
      enterpriseValue: game.valuation.enterpriseValue,
      impliedEquityValue:
        game.valuation.impliedEquityValue,
      riskPenalty:
        game.valuation.pvExpectedDistressCost,
      pvExplicitUfcf: game.valuation.pvExplicitUfcf,
      pvTerminalValue: game.terminal.pvTerminalValue,
      cumulativeUfcf,
      finalRevenue: final.totalRevenue,
      finalEbitdaMargin: final.adjustedEbitdaMargin,
      finalPremiumShare: final.premiumRevenueShare,
      finalNetDebt: final.netDebt,
      competitivePosition: final.competitivePosition,
      strategicHealth: final.strategicHealth,
    };
  }

  const decisions = {
    1: v04Decision(rowsByRound[1]),
    2: v04Decision(rowsByRound[2]),
    3: v04Decision(rowsByRound[3]),
  } as const;
  const game = simulateV04Game(decisions);
  const cumulativeUfcf =
    game.rounds[1].financial.unleveredFreeCashFlow *
      game.rounds[1].durationYears +
    game.rounds[2].financial.unleveredFreeCashFlow *
      game.rounds[2].durationYears +
    game.rounds[3].financial.unleveredFreeCashFlow *
      game.rounds[3].durationYears;

  return {
    modelVersion: game.modelVersion,
    rawResult: game,
    finalGameValue: game.valuation.finalGameValue,
    enterpriseValue: game.valuation.enterpriseValue,
    impliedEquityValue:
      game.valuation.impliedEquityValue,
    riskPenalty: game.valuation.riskPenalty,
    pvExplicitUfcf: game.valuation.pvExplicitUfcf,
    pvTerminalValue: game.valuation.pvTerminalValue,
    cumulativeUfcf,
    finalRevenue: game.rounds[3].operating.totalRevenue,
    finalEbitdaMargin:
      game.rounds[3].operating.adjustedEbitdaMargin,
    finalPremiumShare:
      game.rounds[3].operating.premiumRevenueShare,
    finalNetDebt: game.rounds[3].financial.netDebt,
    competitivePosition:
      game.rounds[3].operating.competitivePosition,
    strategicHealth:
      game.rounds[3].operating.strategicHealth,
  };
}
