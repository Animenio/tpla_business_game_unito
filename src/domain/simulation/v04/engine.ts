import {
  BASELINE_2025,
  MODEL_PARAMETERS,
  MODEL_VERSION,
  ROUND_SCENARIOS,
  type DecisionSet,
  type ExternalScenario,
  type ModelVersion,
  type RoundNumber,
} from "./spec";
import { validateDecisionSet } from "./validation";

const LEVERAGE_RISK_PENALTY_PER_YEAR = 124.5;
const SERVICE_RISK_PENALTY_PER_YEAR = 166;
const NET_CASH_YIELD = 0.015;
const DEPRECIATION_PERSISTENCE = 0.85;
const DEPRECIATION_ASSET_LIFE_YEARS = 7;

function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}

function assertValidModelDecision(decisions: DecisionSet): void {
  // The workbook's Round-1 reference R&D value is 4.6%, while the web-app
  // schema declares a 0.5pp UI step. The engine therefore validates model
  // bounds here, while the student UI/API may opt into strict step validation.
  const validation = validateDecisionSet(decisions, { enforceStep: false });

  if (!validation.valid) {
    throw new Error(
      validation.errors
        .map((error) => `${error.key}: ${error.message}`)
        .join("; "),
    );
  }
}

export interface OpeningState {
  premiumPriceIndex: number;
  standardPriceIndex: number;
  marketPremiumPriceIndex: number;
  marketStandardPriceIndex: number;
  innovationStock: number;
  brandStrength: number;
  digitalReadiness: number;
  assetHealth: number;
  premiumDemandVolumeIndex: number;
  standardDemandVolumeIndex: number;
  productionCapacityIndex: number;
  externalPremiumMarketIndex: number;
  externalStandardMarketIndex: number;
  da: number;
  netDebt: number;
  netWorkingCapital: number;
  closingFixedAssetsProxy: number;
  equityFundingProxy: number;
}

export interface OperatingResult {
  premiumPriceIndex: number;
  standardPriceIndex: number;
  marketPremiumPriceIndex: number;
  marketStandardPriceIndex: number;
  premiumRelativePriceGap: number;
  standardRelativePriceGap: number;
  innovationStock: number;
  brandStrength: number;
  digitalReadiness: number;
  assetHealth: number;
  oemQualificationScore: number;
  oemContractDemandEffect: number;
  premiumDemandVolumeIndex: number;
  standardDemandVolumeIndex: number;
  effectiveCapexRatioForCapacity: number;
  productionCapacityIndex: number;
  demandBeforeCapacityConstraint: number;
  requiredSafetyInventoryDays: number;
  serviceFulfilmentFactor: number;
  realizedPremiumVolumeIndex: number;
  realizedStandardVolumeIndex: number;
  externalPremiumMarketIndex: number;
  externalStandardMarketIndex: number;
  relativePremiumMarketShareIndex: number;
  relativeStandardMarketShareIndex: number;
  competitivePosition: number;
  premiumRevenue: number;
  standardRevenue: number;
  totalRevenue: number;
  premiumRevenueShare: number;
  effectiveNaturalRubberCostIndex: number;
  weightedVariableCostInflationIndex: number;
  premiumVariableCost: number;
  standardVariableCost: number;
  marketingExpense: number;
  rndExpense: number;
  fixedOpex: number;
  regulatoryCost: number;
  adjustedEbitda: number;
  adjustedEbitdaMargin: number;
  da: number;
  adjustedEbit: number;
  adjustedEbitMargin: number;
  strategicHealth: number;
}

export interface FinancialResult {
  netFinancialExpense: number;
  profitBeforeTax: number;
  tax: number;
  netIncome: number;
  tradeReceivables: number;
  inventories: number;
  tradePayables: number;
  operatingNwc: number;
  otherWorkingCapital: number;
  netWorkingCapital: number;
  changeInNwc: number;
  capex: number;
  da: number;
  unleveredFreeCashFlow: number;
  leveredCashFlowProxy: number;
  netDebt: number;
  netDebtToEbitda: number;
  openingFixedAssetsProxy: number;
  closingFixedAssetsProxy: number;
  netInvestedCapitalProxy: number;
  provisionsProxy: number;
  equityFundingProxy: number;
  pvWeightOfPhaseUfcf: number;
  pvOfPhaseUfcf: number;
}

export interface RoundResult {
  modelVersion: ModelVersion;
  round: RoundNumber;
  durationYears: 1 | 2;
  decisions: DecisionSet;
  scenario: ExternalScenario;
  openingState: OpeningState;
  operating: OperatingResult;
  financial: FinancialResult;
  closingState: OpeningState;
}

export interface TerminalValuation {
  normalizedEbitMargin: number;
  strategicHealth: number;
  growth: number;
  terminalValue: number;
  pvTerminalValue: number;
}

export interface FinalValuation {
  pvExplicitUfcf: number;
  pvTerminalValue: number;
  enterpriseValue: number;
  openingNetDebt: number;
  impliedEquityValue: number;
  riskPenalty: number;
  finalGameValue: number;
}

export interface GameResult {
  modelVersion: ModelVersion;
  rounds: Record<RoundNumber, RoundResult>;
  terminal: TerminalValuation;
  valuation: FinalValuation;
}

export function createOpeningState(): OpeningState {
  return {
    premiumPriceIndex: 1,
    standardPriceIndex: 1,
    marketPremiumPriceIndex: 1,
    marketStandardPriceIndex: 1,
    innovationStock: 1,
    brandStrength: 1,
    digitalReadiness: 1,
    assetHealth: 1,
    premiumDemandVolumeIndex: 1,
    standardDemandVolumeIndex: 1,
    productionCapacityIndex: BASELINE_2025.production_capacity_index,
    externalPremiumMarketIndex: 1,
    externalStandardMarketIndex: 1,
    da: BASELINE_2025.adjusted_da_proxy,
    netDebt: BASELINE_2025.net_debt,
    netWorkingCapital: BASELINE_2025.net_working_capital,
    closingFixedAssetsProxy:
      BASELINE_2025.fixed_assets_basis +
      BASELINE_2025.capex -
      BASELINE_2025.adjusted_da_proxy,
    equityFundingProxy: BASELINE_2025.equity,
  };
}

function calculateOperating(
  opening: OpeningState,
  decisions: DecisionSet,
  scenario: ExternalScenario,
  round: RoundNumber,
): OperatingResult {
  const p = MODEL_PARAMETERS;
  const duration = scenario.duration_years;

  // 06_MODEL_ENGINE C5:E10
  const premiumPriceIndex =
    opening.premiumPriceIndex * (1 + decisions.hv_price_change);
  const standardPriceIndex =
    opening.standardPriceIndex * (1 + decisions.std_price_change);
  const marketPremiumPriceIndex =
    opening.marketPremiumPriceIndex *
    (1 + scenario.premium_market_price_change);
  const marketStandardPriceIndex =
    opening.marketStandardPriceIndex *
    (1 + scenario.standard_market_price_change);
  const premiumRelativePriceGap =
    premiumPriceIndex / marketPremiumPriceIndex - 1;
  const standardRelativePriceGap =
    standardPriceIndex / marketStandardPriceIndex - 1;

  // 06_MODEL_ENGINE C11:E14
  const innovationStock = clamp(
    0.6,
    1.45,
    opening.innovationStock * p.innovation_decay ** duration +
      (1 - p.innovation_decay ** duration) +
      p.innovation_rnd_coefficient *
        duration *
        (decisions.rnd_pct *
          (1 -
            p.connected_general_rnd_tradeoff *
              decisions.connected_rnd_allocation) -
          BASELINE_2025.rnd_pct *
            (1 -
              p.connected_general_rnd_tradeoff *
                BASELINE_2025.connected_rnd_allocation)),
  );

  const brandStrength = clamp(
    0.65,
    1.4,
    opening.brandStrength * p.brand_decay ** duration +
      (1 - p.brand_decay ** duration) +
      p.brand_marketing_coefficient * duration * decisions.marketing_change,
  );

  const digitalReadiness = clamp(
    0.65,
    1.5,
    opening.digitalReadiness * p.digital_readiness_decay ** duration +
      (1 - p.digital_readiness_decay ** duration) +
      p.digital_readiness_coefficient *
        duration *
        (decisions.rnd_pct * decisions.connected_rnd_allocation -
          BASELINE_2025.rnd_pct *
            BASELINE_2025.connected_rnd_allocation),
  );

  const effectiveCapexRatioForCapacity =
    Math.min(decisions.capex_pct, 0.08) +
    0.25 * Math.max(0, decisions.capex_pct - 0.08);

  const assetHealth = clamp(
    0.7,
    1.3,
    opening.assetHealth * p.asset_health_decay ** duration +
      (1 - p.asset_health_decay ** duration) +
      p.asset_health_capex_coefficient *
        duration *
        (effectiveCapexRatioForCapacity - BASELINE_2025.capex_pct),
  );

  // 06_MODEL_ENGINE C15:E16. Qualification uses the opening strategic state.
  const oemQualificationScore =
    p.oem_innovation_weight * opening.innovationStock +
    p.oem_digital_weight * opening.digitalReadiness +
    p.oem_asset_weight * opening.assetHealth;

  const oemContractDemandEffect =
    round !== 3
      ? 0
      : oemQualificationScore >= p.oem_win_threshold
        ? p.oem_demand_bonus
        : oemQualificationScore <= p.oem_fail_threshold
          ? p.oem_demand_penalty
          : 0;

  // 06_MODEL_ENGINE C17:E18
  const effectiveHvPriceElasticity = clamp(
    0.2,
    0.7,
    p.hv_price_elasticity *
      (1 -
        p.pricing_power_brand * (opening.brandStrength - 1) -
        p.pricing_power_innovation * (opening.innovationStock - 1)),
  );

  const effectiveHvRelativePriceSensitivity =
    p.hv_relative_price_sensitivity *
    (1 -
      0.25 * (opening.brandStrength - 1) -
      0.2 * (opening.innovationStock - 1));

  const premiumDemandVolumeIndex =
    opening.premiumDemandVolumeIndex *
    Math.max(
      0.65,
      1 +
        scenario.premium_market_growth +
        0.25 * (scenario.global_macro_growth - 0.03) +
        0.05 * (scenario.ev_new_car_share - 0.28) -
        effectiveHvPriceElasticity * decisions.hv_price_change -
        effectiveHvRelativePriceSensitivity * premiumRelativePriceGap +
        p.immediate_marketing_hv * decisions.marketing_change +
        p.brand_to_hv_demand * (opening.brandStrength - 1) +
        p.innovation_to_hv_demand * (opening.innovationStock - 1) +
        scenario.technology_opportunity_index *
          (p.digital_to_tech_opportunity *
            (opening.digitalReadiness - 1) +
            0.5 *
              p.innovation_to_hv_demand *
              (opening.innovationStock - 1)) +
        p.asset_health_to_hv_demand * (opening.assetHealth - 1) -
        p.competition_sensitivity_hv *
          scenario.competitive_price_pressure +
        p.customer_credit_demand_sensitivity *
          (decisions.receivable_days - BASELINE_2025.receivable_days) +
        oemContractDemandEffect,
    );

  const effectiveStandardPriceElasticity = clamp(
    0.6,
    1.2,
    p.standard_price_elasticity *
      (1 - 0.15 * (opening.brandStrength - 1)),
  );

  const effectiveStandardRelativePriceSensitivity =
    p.standard_relative_price_sensitivity *
    (1 - 0.15 * (opening.brandStrength - 1));

  const standardDemandVolumeIndex =
    opening.standardDemandVolumeIndex *
    Math.max(
      0.5,
      1 +
        scenario.standard_market_growth +
        0.25 * (scenario.global_macro_growth - 0.03) -
        effectiveStandardPriceElasticity * decisions.std_price_change -
        effectiveStandardRelativePriceSensitivity *
          standardRelativePriceGap +
        p.immediate_marketing_standard * decisions.marketing_change +
        p.brand_to_standard_demand * (opening.brandStrength - 1) -
        p.competition_sensitivity_standard *
          scenario.competitive_price_pressure +
        p.customer_credit_demand_sensitivity *
          (decisions.receivable_days - BASELINE_2025.receivable_days),
    );

  // 06_MODEL_ENGINE C20:E25
  const productionCapacityIndex =
    opening.productionCapacityIndex *
    (1 +
      p.capacity_response_to_capex *
        duration *
        (effectiveCapexRatioForCapacity - p.maintenance_capex_pct) +
      0.04 * (opening.assetHealth - 1));

  const demandBeforeCapacityConstraint =
    BASELINE_2025.premium_share * premiumDemandVolumeIndex +
    BASELINE_2025.standard_share * standardDemandVolumeIndex;

  const requiredSafetyInventoryDays =
    p.base_required_safety_inventory_days +
    p.supply_shock_safety_stock_addon_days *
      scenario.supply_disruption_index;

  const serviceFulfilmentFactor =
    Math.min(
      1,
      productionCapacityIndex / demandBeforeCapacityConstraint,
    ) *
    Math.max(
      0.8,
      1 -
        p.inventory_shortage_sensitivity *
          Math.max(
            0,
            requiredSafetyInventoryDays - decisions.inventory_days,
          ),
    ) *
    clamp(0.88, 1.03, 0.9 + 0.1 * opening.assetHealth);

  const realizedPremiumVolumeIndex =
    premiumDemandVolumeIndex * serviceFulfilmentFactor;
  const realizedStandardVolumeIndex =
    standardDemandVolumeIndex * serviceFulfilmentFactor;

  // 06_MODEL_ENGINE C26:E30
  const externalPremiumMarketIndex =
    opening.externalPremiumMarketIndex *
    (1 + scenario.premium_market_growth);
  const externalStandardMarketIndex =
    opening.externalStandardMarketIndex *
    (1 + scenario.standard_market_growth);
  const relativePremiumMarketShareIndex =
    realizedPremiumVolumeIndex / externalPremiumMarketIndex;
  const relativeStandardMarketShareIndex =
    realizedStandardVolumeIndex / externalStandardMarketIndex;

  const competitivePosition = clamp(
    0.65,
    1.4,
    p.competitive_position_brand_weight * brandStrength +
      p.competitive_position_innovation_weight * innovationStock +
      p.competitive_position_digital_weight * digitalReadiness +
      p.competitive_position_asset_weight * assetHealth +
      p.competitive_position_market_share_weight *
        (0.7 * relativePremiumMarketShareIndex +
          0.3 * relativeStandardMarketShareIndex),
  );

  // 06_MODEL_ENGINE C31:E34
  const premiumRevenue =
    BASELINE_2025.premium_revenue *
    realizedPremiumVolumeIndex *
    premiumPriceIndex *
    (1 + scenario.fx_effect);
  const standardRevenue =
    BASELINE_2025.standard_revenue *
    realizedStandardVolumeIndex *
    standardPriceIndex *
    (1 + scenario.fx_effect);
  const totalRevenue = premiumRevenue + standardRevenue;
  const premiumRevenueShare = premiumRevenue / totalRevenue;

  // 06_MODEL_ENGINE C35:E38
  const effectiveNaturalRubberCostIndex =
    1 +
    (scenario.natural_rubber_index - 1) *
      (1 -
        decisions.natural_rubber_hedge * p.hedge_effectiveness) +
    decisions.natural_rubber_hedge * p.hedge_premium;

  const weightedVariableCostInflationIndex =
    p.natural_rubber_variable_cost_share *
      effectiveNaturalRubberCostIndex +
    p.synthetic_rubber_variable_cost_share *
      scenario.synthetic_rubber_index +
    p.energy_freight_variable_cost_share *
      scenario.energy_logistics_index +
    p.other_variable_cost_share;

  const variableCostEfficiencyFactor = clamp(
    0.93,
    1.08,
    1 -
      p.asset_health_cost_efficiency * (opening.assetHealth - 1) -
      0.025 * (opening.innovationStock - 1),
  );

  const premiumVariableCost =
    premiumRevenue *
    BASELINE_2025.base_premium_variable_cost_pct *
    weightedVariableCostInflationIndex *
    variableCostEfficiencyFactor;

  const standardVariableCost =
    standardRevenue *
    BASELINE_2025.base_standard_variable_cost_pct *
    weightedVariableCostInflationIndex *
    variableCostEfficiencyFactor;

  // 06_MODEL_ENGINE C39:E44
  const marketingExpense =
    totalRevenue *
    BASELINE_2025.base_marketing_pct *
    (1 + decisions.marketing_change);
  const rndExpense = totalRevenue * decisions.rnd_pct;

  const baselineFixedOpex =
    BASELINE_2025.revenue -
    BASELINE_2025.premium_revenue *
      BASELINE_2025.base_premium_variable_cost_pct -
    BASELINE_2025.standard_revenue *
      BASELINE_2025.base_standard_variable_cost_pct -
    BASELINE_2025.revenue * BASELINE_2025.base_marketing_pct -
    BASELINE_2025.rnd_expense -
    BASELINE_2025.adjusted_ebitda;

  const fixedOpex =
    totalRevenue * (baselineFixedOpex / BASELINE_2025.revenue);

  const regulatoryCost =
    totalRevenue *
    scenario.regulatory_compliance_burden *
    Math.max(
      0.25,
      1 -
        0.35 * (opening.digitalReadiness - 1) -
        0.15 * (opening.innovationStock - 1),
    );

  const adjustedEbitda =
    totalRevenue -
    premiumVariableCost -
    standardVariableCost -
    marketingExpense -
    rndExpense -
    fixedOpex -
    regulatoryCost;
  const adjustedEbitdaMargin = adjustedEbitda / totalRevenue;

  // 06_MODEL_ENGINE C45:E47
  const depreciationDecay = DEPRECIATION_PERSISTENCE ** duration;
  const da =
    opening.da * depreciationDecay +
    ((totalRevenue * decisions.capex_pct) /
      DEPRECIATION_ASSET_LIFE_YEARS) *
      ((1 - depreciationDecay) / (1 - DEPRECIATION_PERSISTENCE));

  const adjustedEbit = adjustedEbitda - da;
  const adjustedEbitMargin = adjustedEbit / totalRevenue;

  // 06_MODEL_ENGINE C48:E48
  const strategicHealth =
    p.strategic_health_innovation_weight * innovationStock +
    p.strategic_health_brand_weight * brandStrength +
    p.strategic_health_digital_weight * digitalReadiness +
    p.strategic_health_asset_weight * assetHealth;

  return {
    premiumPriceIndex,
    standardPriceIndex,
    marketPremiumPriceIndex,
    marketStandardPriceIndex,
    premiumRelativePriceGap,
    standardRelativePriceGap,
    innovationStock,
    brandStrength,
    digitalReadiness,
    assetHealth,
    oemQualificationScore,
    oemContractDemandEffect,
    premiumDemandVolumeIndex,
    standardDemandVolumeIndex,
    effectiveCapexRatioForCapacity,
    productionCapacityIndex,
    demandBeforeCapacityConstraint,
    requiredSafetyInventoryDays,
    serviceFulfilmentFactor,
    realizedPremiumVolumeIndex,
    realizedStandardVolumeIndex,
    externalPremiumMarketIndex,
    externalStandardMarketIndex,
    relativePremiumMarketShareIndex,
    relativeStandardMarketShareIndex,
    competitivePosition,
    premiumRevenue,
    standardRevenue,
    totalRevenue,
    premiumRevenueShare,
    effectiveNaturalRubberCostIndex,
    weightedVariableCostInflationIndex,
    premiumVariableCost,
    standardVariableCost,
    marketingExpense,
    rndExpense,
    fixedOpex,
    regulatoryCost,
    adjustedEbitda,
    adjustedEbitdaMargin,
    da,
    adjustedEbit,
    adjustedEbitMargin,
    strategicHealth,
  };
}

function phaseDiscountWeight(round: RoundNumber): number {
  const wacc = MODEL_PARAMETERS.wacc;

  if (round === 1) {
    return 1 / (1 + wacc) ** 1;
  }

  if (round === 2) {
    return 1 / (1 + wacc) ** 2 + 1 / (1 + wacc) ** 3;
  }

  return 1 / (1 + wacc) ** 4 + 1 / (1 + wacc) ** 5;
}

function calculateFinancials(
  opening: OpeningState,
  operating: OperatingResult,
  decisions: DecisionSet,
  scenario: ExternalScenario,
  round: RoundNumber,
): FinancialResult {
  const p = MODEL_PARAMETERS;
  const duration = scenario.duration_years;

  // 07_FINANCIALS C8:E11
  const netFinancialExpense =
    Math.max(0, opening.netDebt) * scenario.cost_of_debt -
    Math.max(0, -opening.netDebt) * NET_CASH_YIELD;
  const profitBeforeTax =
    operating.adjustedEbit - netFinancialExpense;
  const tax = Math.max(0, profitBeforeTax * p.tax_rate);
  const netIncome = profitBeforeTax - tax;

  // 07_FINANCIALS C13:E19
  const tradeReceivables =
    (operating.totalRevenue * decisions.receivable_days) / 365;
  const inventories =
    ((operating.premiumVariableCost +
      operating.standardVariableCost) *
      decisions.inventory_days) /
    365;
  const tradePayables =
    ((operating.premiumVariableCost +
      operating.standardVariableCost) *
      BASELINE_2025.payable_days) /
    365;
  const operatingNwc =
    tradeReceivables + inventories - tradePayables;
  const otherWorkingCapital =
    operating.totalRevenue *
    (BASELINE_2025.other_working_capital /
      BASELINE_2025.revenue);
  const netWorkingCapital = operatingNwc + otherWorkingCapital;
  const changeInNwc =
    netWorkingCapital - opening.netWorkingCapital;

  // 07_FINANCIALS C21:E26
  const capex = operating.totalRevenue * decisions.capex_pct;
  const unleveredFreeCashFlow =
    operating.adjustedEbit * (1 - p.tax_rate) +
    operating.da -
    capex -
    changeInNwc;
  const leveredCashFlowProxy =
    netIncome + operating.da - capex - changeInNwc;
  const netDebt =
    opening.netDebt - leveredCashFlowProxy * duration;
  const netDebtToEbitda = netDebt / operating.adjustedEbitda;

  // 07_FINANCIALS C28:E34
  const openingFixedAssetsProxy =
    opening.closingFixedAssetsProxy;
  const closingFixedAssetsProxy =
    openingFixedAssetsProxy +
    (capex - operating.da) * duration;
  const netInvestedCapitalProxy =
    closingFixedAssetsProxy + netWorkingCapital;
  const provisionsProxy =
    operating.totalRevenue *
    (BASELINE_2025.provisions / BASELINE_2025.revenue);
  const equityFundingProxy =
    opening.equityFundingProxy + netIncome * duration;

  // 07_FINANCIALS C36:E37
  const pvWeightOfPhaseUfcf = phaseDiscountWeight(round);
  const pvOfPhaseUfcf =
    unleveredFreeCashFlow * pvWeightOfPhaseUfcf;

  return {
    netFinancialExpense,
    profitBeforeTax,
    tax,
    netIncome,
    tradeReceivables,
    inventories,
    tradePayables,
    operatingNwc,
    otherWorkingCapital,
    netWorkingCapital,
    changeInNwc,
    capex,
    da: operating.da,
    unleveredFreeCashFlow,
    leveredCashFlowProxy,
    netDebt,
    netDebtToEbitda,
    openingFixedAssetsProxy,
    closingFixedAssetsProxy,
    netInvestedCapitalProxy,
    provisionsProxy,
    equityFundingProxy,
    pvWeightOfPhaseUfcf,
    pvOfPhaseUfcf,
  };
}

export function simulateRound(
  openingState: OpeningState,
  decisions: DecisionSet,
  round: RoundNumber,
): RoundResult {
  assertValidModelDecision(decisions);

  const scenario = ROUND_SCENARIOS[round];
  const operating = calculateOperating(
    openingState,
    decisions,
    scenario,
    round,
  );
  const financial = calculateFinancials(
    openingState,
    operating,
    decisions,
    scenario,
    round,
  );

  const closingState: OpeningState = {
    premiumPriceIndex: operating.premiumPriceIndex,
    standardPriceIndex: operating.standardPriceIndex,
    marketPremiumPriceIndex: operating.marketPremiumPriceIndex,
    marketStandardPriceIndex: operating.marketStandardPriceIndex,
    innovationStock: operating.innovationStock,
    brandStrength: operating.brandStrength,
    digitalReadiness: operating.digitalReadiness,
    assetHealth: operating.assetHealth,
    premiumDemandVolumeIndex: operating.premiumDemandVolumeIndex,
    standardDemandVolumeIndex: operating.standardDemandVolumeIndex,
    productionCapacityIndex: operating.productionCapacityIndex,
    externalPremiumMarketIndex: operating.externalPremiumMarketIndex,
    externalStandardMarketIndex: operating.externalStandardMarketIndex,
    da: operating.da,
    netDebt: financial.netDebt,
    netWorkingCapital: financial.netWorkingCapital,
    closingFixedAssetsProxy: financial.closingFixedAssetsProxy,
    equityFundingProxy: financial.equityFundingProxy,
  };

  return {
    modelVersion: MODEL_VERSION,
    round,
    durationYears: scenario.duration_years,
    decisions,
    scenario,
    openingState,
    operating,
    financial,
    closingState,
  };
}

function calculateTerminalValuation(
  rounds: Record<RoundNumber, RoundResult>,
): TerminalValuation {
  const p = MODEL_PARAMETERS;
  const round2 = rounds[2];
  const round3 = rounds[3];

  // 07_FINANCIALS E38:E42
  const normalizedEbitMargin =
    (round2.operating.adjustedEbitMargin +
      round3.operating.adjustedEbitMargin) /
    2;
  const strategicHealth = round3.operating.strategicHealth;
  const growth = clamp(
    0.005,
    0.035,
    p.base_terminal_growth +
      p.strategic_health_terminal_growth_coefficient *
        (strategicHealth - 1),
  );

  const normalizedTerminalUfcf =
    round3.operating.totalRevenue *
      normalizedEbitMargin *
      (1 - p.tax_rate) +
    (round2.operating.da + round3.operating.da) / 2 -
    round3.operating.totalRevenue * p.maintenance_capex_pct;

  const franchiseFactor = clamp(
    0.8,
    1.2,
    1 +
      p.strategic_health_terminal_value_factor *
        (strategicHealth - 1),
  );

  const terminalValue =
    (normalizedTerminalUfcf * (1 + growth)) /
      (p.wacc - growth) *
    franchiseFactor;
  const pvTerminalValue =
    terminalValue / (1 + p.wacc) ** 5;

  return {
    normalizedEbitMargin,
    strategicHealth,
    growth,
    terminalValue,
    pvTerminalValue,
  };
}

function calculateRiskPenalty(
  rounds: Record<RoundNumber, RoundResult>,
): number {
  const p = MODEL_PARAMETERS;

  return ([1, 2, 3] as RoundNumber[]).reduce((total, round) => {
    const result = rounds[round];
    const duration = result.durationYears;

    const leveragePenalty =
      LEVERAGE_RISK_PENALTY_PER_YEAR *
      duration *
      Math.max(
        0,
        result.financial.netDebtToEbitda -
          p.max_net_debt_to_ebitda,
      );

    const servicePenalty =
      SERVICE_RISK_PENALTY_PER_YEAR *
      duration *
      Math.max(
        0,
        0.9 - result.operating.serviceFulfilmentFactor,
      );

    return total + leveragePenalty + servicePenalty;
  }, 0);
}

export function simulateGame(
  decisionsByRound: Record<RoundNumber, DecisionSet>,
): GameResult {
  let state = createOpeningState();
  const partial: Partial<Record<RoundNumber, RoundResult>> = {};

  for (const round of [1, 2, 3] as RoundNumber[]) {
    const result = simulateRound(
      state,
      decisionsByRound[round],
      round,
    );
    partial[round] = result;
    state = result.closingState;
  }

  const rounds = partial as Record<RoundNumber, RoundResult>;
  const terminal = calculateTerminalValuation(rounds);
  const pvExplicitUfcf =
    rounds[1].financial.pvOfPhaseUfcf +
    rounds[2].financial.pvOfPhaseUfcf +
    rounds[3].financial.pvOfPhaseUfcf;
  const enterpriseValue =
    pvExplicitUfcf + terminal.pvTerminalValue;
  const openingNetDebt = BASELINE_2025.net_debt;
  const impliedEquityValue =
    enterpriseValue - openingNetDebt;
  const riskPenalty = calculateRiskPenalty(rounds);
  const finalGameValue = impliedEquityValue - riskPenalty;

  return {
    modelVersion: MODEL_VERSION,
    rounds,
    terminal,
    valuation: {
      pvExplicitUfcf,
      pvTerminalValue: terminal.pvTerminalValue,
      enterpriseValue,
      openingNetDebt,
      impliedEquityValue,
      riskPenalty,
      finalGameValue,
    },
  };
}
