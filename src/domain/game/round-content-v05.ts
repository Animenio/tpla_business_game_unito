import {
  BASELINE_2025,
  DECISION_DEFINITIONS,
  type DecisionSet,
  type RoundNumber,
} from "@/src/domain/simulation/v05/spec";

export const V05_DECISION_HELP: Record<keyof DecisionSet, string> = {
  premium_price_positioning:
    "Posizionamento del prezzo Premium rispetto ai concorrenti. Un valore positivo significa un prezzo sopra il mercato; aumenta il margine unitario ma riduce la domanda secondo l’elasticità del segmento.",
  standard_price_positioning:
    "Posizionamento del prezzo Standard rispetto ai concorrenti. Il segmento Standard è più sensibile al prezzo e può essere razionato quando la capacità è scarsa.",
  marketing_change:
    "Variazione del budget marketing rispetto al baseline. Ha un costo immediato e costruisce brand nel tempo.",
  rnd_pct:
    "Quota dei ricavi destinata a R&S. La spesa alimenta innovazione e digitale in funzione dell’orientamento scelto.",
  rnd_orientation:
    "Definisce come viene ripartito il budget R&S già scelto. Core concentra la ricerca sul prodotto pneumatico tradizionale e dedica il 10% al connected; Bilanciato dedica il 30% al connected; Connected dedica il 50% a dati, sensori e capacità digitali. Connected è disponibile dal Round 2.",
  capex_pct:
    "Quota dei ricavi destinata agli investimenti. La capacità aggiuntiva entra con un anno di ritardo e il CapEx assorbe cassa oggi.",
  resilience_policy:
    "Combina scorte e copertura della gomma. Snella usa meno capitale ma lascia più esposizione agli shock; Standard cerca un equilibrio; Robusta aumenta protezione e continuità operativa, ma immobilizza più capitale.",
};

export const V05_DECISION_BASELINE_CONTEXT: Record<keyof DecisionSet, string> = {
  premium_price_positioning:
    "0% significa allinearsi al prezzo dei concorrenti nello scenario annunciato.",
  standard_price_positioning:
    "0% significa allinearsi al prezzo dei concorrenti nello scenario annunciato.",
  marketing_change:
    "0% mantiene il budget marketing al livello baseline.",
  rnd_pct:
    "Nel 2025 Aurora Tyres ha destinato circa " +
    (BASELINE_2025.rnd_pct * 100).toFixed(1) +
    "% dei ricavi alla R&S.",
  rnd_orientation:
    "La scelta modifica la composizione della R&S, non il budget totale.",
  capex_pct:
    "Nel 2025 il CapEx gestionale era circa " +
    (BASELINE_2025.capex_pct * 100).toFixed(1) +
    "% dei ricavi.",
  resilience_policy:
    "Il livello 2025 delle scorte era circa " +
    Math.round(BASELINE_2025.inventory_days) +
    " giorni. La politica di resilienza combina scorte e copertura commodity.",
};

export const V05_DECISION_GROUPS: Array<{
  title: string;
  keys: Array<keyof DecisionSet>;
}> = [
  {
    title: "MERCATO",
    keys: [
      "premium_price_positioning",
      "standard_price_positioning",
      "marketing_change",
    ],
  },
  {
    title: "INNOVAZIONE E INVESTIMENTI",
    keys: ["rnd_pct", "capex_pct"],
  },
  {
    title: "RESILIENZA",
    keys: ["resilience_policy"],
  },
];

export function v05DecisionDefinition(key: keyof DecisionSet) {
  return DECISION_DEFINITIONS[key];
}

export function v05OrientationOptions(round: RoundNumber) {
  return round === 1
    ? (["Core", "Bilanciato"] as const)
    : (["Core", "Bilanciato", "Connected"] as const);
}



export const V05_ORIENTATION_LABELS = {
  Core: "Core — focus prodotto",
  Bilanciato: "Bilanciato — equilibrio prodotto/digitale",
  Connected: "Connected — focus digitale e connected tyre",
} as const;

export const V05_ORIENTATION_GUIDE = {
  Core:
    "90% della R&S sul core tyre e 10% sul connected. Privilegia prodotto, processo e tecnologia pneumatico.",
  Bilanciato:
    "70% della R&S sul core tyre e 30% sul connected. Mantiene equilibrio tra prodotto tradizionale e capacità digitali.",
  Connected:
    "50% della R&S sul core tyre e 50% sul connected. Aumenta il focus su sensori, dati e servizi digitali; disponibile dal Round 2.",
} as const;

export const V05_RESILIENCE_LABELS = {
  Snella: "Snella — meno capitale, più esposizione",
  Standard: "Standard — equilibrio",
  Robusta: "Robusta — più protezione, più capitale",
} as const;

export const V05_RESILIENCE_GUIDE = {
  Snella:
    "125 giorni di scorte e 0% di hedge. Riduce capitale immobilizzato, ma lascia maggiore esposizione a shock di fornitura e commodity.",
  Standard:
    "140 giorni di scorte e 30% di hedge. Compromesso tra continuità operativa, costo della protezione e capitale circolante.",
  Robusta:
    "160 giorni di scorte e 70% di hedge. Aumenta protezione e continuità, ma assorbe più capitale e può avere un costo maggiore.",
} as const;

export const V05_DECISION_COUNT = 6;

export const V05_ROUND_DECISION_FOCUS: Record<
  RoundNumber,
  {
    title: string;
    body: string;
  }
> = {
  1: {
    title: "Costruite capacità prima che serva",
    body:
      "CapEx e R&S hanno effetti che proseguono nei round successivi. La capacità aggiuntiva entra con un anno di ritardo: il Round 1 serve anche a preparare il 2027–2028, non solo a massimizzare il risultato immediato.",
  },
  2: {
    title: "Gestite il trade-off tra protezione e cassa",
    body:
      "La politica di resilienza combina scorte e copertura della gomma. Più protezione riduce alcune esposizioni operative, ma assorbe capitale e può avere un costo: valutate il compromesso insieme a prezzi, margini e investimenti.",
  },
  3: {
    title: "La tecnologia premia la preparazione accumulata",
    body:
      "Nel finale diventano più rilevanti EV e connected tyre. L’orientamento della R&S modifica la composizione dell’innovazione, mentre le scelte dei round precedenti continuano a influenzare capacità, brand e solidità strategica.",
  },
};
