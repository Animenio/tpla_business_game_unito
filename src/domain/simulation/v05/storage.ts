import {
  MODEL_VERSION,
  ORIENTATION_CONNECTED_SHARE,
  RESILIENCE_MAPPING,
  type DecisionSet,
  type ResiliencePolicy,
  type RndOrientation,
  type RoundNumber,
} from "./spec";

export { MODEL_VERSION as V05_MODEL_VERSION };

export interface StoredDecisionRow {
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

function closestOrientation(
  share: number,
  round: RoundNumber,
): RndOrientation {
  const allowed: RndOrientation[] =
    round === 1
      ? ["Core", "Bilanciato"]
      : ["Core", "Bilanciato", "Connected"];

  return allowed.reduce((best, candidate) =>
    Math.abs(ORIENTATION_CONNECTED_SHARE[candidate] - share) <
    Math.abs(ORIENTATION_CONNECTED_SHARE[best] - share)
      ? candidate
      : best,
  );
}

function resilienceDistance(
  policy: ResiliencePolicy,
  inventoryDays: number,
  hedge: number,
): number {
  const mapped = RESILIENCE_MAPPING[policy];
  // Normalize both dimensions to roughly one UI step so neither dominates.
  return (
    Math.abs(mapped.inventoryDays - inventoryDays) / 20 +
    Math.abs(mapped.naturalRubberHedge - hedge) / 0.4
  );
}

function closestResilience(
  inventoryDays: number,
  hedge: number,
): ResiliencePolicy {
  const policies: ResiliencePolicy[] = ["Snella", "Standard", "Robusta"];
  return policies.reduce((best, candidate) =>
    resilienceDistance(candidate, inventoryDays, hedge) <
    resilienceDistance(best, inventoryDays, hedge)
      ? candidate
      : best,
  );
}

export function decisionFromStoredRow(
  row: StoredDecisionRow,
  round: RoundNumber,
): DecisionSet {
  return {
    premium_price_positioning: Number(row.hv_price_change),
    standard_price_positioning: Number(row.std_price_change),
    marketing_change: Number(row.marketing_change),
    rnd_pct: Number(row.rnd_pct),
    rnd_orientation: closestOrientation(
      Number(row.connected_rnd_allocation),
      round,
    ),
    capex_pct: Number(row.capex_pct),
    resilience_policy: closestResilience(
      Number(row.inventory_days),
      Number(row.natural_rubber_hedge),
    ),
  };
}

export function decisionToStoredRow(
  decision: DecisionSet,
): StoredDecisionRow {
  const resilience = RESILIENCE_MAPPING[decision.resilience_policy];
  return {
    hv_price_change: decision.premium_price_positioning,
    std_price_change: decision.standard_price_positioning,
    marketing_change: decision.marketing_change,
    rnd_pct: decision.rnd_pct,
    capex_pct: decision.capex_pct,
    inventory_days: resilience.inventoryDays,
    receivable_days: 34,
    natural_rubber_hedge: resilience.naturalRubberHedge,
    connected_rnd_allocation:
      ORIENTATION_CONNECTED_SHARE[decision.rnd_orientation],
  };
}

export function orientationLabel(
  share: number,
  round: RoundNumber,
): RndOrientation {
  return closestOrientation(Number(share), round);
}

export function resilienceLabel(
  inventoryDays: number,
  hedge: number,
): ResiliencePolicy {
  return closestResilience(Number(inventoryDays), Number(hedge));
}
