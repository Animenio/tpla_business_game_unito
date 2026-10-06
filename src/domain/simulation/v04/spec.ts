export const MODEL_VERSION = "aurora-tyres-v0.4" as const;

export type ModelVersion = typeof MODEL_VERSION;
export type RoundNumber = 1 | 2 | 3;

export interface DecisionSet {
  hv_price_change: number;
  std_price_change: number;
  marketing_change: number;
  rnd_pct: number;
  capex_pct: number;
  inventory_days: number;
  receivable_days: number;
  natural_rubber_hedge: number;
  connected_rnd_allocation: number;
}

export interface DecisionDefinition {
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}

export const DECISION_DEFINITIONS: Record<keyof DecisionSet, DecisionDefinition> = {
  hv_price_change: {
    label: "Prezzo prodotti Premium",
    min: -0.1,
    max: 0.15,
    step: 0.01,
    unit: "%",
  },
  std_price_change: {
    label: "Prezzo prodotti Standard",
    min: -0.15,
    max: 0.1,
    step: 0.01,
    unit: "%",
  },
  marketing_change: {
    label: "Budget marketing",
    min: -0.5,
    max: 1,
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
  capex_pct: {
    label: "Investimenti (CapEx)",
    min: 0.03,
    max: 0.1,
    step: 0.005,
    unit: "% ricavi",
  },
  inventory_days: {
    label: "Scorte di magazzino (giorni)",
    min: 90,
    max: 170,
    step: 5,
    unit: "giorni",
  },
  receivable_days: {
    label: "Tempo medio di incasso dai clienti",
    min: 25,
    max: 60,
    step: 1,
    unit: "giorni",
  },
  natural_rubber_hedge: {
    label: "Copertura del costo della gomma",
    min: 0,
    max: 0.8,
    step: 0.05,
    unit: "% exposure",
  },
  connected_rnd_allocation: {
    label: "R&S su pneumatici connessi",
    min: 0,
    max: 0.6,
    step: 0.05,
    unit: "% R&S",
  },
};

export const BALANCED_DECISIONS: Record<RoundNumber, DecisionSet> = {
  1: {
    hv_price_change: 0.02,
    std_price_change: 0,
    marketing_change: 0,
    rnd_pct: 0.046,
    capex_pct: 0.065,
    inventory_days: 135,
    receivable_days: 34,
    natural_rubber_hedge: 0.5,
    connected_rnd_allocation: 0.2,
  },
  2: {
    hv_price_change: 0.03,
    std_price_change: -0.03,
    marketing_change: 0.15,
    rnd_pct: 0.055,
    capex_pct: 0.07,
    inventory_days: 150,
    receivable_days: 33,
    natural_rubber_hedge: 0.7,
    connected_rnd_allocation: 0.3,
  },
  3: {
    hv_price_change: 0.02,
    std_price_change: -0.02,
    marketing_change: 0.1,
    rnd_pct: 0.06,
    capex_pct: 0.07,
    inventory_days: 135,
    receivable_days: 32,
    natural_rubber_hedge: 0.6,
    connected_rnd_allocation: 0.4,
  },
};

export interface ExternalScenario {
  duration_years: 1 | 2;
  tyre_market_growth_context: number;
  premium_market_growth: number;
  standard_market_growth: number;
  natural_rubber_index: number;
  synthetic_rubber_index: number;
  energy_logistics_index: number;
  fx_effect: number;
  cost_of_debt: number;
  competitive_price_pressure: number;
  ev_new_car_share: number;
  technology_opportunity_index: number;
  regulatory_compliance_burden: number;
  global_macro_growth: number;
  supply_disruption_index: number;
  premium_market_price_change: number;
  standard_market_price_change: number;
}

export const ROUND_SCENARIOS: Record<RoundNumber, ExternalScenario> = {
  1: {
    duration_years: 1,
    tyre_market_growth_context: 0,
    premium_market_growth: 0.05,
    standard_market_growth: -0.02,
    natural_rubber_index: 1.07,
    synthetic_rubber_index: 1.04,
    energy_logistics_index: 1.1,
    fx_effect: -0.035,
    cost_of_debt: 0.045,
    competitive_price_pressure: 0,
    ev_new_car_share: 0.28,
    technology_opportunity_index: 0.1,
    regulatory_compliance_burden: 0.002,
    global_macro_growth: 0.029,
    supply_disruption_index: 0.1,
    premium_market_price_change: 0.02,
    standard_market_price_change: 0.01,
  },
  2: {
    duration_years: 2,
    tyre_market_growth_context: -0.005,
    premium_market_growth: 0.071,
    standard_market_growth: -0.0976,
    natural_rubber_index: 1.3,
    synthetic_rubber_index: 1.18,
    energy_logistics_index: 1.25,
    fx_effect: -0.005,
    cost_of_debt: 0.05,
    competitive_price_pressure: 0.1,
    ev_new_car_share: 0.34,
    technology_opportunity_index: 0.45,
    regulatory_compliance_burden: 0.005,
    global_macro_growth: 0.029,
    supply_disruption_index: 1,
    premium_market_price_change: 0.0914,
    standard_market_price_change: -0.013,
  },
  3: {
    duration_years: 2,
    tyre_market_growth_context: -0.04,
    premium_market_growth: 0.122,
    standard_market_growth: -0.1376,
    natural_rubber_index: 1.22,
    synthetic_rubber_index: 1.15,
    energy_logistics_index: 1.18,
    fx_effect: -0.0075,
    cost_of_debt: 0.04,
    competitive_price_pressure: 0.07,
    ev_new_car_share: 0.4,
    technology_opportunity_index: 1,
    regulatory_compliance_burden: 0.014,
    global_macro_growth: 0.0275,
    supply_disruption_index: 0.6,
    premium_market_price_change: 0.0506,
    standard_market_price_change: -0.03,
  },
};

export const BASELINE_2025 = {
  revenue: 5624.245999999999,
  premium_share: 0.79,
  standard_share: 0.21,
  adjusted_ebitda: 1285.089,
  adjusted_ebitda_margin: 0.228,
  adjusted_ebit: 897.562,
  adjusted_ebit_margin: 0.16,
  net_income: 440.481,
  capex: 348.351,
  capex_pct: 0.06194,
  rnd_expense: 259.541,
  rnd_pct: 0.04615,
  net_debt: 914.66,
  fixed_assets_basis: 7132.273,
  inventories: 1208.065,
  trade_receivables: 521.655,
  trade_payables: 1728.392,
  operating_nwc: 1.328,
  other_working_capital: -59.345,
  net_working_capital: -58.017,
  net_invested_capital: 7074.256,
  equity: 5359.061,
  provisions: 800.535,
  premium_revenue: 4443.154339999999,
  standard_revenue: 1181.0916599999998,
  adjusted_da_proxy: 387.52699999999993,
  base_marketing_pct: 0.03,
  base_premium_variable_cost_pct: 0.55,
  base_standard_variable_cost_pct: 0.7,
  receivable_days: 33.85415129423571,
  inventory_days: 134.82459966922315,
  payable_days: 192.8950507393956,
  production_capacity_index: 1.05,
  connected_rnd_allocation: 0.2,
  anonymization_factor: 0.83,
} as const;

export const MODEL_PARAMETERS = {
  hv_price_elasticity: 0.4,
  standard_price_elasticity: 0.85,
  hv_relative_price_sensitivity: 0.55,
  standard_relative_price_sensitivity: 0.85,
  immediate_marketing_hv: 0.015,
  immediate_marketing_standard: 0.008,
  brand_to_hv_demand: 0.12,
  brand_to_standard_demand: 0.06,
  innovation_to_hv_demand: 0.16,
  digital_to_tech_opportunity: 0.18,
  asset_health_to_hv_demand: 0.03,
  competition_sensitivity_hv: 0.18,
  competition_sensitivity_standard: 0.7,
  pricing_power_brand: 0.3,
  pricing_power_innovation: 0.3,
  innovation_decay: 0.92,
  innovation_rnd_coefficient: 4.5,
  connected_general_rnd_tradeoff: 0.25,
  brand_decay: 0.9,
  brand_marketing_coefficient: 0.18,
  digital_readiness_decay: 0.9,
  digital_readiness_coefficient: 5,
  asset_health_decay: 0.94,
  asset_health_capex_coefficient: 3,
  natural_rubber_variable_cost_share: 0.25,
  synthetic_rubber_variable_cost_share: 0.15,
  energy_freight_variable_cost_share: 0.1,
  other_variable_cost_share: 0.5,
  hedge_effectiveness: 0.6,
  hedge_premium: 0.01,
  capacity_response_to_capex: 0.9,
  maintenance_capex_pct: 0.05,
  asset_health_cost_efficiency: 0.08,
  tax_rate: 0.3,
  wacc: 0.08,
  base_terminal_growth: 0.02,
  strategic_health_terminal_growth_coefficient: 0.02,
  strategic_health_terminal_value_factor: 0.8,
  max_net_debt_to_ebitda: 2.5,
  inventory_shortage_sensitivity: 0.0025,
  customer_credit_demand_sensitivity: 0.0006,
  base_required_safety_inventory_days: 115,
  supply_shock_safety_stock_addon_days: 25,
  base_connected_rnd_allocation: 0.2,
  oem_innovation_weight: 0.35,
  oem_digital_weight: 0.45,
  oem_asset_weight: 0.2,
  oem_win_threshold: 1.08,
  oem_fail_threshold: 0.92,
  oem_demand_bonus: 0.08,
  oem_demand_penalty: -0.06,
  strategic_health_innovation_weight: 0.28,
  strategic_health_brand_weight: 0.24,
  strategic_health_digital_weight: 0.23,
  strategic_health_asset_weight: 0.25,
  competitive_position_brand_weight: 0.28,
  competitive_position_innovation_weight: 0.3,
  competitive_position_digital_weight: 0.17,
  competitive_position_asset_weight: 0.15,
  competitive_position_market_share_weight: 0.1,
} as const;
