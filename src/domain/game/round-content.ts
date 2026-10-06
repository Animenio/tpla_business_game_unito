import {
  BASELINE_2025,
  DECISION_DEFINITIONS,
  type DecisionSet,
  type RoundNumber,
} from "@/src/domain/simulation/v04/spec";

export type RoundObjective =
  | "crescita"
  | "margine"
  | "cassa"
  | "resilienza"
  | "innovazione";

export const ROUND_OBJECTIVES: Array<{
  value: RoundObjective;
  label: string;
}> = [
  { value: "crescita", label: "Crescita" },
  { value: "margine", label: "Margine" },
  { value: "cassa", label: "Cassa" },
  { value: "resilienza", label: "Resilienza" },
  { value: "innovazione", label: "Innovazione" },
];

export const ROUND_CONTENT: Record<
  RoundNumber,
  {
    period: string;
    title: string;
    body: string;
    bullets: string[];
  }
> = {
  1: {
    period: "2026",
    title: "CRESCE IL PREMIUM",
    body:
      "Nel 2026 il mercato globale degli pneumatici resta sostanzialmente stabile. Il segmento Premium cresce più del mercato, mentre la domanda Standard è più debole. Restano volatili cambio e alcuni costi di produzione.",
    bullets: [
      "Il segmento Premium cresce più del mercato complessivo.",
      "La domanda Standard è in lieve contrazione.",
      "Cambio e costi degli input restano volatili.",
    ],
  },
  2: {
    period: "2027–2028",
    title: "CRISI DEI COSTI E GUERRA DEI PREZZI",
    body:
      "Gomma e trasporti diventano più costosi, gli approvvigionamenti sono meno affidabili e aumenta la pressione competitiva sui prezzi Standard.",
    bullets: [
      "Le materie prime e la logistica diventano più costose.",
      "La continuità degli approvvigionamenti è sotto pressione.",
      "La competizione sul segmento Standard si intensifica.",
    ],
  },
  3: {
    period: "2029–2030",
    title: "OPPORTUNITÀ TECNOLOGICA E STRESS FINALE",
    body:
      "Il mercato rallenta, cresce l’interesse per EV e pneumatici connessi, il segmento Standard resta debole e aumentano gli oneri di compliance.",
    bullets: [
      "EV e connected tyre diventano più rilevanti.",
      "La domanda Standard continua a indebolirsi.",
      "Gli oneri di compliance aumentano nel finale della simulazione.",
    ],
  },
};

export const ROUND_ONE_FIGMA_DEFAULTS: DecisionSet = {
  hv_price_change: 0.02,
  std_price_change: 0,
  marketing_change: 0.1,
  rnd_pct: 0.05,
  capex_pct: 0.07,
  inventory_days: 140,
  receivable_days: 34,
  natural_rubber_hedge: 0.65,
  connected_rnd_allocation: 0.25,
};

export const DECISION_HELP: Record<keyof DecisionSet, string> = {
  hv_price_change:
    "Prezzo più alto = più margine unitario, ma può ridurre la domanda.",
  std_price_change:
    "Nel segmento Standard i clienti sono più sensibili al prezzo e alla concorrenza.",
  marketing_change:
    "Costa nel breve periodo, ma può rafforzare marca e domanda nel tempo.",
  rnd_pct:
    "Più R&S può aumentare innovazione e competitività futura.",
  connected_rnd_allocation:
    "Decide quanta R&S viene concentrata su connected tyre e capacità digitali.",
  capex_pct:
    "Influenza impianti, capacità produttiva, ammortamenti e cassa.",
  inventory_days:
    "Più scorte proteggono da problemi di fornitura, ma immobilizzano più capitale.",
  receivable_days:
    "Tempi più lunghi possono sostenere le vendite, ma assorbono cassa.",
  natural_rubber_hedge:
    "Più copertura riduce l’esposizione ai rincari della gomma, ma ha un costo.",
};

export const DECISION_GROUPS: Array<{
  title: string;
  keys: Array<keyof DecisionSet>;
}> = [
  {
    title: "MERCATO",
    keys: ["hv_price_change", "std_price_change", "marketing_change"],
  },
  {
    title: "INNOVAZIONE E INVESTIMENTI",
    keys: ["rnd_pct", "connected_rnd_allocation", "capex_pct"],
  },
  {
    title: "CASSA E RISCHIO",
    keys: ["inventory_days", "receivable_days", "natural_rubber_hedge"],
  },
];

export const BASELINE_DISPLAY = {
  revenueBn: BASELINE_2025.revenue / 1000,
  ebitdaMargin: BASELINE_2025.adjusted_ebitda_margin,
  premiumShare: BASELINE_2025.premium_share,
  netDebtBn: BASELINE_2025.net_debt / 1000,
};

export function decisionDefinition(key: keyof DecisionSet) {
  return DECISION_DEFINITIONS[key];
}

export function objectiveLabel(value: string) {
  return (
    ROUND_OBJECTIVES.find((objective) => objective.value === value)?.label ??
    value
  );
}

export function roundNumber(value: number): RoundNumber {
  if (value !== 1 && value !== 2 && value !== 3) {
    throw new Error("ROUND_OUT_OF_RANGE");
  }
  return value;
}
