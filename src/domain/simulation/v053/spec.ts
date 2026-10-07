export const MODEL_VERSION = "aurora-tyres-v0.5.3-rc.1" as const;

export type ModelVersion = typeof MODEL_VERSION;
export type RoundNumber = 1 | 2 | 3;
export type ModelYear = 2026 | 2027 | 2028 | 2029 | 2030 | 2031;
export type RndOrientation = "Core" | "Bilanciato" | "Connected";
export type ResiliencePolicy = "Snella" | "Standard" | "Robusta";

export interface DecisionSet {
  premium_price_positioning: number;
  standard_price_positioning: number;
  marketing_change: number;
  rnd_pct: number;
  rnd_orientation: RndOrientation;
  capex_pct: number;
  resilience_policy: ResiliencePolicy;
}

export interface DecisionDefinition {
  label: string;
  min?: number;
  max?: number;
  step?: number;
  unit: string;
  values?: readonly string[];
}

export const DECISION_DEFINITIONS: Record<keyof DecisionSet, DecisionDefinition> = {
  premium_price_positioning: {
    label: "Posizionamento prezzo Premium rispetto ai concorrenti",
    min: -0.10,
    max: 0.10,
    step: 0.01,
    unit: "% vs concorrenti",
  },
  standard_price_positioning: {
    label: "Posizionamento prezzo Standard rispetto ai concorrenti",
    min: -0.10,
    max: 0.10,
    step: 0.01,
    unit: "% vs concorrenti",
  },
  marketing_change: {
    label: "Budget marketing",
    min: -0.50,
    max: 1.00,
    step: 0.05,
    unit: "% vs baseline",
  },
  rnd_pct: {
    label: "Spesa in R&S",
    min: 0.02,
    max: 0.08,
    step: 0.005,
    unit: "% ricavi",
  },
  rnd_orientation: {
    label: "Orientamento R&S",
    unit: "categoria",
    values: ["Core", "Bilanciato", "Connected"],
  },
  capex_pct: {
    label: "Investimenti (CapEx)",
    min: 0.03,
    max: 0.10,
    step: 0.005,
    unit: "% ricavi",
  },
  resilience_policy: {
    label: "Politica di resilienza della supply chain",
    unit: "categoria",
    values: ["Snella", "Standard", "Robusta"],
  },
};

export const ORIENTATION_CONNECTED_SHARE: Record<RndOrientation, number> = {
  Core: 0.10,
  Bilanciato: 0.30,
  Connected: 0.50,
};

export const RESILIENCE_MAPPING: Record<ResiliencePolicy, { inventoryDays: number; naturalRubberHedge: number }> = {
  Snella: { inventoryDays: 125, naturalRubberHedge: 0 },
  Standard: { inventoryDays: 140, naturalRubberHedge: 0.30 },
  Robusta: { inventoryDays: 160, naturalRubberHedge: 0.70 },
};

export const DEFAULT_DECISIONS: Record<RoundNumber, DecisionSet> = {
  1: {
    premium_price_positioning: 0,
    standard_price_positioning: 0,
    marketing_change: 0,
    rnd_pct: 0.045,
    rnd_orientation: "Bilanciato",
    capex_pct: 0.065,
    resilience_policy: "Standard",
  },
  2: {
    premium_price_positioning: 0,
    standard_price_positioning: 0,
    marketing_change: 0.15,
    rnd_pct: 0.055,
    rnd_orientation: "Bilanciato",
    capex_pct: 0.070,
    resilience_policy: "Robusta",
  },
  3: {
    premium_price_positioning: 0,
    standard_price_positioning: 0,
    marketing_change: 0.10,
    rnd_pct: 0.060,
    rnd_orientation: "Connected",
    capex_pct: 0.070,
    resilience_policy: "Standard",
  },
};

export interface AnnualScenario {
  premium_market_growth: number;
  standard_market_growth: number;
  premium_competitor_price_growth: number;
  standard_competitor_price_growth: number;
  natural_rubber_forward: number;
  natural_rubber_spot: number;
  synthetic_rubber_index: number;
  energy_logistics_index: number;
  fx_effect: number;
  cost_of_debt: number;
  competitive_pressure: number;
  ev_new_car_share: number;
  technology_opportunity: number;
  regulatory_burden: number;
  global_macro_growth: number;
  supply_disruption: number;
}

export const ANNUAL_SCENARIOS: Record<ModelYear, AnnualScenario> = {
  2026: {
    premium_market_growth: 0.05,
    standard_market_growth: -0.02,
    premium_competitor_price_growth: 0.02,
    standard_competitor_price_growth: 0.01,
    natural_rubber_forward: 1.07,
    natural_rubber_spot: 1.05,
    synthetic_rubber_index: 1.04,
    energy_logistics_index: 1.10,
    fx_effect: -0.035,
    cost_of_debt: 0.045,
    competitive_pressure: 0,
    ev_new_car_share: 0.28,
    technology_opportunity: 0.10,
    regulatory_burden: 0.002,
    global_macro_growth: 0.029,
    supply_disruption: 0.10,
  },
  2027: {
    premium_market_growth: 0.0348912986396204,
    standard_market_growth: -0.0500526330369666,
    premium_competitor_price_growth: 0.04470091413763,
    standard_competitor_price_growth: -0.00652126343841664,
    natural_rubber_forward: 1.30,
    natural_rubber_spot: 1.38,
    synthetic_rubber_index: 1.18,
    energy_logistics_index: 1.25,
    fx_effect: -0.005,
    cost_of_debt: 0.05,
    competitive_pressure: 0.10,
    ev_new_car_share: 0.34,
    technology_opportunity: 0.45,
    regulatory_burden: 0.005,
    global_macro_growth: 0.029,
    supply_disruption: 1.0,
  },
  2028: {
    premium_market_growth: 0.0348912986396204,
    standard_market_growth: -0.0500526330369666,
    premium_competitor_price_growth: 0.04470091413763,
    standard_competitor_price_growth: -0.00652126343841664,
    natural_rubber_forward: 1.30,
    natural_rubber_spot: 1.38,
    synthetic_rubber_index: 1.18,
    energy_logistics_index: 1.25,
    fx_effect: -0.005,
    cost_of_debt: 0.05,
    competitive_pressure: 0.10,
    ev_new_car_share: 0.34,
    technology_opportunity: 0.45,
    regulatory_burden: 0.005,
    global_macro_growth: 0.029,
    supply_disruption: 1.0,
  },
  2029: {
    premium_market_growth: 0.0592450141492289,
    standard_market_growth: -0.071345058700488,
    premium_competitor_price_growth: 0.024987804805501,
    standard_competitor_price_growth: -0.0151142198203895,
    natural_rubber_forward: 1.22,
    natural_rubber_spot: 1.12,
    synthetic_rubber_index: 1.15,
    energy_logistics_index: 1.18,
    fx_effect: -0.0075,
    cost_of_debt: 0.04,
    competitive_pressure: 0.07,
    ev_new_car_share: 0.40,
    technology_opportunity: 1.0,
    regulatory_burden: 0.014,
    global_macro_growth: 0.0275,
    supply_disruption: 0.60,
  },
  2030: {
    premium_market_growth: 0.0592450141492289,
    standard_market_growth: -0.071345058700488,
    premium_competitor_price_growth: 0.024987804805501,
    standard_competitor_price_growth: -0.0151142198203895,
    natural_rubber_forward: 1.22,
    natural_rubber_spot: 1.12,
    synthetic_rubber_index: 1.15,
    energy_logistics_index: 1.18,
    fx_effect: -0.0075,
    cost_of_debt: 0.04,
    competitive_pressure: 0.07,
    ev_new_car_share: 0.40,
    technology_opportunity: 1.0,
    regulatory_burden: 0.014,
    global_macro_growth: 0.0275,
    supply_disruption: 0.60,
  },
  2031: {
    premium_market_growth: 0.02,
    standard_market_growth: 0.02,
    premium_competitor_price_growth: 0.02,
    standard_competitor_price_growth: 0.02,
    natural_rubber_forward: 1.12,
    natural_rubber_spot: 1.12,
    synthetic_rubber_index: 1.15,
    energy_logistics_index: 1.18,
    fx_effect: 0,
    cost_of_debt: 0.04,
    competitive_pressure: 0,
    ev_new_car_share: 0.42,
    technology_opportunity: 0.50,
    regulatory_burden: 0.005,
    global_macro_growth: 0.03,
    supply_disruption: 0,
  },
};

export const BASELINE_2025 = {
  revenue: 5624.246,
  premium_share: 0.79,
  standard_share: 0.21,
  premium_revenue: 4443.15434,
  standard_revenue: 1181.09166,
  adjusted_ebitda: 1285.089,
  adjusted_ebit: 897.562,
  net_income_reported: 440.481,
  capex: 348.351,
  capex_pct: 0.06194,
  rnd_expense: 259.541,
  rnd_pct: 0.04615,
  net_debt: 914.66,
  fixed_assets: 7132.273,
  inventories: 1208.065,
  trade_receivables: 521.655,
  trade_payables: 1728.392,
  other_working_capital: -59.345,
  net_working_capital: -58.017,
  equity: 5359.061,
  provisions: 800.535,
  da_proxy: 387.527,
  marketing_pct: 0.03,
  premium_variable_cost_base: 2443.734887,
  standard_variable_cost_base: 826.764162,
  fixed_opex_base: 640.389571,
  receivable_days: 33.8541513,
  inventory_days: 134.8246,
  payable_days: 192.89505,
  production_capacity_index: 1.05,
  connected_rnd_share: 0.20,
} as const;

export const MODEL_PARAMETERS = {
  wacc: 0.08,
  tax_rate: 0.30,
  payout: 0.50,
  terminal_growth: 0.02,
  terminal_ronic: 0.20,
  net_cash_yield: 0.015,
  non_commodity_inflation: 0.02,
  fixed_opex_capacity_share: 0.60,
  inventory_carrying_cost: 0.03,
  distress_cost_per_leverage_point: 0.02,
  leverage_threshold: 1.5,
  leverage_penalty_cap: 5.0,
  premium_price_elasticity: 2.3638,
  standard_price_elasticity: 5.2,
  elasticity_multiplier_min: 0.8,
  elasticity_multiplier_max: 1.2,
  pricing_power_brand: 0.3,
  pricing_power_innovation: 0.3,
  immediate_marketing_premium: 0.020,
  immediate_marketing_standard: 0.011,
  brand_to_premium_demand: 0.12,
  brand_to_standard_demand: 0.06,
  innovation_to_premium_demand: 0.16,
  digital_to_technology_opportunity: 0.18,
  asset_health_to_premium_demand: 0.03,
  competition_sensitivity_premium: 0.18,
  competition_sensitivity_standard: 0.70,
  macro_sensitivity: 0.25,
  ev_share_sensitivity_premium: 0.05,
  credit_sensitivity: 0.0009,
  credit_concavity_scale: 15.0,
  innovation_persistence: 0.85,
  innovation_coefficient: 4.3669,
  brand_persistence: 0.80,
  brand_coefficient: 0.20,
  digital_persistence: 0.85,
  digital_coefficient: 10.0,
  asset_persistence: 0.94,
  asset_coefficient: 3.0,
  asset_cost_efficiency: 0.08,
  innovation_cost_efficiency: 0.025,
  capacity_response: 0.90,
  maintenance_capex_pct: 0.05639,
  capex_diminishing_threshold: 0.08,
  capex_excess_multiplier: 0.25,
  rnd_diminishing_threshold: 0.060,
  rnd_excess_multiplier: 0.40,
  marketing_positive_diminishing_threshold: 0.25,
  marketing_positive_excess_multiplier: 0.35,
  marketing_cut_multiplier: 1.50,
  marketing_immediate_cut_multiplier: 1.25,
  asset_to_capacity_effect: 0.04,
  base_inventory_requirement_days: 121.3,
  supply_shock_addon_days: 25.0,
  inventory_shortage_sensitivity: 0.0025,
  stockout_smoothing_width_days: 8.0,
  asset_reliability_base: 0.90,
  asset_reliability_slope: 0.10,
  asset_reliability_floor: 0.88,
  natural_rubber_variable_cost_share: 0.16,
  synthetic_rubber_variable_cost_share: 0.15,
  energy_freight_variable_cost_share: 0.10,
  other_variable_cost_share: 0.59,
  hedge_effectiveness: 0.60,
  hedge_premium: 0.01,
  da_persistence: 0.85,
  asset_life_years: 7.0,
  oem_innovation_weight: 0.35,
  oem_digital_weight: 0.45,
  oem_asset_weight: 0.20,
  oem_logistic_width: 0.025,
  oem_demand_low: -0.06,
  oem_demand_high: 0.08,
  brand_erosion_per_unserved_premium: 0.50,
  strategic_health_innovation_weight: 0.28,
  strategic_health_brand_weight: 0.24,
  strategic_health_digital_weight: 0.23,
  strategic_health_asset_weight: 0.25,
  competitive_position_brand_weight: 0.28,
  competitive_position_innovation_weight: 0.30,
  competitive_position_digital_weight: 0.17,
  competitive_position_asset_weight: 0.15,
  competitive_position_market_share_weight: 0.10,
  fixed_receivable_days: 34.0,
  neutral_connected_share: 0.20,
  neutral_inventory_days: 135.0,
  terminal_intangible_excess_persistence: 0.88,
  opening_productive_capacity_index: 1.05,
  capacity_allocation_smoothing_width: 0.01,
  terminal_asset_health_excess_persistence: 0.94,
  oem_upper_threshold: 1.08,
  oem_lower_threshold: 0.92,
  standard_contractual_share: 0.25,
} as const;

export const MODEL_DESIGN = {
  inventory_shortage_hits_sales_not_plant_capacity: true,
  oem_effect_scaled_by_technology_opportunity: true,
} as const;
