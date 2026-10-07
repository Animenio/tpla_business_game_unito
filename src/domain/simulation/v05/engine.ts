import {
  ANNUAL_SCENARIOS,
  BASELINE_2025,
  MODEL_DESIGN,
  MODEL_PARAMETERS,
  MODEL_VERSION,
  ORIENTATION_CONNECTED_SHARE,
  RESILIENCE_MAPPING,
  type AnnualScenario,
  type DecisionSet,
  type ModelVersion,
  type ModelYear,
  type RoundNumber,
} from "./spec";
import { assertValidDecisionSet } from "./validation";

const YEARS: readonly ModelYear[] = [2026, 2027, 2028, 2029, 2030, 2031];

function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}

function softplus(z: number): number {
  return z > 700 ? z : Math.log1p(Math.exp(z));
}

function roundForYear(year: ModelYear): RoundNumber | null {
  if (year === 2026) return 1;
  if (year === 2027 || year === 2028) return 2;
  if (year === 2029 || year === 2030) return 3;
  return null;
}

interface AnnualPolicy {
  premiumPricePositioning: number;
  standardPricePositioning: number;
  marketingChange: number;
  rndPct: number;
  connectedShare: number;
  capexPct: number;
  inventoryDays: number;
  naturalRubberHedge: number;
  receivableDays: number;
}

export interface ModelState {
  innovation: number;
  brand: number;
  digital: number;
  assetHealth: number;
  priorCapex: number;
  priorDa: number;
  priorNetDebt: number;
  priorNwc: number;
  priorFixedAssets: number;
  priorEquity: number;
  premiumMarketIndex: number;
  standardMarketIndex: number;
  premiumCompetitorPriceIndex: number;
  standardCompetitorPriceIndex: number;
  productionCapacityIndex: number;
  priorCapexProductiveBaseRatio: number;
}

export interface AnnualResult {
  year: ModelYear;
  round: RoundNumber | null;
  scenario: AnnualScenario;
  policy: AnnualPolicy;
  openingState: ModelState;

  premiumMarketIndex: number;
  standardMarketIndex: number;
  premiumCompetitorPriceIndex: number;
  standardCompetitorPriceIndex: number;
  premiumActualPriceIndex: number;
  standardActualPriceIndex: number;
  effectivePremiumElasticity: number;
  effectiveStandardElasticity: number;
  creditFactor: number;
  oemQualificationScore: number;
  oemDemandEffect: number;
  premiumAttractiveness: number;
  standardAttractiveness: number;
  premiumDemandVolumeIndex: number;
  standardDemandVolumeIndex: number;

  productionCapacityIndex: number;
  requiredInventoryDays: number;
  stockAvailability: number;
  assetReliability: number;
  plantAvailableCapacity: number;
  premiumRequestedUnits: number;
  standardRequestedUnits: number;
  premiumFulfilledUnits: number;
  standardFulfilledUnits: number;
  realizedPremiumVolumeIndex: number;
  realizedStandardVolumeIndex: number;
  serviceFactor: number;
  unservedPremiumShare: number;

  premiumRevenue: number;
  standardRevenue: number;
  totalRevenue: number;
  premiumRevenueShare: number;
  effectiveNaturalRubberCostIndex: number;
  otherCostInflationIndex: number;
  weightedVariableCostInflationIndex: number;
  variableCostEfficiency: number;
  premiumVariableCost: number;
  standardVariableCost: number;
  totalVariableCost: number;
  marketingExpense: number;
  rndExpense: number;
  fixedOpex: number;
  regulatoryCost: number;
  inventoryValue: number;
  inventoryCarryingCost: number;
  adjustedEbitda: number;
  adjustedEbitdaMargin: number;
  capex: number;
  da: number;
  adjustedEbit: number;
  adjustedEbitMargin: number;

  netFinancialExpense: number;
  profitBeforeTax: number;
  tax: number;
  netIncome: number;
  dividends: number;
  tradeReceivables: number;
  inventories: number;
  tradePayables: number;
  otherWorkingCapital: number;
  netWorkingCapital: number;
  changeInNwc: number;
  cashFlowAvailableBeforeDividends: number;
  netDebt: number;
  netDebtToEbitda: number;
  expectedDistressCost: number;
  unleveredFreeCashFlow: number;
  discountFactor: number;
  pvUnleveredFreeCashFlow: number;
  pvDistressCost: number;

  fixedAssets: number;
  equity: number;
  balanceCheck: number;
  roic: number;

  referenceRevenue: number;
  productiveBase: number;
  strategicRndIntensity: number;
  strategicMarketingIntensity: number;
  strategicCapexIntensity: number;
  closingInnovation: number;
  closingBrand: number;
  closingDigital: number;
  closingAssetHealth: number;
  strategicHealth: number;
  relativePremiumMarketShare: number;
  relativeStandardMarketShare: number;
  competitivePosition: number;
  closingState: ModelState;
}

export interface TerminalValuation {
  coreNopat2031: number;
  assetOnlyNopat2031: number;
  actualNopat2031: number;
  assetHealthExcessNopat: number;
  intangibleExcessNopat: number;
  baseTerminalValue: number;
  assetHealthExcessValue: number;
  intangibleExcessValue: number;
  terminalValue: number;
  pvTerminalValue: number;
}

export interface FinalValuation {
  pvExplicitUfcf: number;
  pvExpectedDistressCost: number;
  enterpriseValue: number;
  openingNetDebt: number;
  impliedEquityValue: number;
  finalGameValue: number;
}

export interface GameResult {
  modelVersion: ModelVersion;
  annual: Record<ModelYear, AnnualResult>;
  terminal: TerminalValuation;
  valuation: FinalValuation;
}

export interface SimulationOptions {
  scenarios?: Record<ModelYear, AnnualScenario>;
  policyForYear?: (year: ModelYear) => AnnualPolicy;
  validateDecisions?: boolean;
}

export function createOpeningState(): ModelState {
  return {
    innovation: 1,
    brand: 1,
    digital: 1,
    assetHealth: 1,
    priorCapex: BASELINE_2025.capex,
    priorDa: BASELINE_2025.da_proxy,
    priorNetDebt: BASELINE_2025.net_debt,
    priorNwc: BASELINE_2025.net_working_capital,
    priorFixedAssets: BASELINE_2025.fixed_assets,
    priorEquity: BASELINE_2025.equity,
    premiumMarketIndex: 1,
    standardMarketIndex: 1,
    premiumCompetitorPriceIndex: 1,
    standardCompetitorPriceIndex: 1,
    productionCapacityIndex: MODEL_PARAMETERS.opening_productive_capacity_index,
    priorCapexProductiveBaseRatio: BASELINE_2025.capex_pct,
  };
}

function neutralPolicy(): AnnualPolicy {
  const p = MODEL_PARAMETERS;
  return {
    premiumPricePositioning: 0,
    standardPricePositioning: 0,
    marketingChange: 0,
    rndPct: BASELINE_2025.rnd_pct,
    connectedShare: p.neutral_connected_share,
    capexPct: p.maintenance_capex_pct,
    inventoryDays: p.neutral_inventory_days,
    naturalRubberHedge: 0,
    receivableDays: p.fixed_receivable_days,
  };
}

function policyFromDecision(decision: DecisionSet): AnnualPolicy {
  const resilience = RESILIENCE_MAPPING[decision.resilience_policy];
  return {
    premiumPricePositioning: decision.premium_price_positioning,
    standardPricePositioning: decision.standard_price_positioning,
    marketingChange: decision.marketing_change,
    rndPct: decision.rnd_pct,
    connectedShare: ORIENTATION_CONNECTED_SHARE[decision.rnd_orientation],
    capexPct: decision.capex_pct,
    inventoryDays: resilience.inventoryDays,
    naturalRubberHedge: resilience.naturalRubberHedge,
    receivableDays: MODEL_PARAMETERS.fixed_receivable_days,
  };
}

function oemDemandEffect(score: number, technologyOpportunity: number): number {
  const p = MODEL_PARAMETERS;
  const raw =
    p.oem_demand_high /
      (1 + Math.exp(-(score - p.oem_upper_threshold) / p.oem_logistic_width)) +
    p.oem_demand_low /
      (1 + Math.exp(-(p.oem_lower_threshold - score) / p.oem_logistic_width));
  return MODEL_DESIGN.oem_effect_scaled_by_technology_opportunity
    ? raw * Math.min(1, technologyOpportunity)
    : raw;
}

function allocateCapacity(
  year: ModelYear,
  premiumRequested: number,
  standardRequested: number,
  plantAvailableCapacity: number,
  stockAvailability: number,
): { premiumFulfilled: number; standardFulfilled: number } {
  const p = MODEL_PARAMETERS;
  const w = p.capacity_allocation_smoothing_width;
  const yearsFrom2025 = year - 2025;
  const contractualShare = p.standard_contractual_share * 1 ** (yearsFrom2025 - 1);
  const committedStandard = contractualShare * standardRequested;
  const premiumTier = premiumRequested;
  const uncommittedStandard = (1 - contractualShare) * standardRequested;

  const shortage = w * softplus(
    (committedStandard + premiumTier + uncommittedStandard - plantAvailableCapacity) / w,
  );
  const shortagePastUncommitted = Math.min(
    shortage,
    w * softplus((shortage - uncommittedStandard) / w),
  );
  const shortagePastPremium = Math.min(
    shortagePastUncommitted,
    w * softplus((shortagePastUncommitted - premiumTier) / w),
  );

  let premiumFulfilled =
    premiumTier - (shortagePastUncommitted - shortagePastPremium);
  let standardFulfilled =
    (uncommittedStandard - (shortage - shortagePastUncommitted)) +
    (committedStandard - shortagePastPremium);

  if (MODEL_DESIGN.inventory_shortage_hits_sales_not_plant_capacity) {
    premiumFulfilled *= stockAvailability;
    standardFulfilled *= stockAvailability;
  }

  return { premiumFulfilled, standardFulfilled };
}

function simulateAnnual(
  year: ModelYear,
  opening: ModelState,
  scenario: AnnualScenario,
  policy: AnnualPolicy,
): AnnualResult {
  const p = MODEL_PARAMETERS;

  const premiumMarketIndex =
    opening.premiumMarketIndex * (1 + scenario.premium_market_growth);
  const standardMarketIndex =
    opening.standardMarketIndex * (1 + scenario.standard_market_growth);
  const premiumCompetitorPriceIndex =
    opening.premiumCompetitorPriceIndex *
    (1 + scenario.premium_competitor_price_growth);
  const standardCompetitorPriceIndex =
    opening.standardCompetitorPriceIndex *
    (1 + scenario.standard_competitor_price_growth);
  const premiumActualPriceIndex =
    premiumCompetitorPriceIndex * (1 + policy.premiumPricePositioning);
  const standardActualPriceIndex =
    standardCompetitorPriceIndex * (1 + policy.standardPricePositioning);

  const effectivePremiumElasticity =
    p.premium_price_elasticity *
    clamp(
      p.elasticity_multiplier_min,
      p.elasticity_multiplier_max,
      1 -
        p.pricing_power_brand * (opening.brand - 1) -
        p.pricing_power_innovation * (opening.innovation - 1),
    );
  const effectiveStandardElasticity =
    p.standard_price_elasticity *
    clamp(
      p.elasticity_multiplier_min,
      p.elasticity_multiplier_max,
      1 - 0.15 * (opening.brand - 1),
    );

  const creditDelta =
    policy.receivableDays - BASELINE_2025.receivable_days;
  const creditFactor =
    1 +
    p.credit_sensitivity *
      p.credit_concavity_scale *
      (creditDelta >= 0 ? 1 : -1) *
      (1 - Math.exp(-Math.abs(creditDelta) / p.credit_concavity_scale));

  const oemQualificationScore =
    p.oem_innovation_weight * opening.innovation +
    p.oem_digital_weight * opening.digital +
    p.oem_asset_weight * opening.assetHealth;
  const oemEffect =
    year >= 2029
      ? oemDemandEffect(
          oemQualificationScore,
          scenario.technology_opportunity,
        )
      : 0;

  const premiumAttractiveness =
    1 +
    p.macro_sensitivity * (scenario.global_macro_growth - 0.03) +
    p.ev_share_sensitivity_premium *
      (scenario.ev_new_car_share - 0.28) +
    p.immediate_marketing_premium * policy.marketingChange +
    p.brand_to_premium_demand * (opening.brand - 1) +
    p.innovation_to_premium_demand * (opening.innovation - 1) +
    scenario.technology_opportunity *
      (p.digital_to_technology_opportunity *
        (opening.digital - 1) +
        0.5 *
          p.innovation_to_premium_demand *
          (opening.innovation - 1)) +
    p.asset_health_to_premium_demand * (opening.assetHealth - 1) -
    p.competition_sensitivity_premium *
      scenario.competitive_pressure +
    oemEffect;

  const standardAttractiveness =
    1 +
    p.macro_sensitivity * (scenario.global_macro_growth - 0.03) +
    p.immediate_marketing_standard * policy.marketingChange +
    p.brand_to_standard_demand * (opening.brand - 1) -
    p.competition_sensitivity_standard *
      scenario.competitive_pressure;

  const premiumDemandVolumeIndex = Math.max(
    0.2,
    premiumMarketIndex *
      premiumAttractiveness *
      (1 + policy.premiumPricePositioning) **
        -effectivePremiumElasticity *
      creditFactor,
  );
  const standardDemandVolumeIndex = Math.max(
    0.2,
    standardMarketIndex *
      standardAttractiveness *
      (1 + policy.standardPricePositioning) **
        -effectiveStandardElasticity *
      creditFactor,
  );

  const productionCapacityIndex =
    opening.productionCapacityIndex *
    (1 +
      p.capacity_response *
        (opening.priorCapexProductiveBaseRatio -
          p.maintenance_capex_pct) +
      p.asset_to_capacity_effect *
        (opening.assetHealth - 1));

  const requiredInventoryDays =
    p.base_inventory_requirement_days +
    p.supply_shock_addon_days * scenario.supply_disruption;
  const stockAvailability = Math.max(
    0.8,
    1 -
      p.inventory_shortage_sensitivity *
        p.stockout_smoothing_width_days *
        softplus(
          (requiredInventoryDays - policy.inventoryDays) /
            p.stockout_smoothing_width_days,
        ),
  );
  const assetReliability = Math.max(
    p.asset_reliability_floor,
    Math.min(
      1,
      p.asset_reliability_base +
        p.asset_reliability_slope * opening.assetHealth,
    ),
  );
  const plantAvailableCapacity =
    productionCapacityIndex * assetReliability;
  const premiumRequestedUnits =
    BASELINE_2025.premium_share *
    premiumDemandVolumeIndex;
  const standardRequestedUnits =
    BASELINE_2025.standard_share *
    standardDemandVolumeIndex;
  const allocated = allocateCapacity(
    year,
    premiumRequestedUnits,
    standardRequestedUnits,
    plantAvailableCapacity,
    stockAvailability,
  );
  const premiumFulfilledUnits = allocated.premiumFulfilled;
  const standardFulfilledUnits = allocated.standardFulfilled;
  const realizedPremiumVolumeIndex =
    premiumFulfilledUnits / BASELINE_2025.premium_share;
  const realizedStandardVolumeIndex =
    standardFulfilledUnits / BASELINE_2025.standard_share;
  const serviceFactor =
    (premiumFulfilledUnits + standardFulfilledUnits) /
    (premiumRequestedUnits + standardRequestedUnits);
  const unservedPremiumShare = Math.max(
    0,
    1 - premiumFulfilledUnits / premiumRequestedUnits,
  );

  const premiumRevenue =
    BASELINE_2025.premium_revenue *
    realizedPremiumVolumeIndex *
    premiumActualPriceIndex *
    (1 + scenario.fx_effect);
  const standardRevenue =
    BASELINE_2025.standard_revenue *
    realizedStandardVolumeIndex *
    standardActualPriceIndex *
    (1 + scenario.fx_effect);
  const totalRevenue = premiumRevenue + standardRevenue;
  const premiumRevenueShare = premiumRevenue / totalRevenue;

  const effectiveNaturalRubberCostIndex =
    scenario.natural_rubber_spot +
    policy.naturalRubberHedge * p.hedge_premium -
    policy.naturalRubberHedge *
      p.hedge_effectiveness *
      (scenario.natural_rubber_spot -
        scenario.natural_rubber_forward);
  const otherCostInflationIndex =
    (1 + p.non_commodity_inflation) ** (year - 2025);
  const weightedVariableCostInflationIndex =
    p.natural_rubber_variable_cost_share *
      effectiveNaturalRubberCostIndex +
    p.synthetic_rubber_variable_cost_share *
      scenario.synthetic_rubber_index +
    p.energy_freight_variable_cost_share *
      scenario.energy_logistics_index +
    p.other_variable_cost_share * otherCostInflationIndex;
  const variableCostEfficiency = clamp(
    0.93,
    1.08,
    1 -
      p.asset_cost_efficiency * (opening.assetHealth - 1) -
      p.innovation_cost_efficiency *
        (opening.innovation - 1),
  );
  const premiumVariableCost =
    BASELINE_2025.premium_variable_cost_base *
    realizedPremiumVolumeIndex *
    weightedVariableCostInflationIndex *
    variableCostEfficiency;
  const standardVariableCost =
    BASELINE_2025.standard_variable_cost_base *
    realizedStandardVolumeIndex *
    weightedVariableCostInflationIndex *
    variableCostEfficiency;
  const totalVariableCost =
    premiumVariableCost + standardVariableCost;
  const marketingExpense =
    totalRevenue *
    BASELINE_2025.marketing_pct *
    (1 + policy.marketingChange);
  const rndExpense = totalRevenue * policy.rndPct;
  const fixedOpex =
    BASELINE_2025.fixed_opex_base *
    otherCostInflationIndex *
    ((1 - p.fixed_opex_capacity_share) +
      (p.fixed_opex_capacity_share *
        productionCapacityIndex) /
        p.opening_productive_capacity_index);
  const regulatoryCost =
    totalRevenue *
    scenario.regulatory_burden *
    Math.max(
      0.25,
      1 -
        0.35 * (opening.digital - 1) -
        0.15 * (opening.innovation - 1),
    );
  const inventoryValue =
    (totalVariableCost * policy.inventoryDays) / 365;
  const inventoryCarryingCost =
    p.inventory_carrying_cost * inventoryValue;
  const adjustedEbitda =
    totalRevenue -
    totalVariableCost -
    marketingExpense -
    rndExpense -
    fixedOpex -
    regulatoryCost -
    inventoryCarryingCost;
  const adjustedEbitdaMargin =
    adjustedEbitda / totalRevenue;
  const capex = totalRevenue * policy.capexPct;
  const da =
    p.da_persistence * opening.priorDa +
    capex / p.asset_life_years;
  const adjustedEbit = adjustedEbitda - da;
  const adjustedEbitMargin = adjustedEbit / totalRevenue;

  const netFinancialExpense =
    Math.max(0, opening.priorNetDebt) *
      scenario.cost_of_debt -
    Math.max(0, -opening.priorNetDebt) *
      p.net_cash_yield;
  const profitBeforeTax =
    adjustedEbit - netFinancialExpense;
  const tax = Math.max(0, profitBeforeTax * p.tax_rate);
  const netIncome = profitBeforeTax - tax;
  const dividends = Math.max(0, netIncome * p.payout);
  const tradeReceivables =
    (totalRevenue * policy.receivableDays) / 365;
  const inventories = inventoryValue;
  const tradePayables =
    (totalVariableCost * BASELINE_2025.payable_days) / 365;
  const otherWorkingCapital =
    totalRevenue *
    (BASELINE_2025.other_working_capital /
      BASELINE_2025.revenue);
  const netWorkingCapital =
    tradeReceivables +
    inventories -
    tradePayables +
    otherWorkingCapital;
  const changeInNwc =
    netWorkingCapital - opening.priorNwc;
  const cashFlowAvailableBeforeDividends =
    netIncome + da - capex - changeInNwc;
  const netDebt =
    opening.priorNetDebt -
    cashFlowAvailableBeforeDividends +
    dividends;
  const netDebtToEbitda =
    adjustedEbitda <= 0 ? 99 : netDebt / adjustedEbitda;
  const expectedDistressCost =
    totalRevenue *
    p.distress_cost_per_leverage_point *
    Math.min(
      p.leverage_penalty_cap,
      Math.max(
        0,
        netDebtToEbitda - p.leverage_threshold,
      ),
    );
  const unleveredFreeCashFlow =
    adjustedEbit * (1 - p.tax_rate) +
    da -
    capex -
    changeInNwc;
  const discountFactor =
    1 / (1 + p.wacc) ** (year - 2025);
  const pvUnleveredFreeCashFlow =
    unleveredFreeCashFlow * discountFactor;
  const pvDistressCost =
    expectedDistressCost * discountFactor;

  const fixedAssets =
    opening.priorFixedAssets + capex - da;
  const equity =
    opening.priorEquity + netIncome - dividends;
  const balanceCheck =
    fixedAssets +
    netWorkingCapital -
    (equity + BASELINE_2025.provisions + netDebt);
  const openingInvestedCapital =
    opening.priorFixedAssets + opening.priorNwc;
  const closingInvestedCapital =
    fixedAssets + netWorkingCapital;
  const averageInvestedCapital =
    (openingInvestedCapital +
      closingInvestedCapital) /
    2;
  const roic =
    averageInvestedCapital === 0
      ? 0
      : (adjustedEbit * (1 - p.tax_rate)) /
        averageInvestedCapital;

  const referenceRevenue =
    (BASELINE_2025.premium_revenue *
      premiumMarketIndex *
      premiumCompetitorPriceIndex +
      BASELINE_2025.standard_revenue *
        standardMarketIndex *
        standardCompetitorPriceIndex) *
    (1 + scenario.fx_effect);
  const productiveBase =
    BASELINE_2025.revenue *
    (opening.productionCapacityIndex /
      p.opening_productive_capacity_index) *
    otherCostInflationIndex *
    (1 + scenario.fx_effect);
  const strategicRndIntensity =
    (totalRevenue * policy.rndPct) / referenceRevenue;
  const strategicMarketingIntensity =
    (totalRevenue * (1 + policy.marketingChange)) /
      referenceRevenue -
    1;
  const strategicCapexIntensity =
    capex / productiveBase;

  const closingInnovation = clamp(
    0.6,
    1.45,
    opening.innovation * p.innovation_persistence +
      (1 - p.innovation_persistence) +
      p.innovation_coefficient *
        (strategicRndIntensity *
          (1 - policy.connectedShare) -
          BASELINE_2025.rnd_pct *
            (1 -
              BASELINE_2025.connected_rnd_share)),
  );
  const closingBrand = clamp(
    0.65,
    1.4,
    opening.brand * p.brand_persistence +
      (1 - p.brand_persistence) +
      p.brand_coefficient *
        strategicMarketingIntensity -
      p.brand_erosion_per_unserved_premium *
        unservedPremiumShare,
  );
  const closingDigital = clamp(
    0.65,
    1.5,
    opening.digital * p.digital_persistence +
      (1 - p.digital_persistence) +
      p.digital_coefficient *
        (strategicRndIntensity *
          policy.connectedShare -
          BASELINE_2025.rnd_pct *
            BASELINE_2025.connected_rnd_share),
  );
  const effectiveCapexIntensity =
    Math.min(
      strategicCapexIntensity,
      p.capex_diminishing_threshold,
    ) +
    p.capex_excess_multiplier *
      Math.max(
        0,
        strategicCapexIntensity -
          p.capex_diminishing_threshold,
      );
  const closingAssetHealth = clamp(
    0.7,
    1.3,
    opening.assetHealth * p.asset_persistence +
      (1 - p.asset_persistence) +
      p.asset_coefficient *
        (effectiveCapexIntensity -
          BASELINE_2025.capex_pct),
  );

  const strategicHealth =
    p.strategic_health_innovation_weight *
      closingInnovation +
    p.strategic_health_brand_weight * closingBrand +
    p.strategic_health_digital_weight *
      closingDigital +
    p.strategic_health_asset_weight *
      closingAssetHealth;
  const relativePremiumMarketShare =
    realizedPremiumVolumeIndex / premiumMarketIndex;
  const relativeStandardMarketShare =
    realizedStandardVolumeIndex / standardMarketIndex;
  const competitivePosition = clamp(
    0.65,
    1.4,
    p.competitive_position_brand_weight *
      closingBrand +
      p.competitive_position_innovation_weight *
        closingInnovation +
      p.competitive_position_digital_weight *
        closingDigital +
      p.competitive_position_asset_weight *
        closingAssetHealth +
      p.competitive_position_market_share_weight *
        (0.70 * relativePremiumMarketShare +
          0.30 * relativeStandardMarketShare),
  );

  const closingState: ModelState = {
    innovation: closingInnovation,
    brand: closingBrand,
    digital: closingDigital,
    assetHealth: closingAssetHealth,
    priorCapex: capex,
    priorDa: da,
    priorNetDebt: netDebt,
    priorNwc: netWorkingCapital,
    priorFixedAssets: fixedAssets,
    priorEquity: equity,
    premiumMarketIndex,
    standardMarketIndex,
    premiumCompetitorPriceIndex,
    standardCompetitorPriceIndex,
    productionCapacityIndex,
    priorCapexProductiveBaseRatio:
      capex / productiveBase,
  };

  return {
    year,
    round: roundForYear(year),
    scenario,
    policy,
    openingState: opening,
    premiumMarketIndex,
    standardMarketIndex,
    premiumCompetitorPriceIndex,
    standardCompetitorPriceIndex,
    premiumActualPriceIndex,
    standardActualPriceIndex,
    effectivePremiumElasticity,
    effectiveStandardElasticity,
    creditFactor,
    oemQualificationScore,
    oemDemandEffect: oemEffect,
    premiumAttractiveness,
    standardAttractiveness,
    premiumDemandVolumeIndex,
    standardDemandVolumeIndex,
    productionCapacityIndex,
    requiredInventoryDays,
    stockAvailability,
    assetReliability,
    plantAvailableCapacity,
    premiumRequestedUnits,
    standardRequestedUnits,
    premiumFulfilledUnits,
    standardFulfilledUnits,
    realizedPremiumVolumeIndex,
    realizedStandardVolumeIndex,
    serviceFactor,
    unservedPremiumShare,
    premiumRevenue,
    standardRevenue,
    totalRevenue,
    premiumRevenueShare,
    effectiveNaturalRubberCostIndex,
    otherCostInflationIndex,
    weightedVariableCostInflationIndex,
    variableCostEfficiency,
    premiumVariableCost,
    standardVariableCost,
    totalVariableCost,
    marketingExpense,
    rndExpense,
    fixedOpex,
    regulatoryCost,
    inventoryValue,
    inventoryCarryingCost,
    adjustedEbitda,
    adjustedEbitdaMargin,
    capex,
    da,
    adjustedEbit,
    adjustedEbitMargin,
    netFinancialExpense,
    profitBeforeTax,
    tax,
    netIncome,
    dividends,
    tradeReceivables,
    inventories,
    tradePayables,
    otherWorkingCapital,
    netWorkingCapital,
    changeInNwc,
    cashFlowAvailableBeforeDividends,
    netDebt,
    netDebtToEbitda,
    expectedDistressCost,
    unleveredFreeCashFlow,
    discountFactor,
    pvUnleveredFreeCashFlow,
    pvDistressCost,
    fixedAssets,
    equity,
    balanceCheck,
    roic,
    referenceRevenue,
    productiveBase,
    strategicRndIntensity,
    strategicMarketingIntensity,
    strategicCapexIntensity,
    closingInnovation,
    closingBrand,
    closingDigital,
    closingAssetHealth,
    strategicHealth,
    relativePremiumMarketShare,
    relativeStandardMarketShare,
    competitivePosition,
    closingState,
  };
}

function normalizedTerminalNopat(
  result2031: AnnualResult,
  assetHealth: number,
): number {
  const p = MODEL_PARAMETERS;
  const scenario = result2031.scenario;
  const oemScore =
    p.oem_innovation_weight +
    p.oem_digital_weight +
    p.oem_asset_weight * assetHealth;
  const oemEffect = oemDemandEffect(
    oemScore,
    scenario.technology_opportunity,
  );
  const premiumAttractiveness =
    1 +
    p.macro_sensitivity *
      (scenario.global_macro_growth - 0.03) +
    p.ev_share_sensitivity_premium *
      (scenario.ev_new_car_share - 0.28) +
    p.immediate_marketing_premium *
      result2031.policy.marketingChange +
    p.asset_health_to_premium_demand *
      (assetHealth - 1) -
    p.competition_sensitivity_premium *
      scenario.competitive_pressure +
    oemEffect;
  const standardAttractiveness =
    1 +
    p.macro_sensitivity *
      (scenario.global_macro_growth - 0.03) +
    p.immediate_marketing_standard *
      result2031.policy.marketingChange -
    p.competition_sensitivity_standard *
      scenario.competitive_pressure;
  const premiumDemand = Math.max(
    0.2,
    result2031.premiumMarketIndex *
      premiumAttractiveness *
      (1 +
        result2031.policy
          .premiumPricePositioning) **
        -p.premium_price_elasticity *
      result2031.creditFactor,
  );
  const standardDemand = Math.max(
    0.2,
    result2031.standardMarketIndex *
      standardAttractiveness *
      (1 +
        result2031.policy
          .standardPricePositioning) **
        -p.standard_price_elasticity *
      result2031.creditFactor,
  );
  const premiumRequested =
    BASELINE_2025.premium_share * premiumDemand;
  const standardRequested =
    BASELINE_2025.standard_share * standardDemand;
  const premiumFulfilled = Math.min(
    premiumRequested,
    result2031.plantAvailableCapacity,
  );
  const standardFulfilled = Math.min(
    standardRequested,
    Math.max(
      0,
      result2031.plantAvailableCapacity -
        premiumFulfilled,
    ),
  );
  const premiumVolume =
    premiumFulfilled / BASELINE_2025.premium_share;
  const standardVolume =
    standardFulfilled / BASELINE_2025.standard_share;
  const revenue =
    BASELINE_2025.premium_revenue *
      premiumVolume *
      result2031.premiumActualPriceIndex *
      (1 + scenario.fx_effect) +
    BASELINE_2025.standard_revenue *
      standardVolume *
      result2031.standardActualPriceIndex *
      (1 + scenario.fx_effect);
  const variableEfficiency = clamp(
    0.93,
    1.08,
    1 -
      p.asset_cost_efficiency *
        (assetHealth - 1),
  );
  const totalVariableCost =
    (BASELINE_2025.premium_variable_cost_base *
      premiumVolume +
      BASELINE_2025.standard_variable_cost_base *
        standardVolume) *
    result2031.weightedVariableCostInflationIndex *
    variableEfficiency;
  const marketingExpense =
    revenue *
    BASELINE_2025.marketing_pct *
    (1 + result2031.policy.marketingChange);
  const rndExpense =
    revenue * result2031.policy.rndPct;
  const regulatoryCost =
    revenue * scenario.regulatory_burden;
  const inventoryCarryingCost =
    (p.inventory_carrying_cost *
      totalVariableCost *
      result2031.policy.inventoryDays) /
    365;
  const ebitda =
    revenue -
    totalVariableCost -
    marketingExpense -
    rndExpense -
    result2031.fixedOpex -
    regulatoryCost -
    inventoryCarryingCost;
  const capex =
    revenue * result2031.policy.capexPct;
  const da =
    p.da_persistence *
      result2031.openingState.priorDa +
    capex / p.asset_life_years;
  return (ebitda - da) * (1 - p.tax_rate);
}

function continuationFactor(
  persistence: number,
): number {
  const discountedPersistence =
    persistence / (1 + MODEL_PARAMETERS.wacc);
  return (
    discountedPersistence /
    (1 - discountedPersistence)
  );
}

function calculateTerminal(
  result2031: AnnualResult,
): TerminalValuation {
  const p = MODEL_PARAMETERS;
  const coreNopat2031 =
    normalizedTerminalNopat(result2031, 1);
  const assetOnlyNopat2031 =
    normalizedTerminalNopat(
      result2031,
      result2031.openingState.assetHealth,
    );
  const actualNopat2031 =
    result2031.adjustedEbit * (1 - p.tax_rate);
  const assetHealthExcessNopat =
    assetOnlyNopat2031 - coreNopat2031;
  const intangibleExcessNopat =
    actualNopat2031 - assetOnlyNopat2031;
  const baseTerminalValue =
    (coreNopat2031 *
      (1 + p.terminal_growth) *
      (1 -
        p.terminal_growth /
          p.terminal_ronic)) /
    (p.wacc - p.terminal_growth);
  const assetHealthExcessValue =
    assetHealthExcessNopat *
    continuationFactor(
      p.terminal_asset_health_excess_persistence,
    );
  const intangibleExcessValue =
    intangibleExcessNopat *
    continuationFactor(
      p.terminal_intangible_excess_persistence,
    );
  const terminalValue =
    baseTerminalValue +
    assetHealthExcessValue +
    intangibleExcessValue;
  const pvTerminalValue =
    terminalValue / (1 + p.wacc) ** 6;
  return {
    coreNopat2031,
    assetOnlyNopat2031,
    actualNopat2031,
    assetHealthExcessNopat,
    intangibleExcessNopat,
    baseTerminalValue,
    assetHealthExcessValue,
    intangibleExcessValue,
    terminalValue,
    pvTerminalValue,
  };
}

function runSimulation(
  decisionsByRound:
    | Record<RoundNumber, DecisionSet>
    | null,
  options: SimulationOptions = {},
): GameResult {
  const scenarios =
    options.scenarios ?? ANNUAL_SCENARIOS;
  const validate =
    options.validateDecisions ?? true;

  if (decisionsByRound && validate) {
    for (const round of [1, 2, 3] as const) {
      assertValidDecisionSet(
        decisionsByRound[round],
        round,
      );
    }
  }

  let state = createOpeningState();
  const annual =
    {} as Record<ModelYear, AnnualResult>;
  let pvExplicitUfcf = 0;
  let pvExpectedDistressCost = 0;

  for (const year of YEARS) {
    const round = roundForYear(year);
    let policy: AnnualPolicy;

    if (year <= 2030 && options.policyForYear) {
      policy = options.policyForYear(year);
    } else if (
      year <= 2030 &&
      decisionsByRound &&
      round
    ) {
      policy = policyFromDecision(
        decisionsByRound[round],
      );
    } else {
      policy = neutralPolicy();
    }

    const result = simulateAnnual(
      year,
      state,
      scenarios[year],
      policy,
    );
    annual[year] = result;
    pvExplicitUfcf +=
      result.pvUnleveredFreeCashFlow;
    pvExpectedDistressCost +=
      result.pvDistressCost;
    state = result.closingState;
  }

  const terminal = calculateTerminal(annual[2031]);
  const enterpriseValue =
    pvExplicitUfcf + terminal.pvTerminalValue;
  const impliedEquityValue =
    enterpriseValue - BASELINE_2025.net_debt;
  const finalGameValue =
    impliedEquityValue -
    pvExpectedDistressCost;

  return {
    modelVersion: MODEL_VERSION,
    annual,
    terminal,
    valuation: {
      pvExplicitUfcf,
      pvExpectedDistressCost,
      enterpriseValue,
      openingNetDebt: BASELINE_2025.net_debt,
      impliedEquityValue,
      finalGameValue,
    },
  };
}

export interface RoundSimulationResult {
  modelVersion: ModelVersion;
  round: RoundNumber;
  decisions: DecisionSet;
  annual: Partial<Record<ModelYear, AnnualResult>>;
  openingState: ModelState;
  closingState: ModelState;
  finalYear: AnnualResult;
}

export function simulateRound(
  openingState: ModelState,
  decisions: DecisionSet,
  round: RoundNumber,
): RoundSimulationResult {
  assertValidDecisionSet(decisions, round);
  const years: readonly ModelYear[] =
    round === 1
      ? [2026]
      : round === 2
        ? [2027, 2028]
        : [2029, 2030];

  let state = openingState;
  const annual: Partial<Record<ModelYear, AnnualResult>> = {};
  let finalYear: AnnualResult | null = null;

  for (const year of years) {
    const result = simulateAnnual(
      year,
      state,
      ANNUAL_SCENARIOS[year],
      policyFromDecision(decisions),
    );
    annual[year] = result;
    finalYear = result;
    state = result.closingState;
  }

  if (!finalYear) {
    throw new Error("ROUND_HAS_NO_YEARS");
  }

  return {
    modelVersion: MODEL_VERSION,
    round,
    decisions,
    annual,
    openingState,
    closingState: state,
    finalYear,
  };
}

export function simulateGame(
  decisionsByRound: Record<
    RoundNumber,
    DecisionSet
  >,
): GameResult {
  return runSimulation(decisionsByRound);
}

export function simulateIntermediateValue(
  decisionsByRound: Record<
    RoundNumber,
    DecisionSet
  >,
  completedRound: RoundNumber,
): GameResult {
  if (completedRound === 3) {
    return simulateGame(decisionsByRound);
  }

  for (const round of [1, 2, 3] as const) {
    assertValidDecisionSet(
      decisionsByRound[round],
      round,
    );
  }

  const expectedScenario =
    ANNUAL_SCENARIOS[2031];
  const scenarios =
    {} as Record<ModelYear, AnnualScenario>;

  for (const year of YEARS) {
    const round = roundForYear(year);
    scenarios[year] =
      round !== null &&
      round <= completedRound
        ? ANNUAL_SCENARIOS[year]
        : expectedScenario;
  }

  return runSimulation(null, {
    scenarios,
    validateDecisions: false,
    policyForYear: (year) => {
      const round = roundForYear(year);
      if (
        round !== null &&
        round <= completedRound
      ) {
        return policyFromDecision(
          decisionsByRound[round],
        );
      }
      return neutralPolicy();
    },
  });
}

export function simulateAnnualPath(
  decisionsByRound: Record<
    RoundNumber,
    DecisionSet
  >,
): Record<ModelYear, AnnualResult> {
  return simulateGame(decisionsByRound).annual;
}
