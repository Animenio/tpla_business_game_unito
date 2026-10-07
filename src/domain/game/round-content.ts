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

export const COMPETITOR_SCALE_REFERENCE = [
  { name: "Michelin", revenueBn: 31.92, country: "Francia" },
  { name: "Bridgestone", revenueBn: 28.45, country: "Giappone" },
  { name: "Goodyear", revenueBn: 18.88, country: "Stati Uniti" },
  { name: "Continental", revenueBn: 16.27, country: "Germania" },
] as const;

export const DECISION_HELP: Record<keyof DecisionSet, string> = {
  hv_price_change:
    "Variazione del prezzo Premium rispetto al livello di partenza del round. Un prezzo più alto può aumentare il margine unitario ma ridurre la domanda.",
  std_price_change:
    "Variazione del prezzo Standard rispetto al livello di partenza del round. Nel segmento Standard i clienti sono più sensibili al prezzo e alla concorrenza.",
  marketing_change:
    "Variazione del budget marketing rispetto al baseline. Più marketing costa nel breve periodo ma può sostenere marca e domanda nel tempo.",
  rnd_pct:
    "Quota dei ricavi destinata a Ricerca & Sviluppo. Più R&S può aumentare innovazione e competitività futura.",
  connected_rnd_allocation:
    "Quota della R&S totale concentrata su connected tyre e capacità digitali.",
  capex_pct:
    "Quota dei ricavi destinata agli investimenti. Influenza impianti, capacità produttiva, ammortamenti e cassa.",
  inventory_days:
    "Giorni di scorte target. Più scorte proteggono da problemi di fornitura ma immobilizzano più capitale.",
  receivable_days:
    "Tempo medio di incasso concesso ai clienti. Tempi più lunghi possono sostenere le vendite ma assorbono cassa.",
  natural_rubber_hedge:
    "Quota dell’esposizione alla gomma naturale coperta. Una copertura maggiore riduce l’esposizione ai rincari ma ha un costo.",
};

export const DECISION_BASELINE_CONTEXT: Record<keyof DecisionSet, string> = {
  hv_price_change: "0% significa mantenere invariato il prezzo rispetto al livello di partenza.",
  std_price_change: "0% significa mantenere invariato il prezzo rispetto al livello di partenza.",
  marketing_change: "0% significa mantenere il budget marketing al livello baseline.",
  rnd_pct:
    "Nel 2025 Aurora Tyres ha speso circa " +
    (BASELINE_2025.rnd_pct * 100).toFixed(1) +
    "% dei ricavi commerciali in R&S.",
  capex_pct:
    "Nel 2025 il CapEx gestionale era circa " +
    (BASELINE_2025.capex_pct * 100).toFixed(1) +
    "% dei ricavi commerciali.",
  inventory_days:
    "Il livello 2025 riconciliato è circa " +
    Math.round(BASELINE_2025.inventory_days) +
    " giorni.",
  receivable_days:
    "Il tempo medio di incasso 2025 riconciliato è circa " +
    Math.round(BASELINE_2025.receivable_days) +
    " giorni.",
  natural_rubber_hedge:
    "Il materiale storico non fornisce una percentuale unica di copertura 2025: il valore va scelto dal team.",
  connected_rnd_allocation:
    "Il materiale storico non fornisce una quota univoca di R&S connected 2025: il valore va scelto dal team.",
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
