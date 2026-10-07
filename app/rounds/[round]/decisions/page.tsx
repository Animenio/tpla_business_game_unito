import { redirect } from "next/navigation";
import { reviewDecisionsAction } from "@/app/rounds/actions";
import { AppFooter } from "@/src/components/app-footer";
import { AppHeader } from "@/src/components/app-header";
import { GameRealtime } from "@/src/components/game-realtime";
import { RoundTimer } from "@/src/components/round-timer";
import { V05DecisionForm } from "@/src/components/v05-decision-form";
import {
  DECISION_BASELINE_CONTEXT,
  DECISION_GROUPS,
  DECISION_HELP,
  ROUND_CONTENT,
  ROUND_OBJECTIVES,
  decisionDefinition,
  roundNumber,
} from "@/src/domain/game/round-content";
import type { DecisionSet } from "@/src/domain/simulation/v04/spec";
import { isReducedDecisionModelVersion } from "@/src/domain/simulation/model-version";
import type { StoredDecisionRow } from "@/src/domain/simulation/v05/storage";
import { requireStudentGameContext } from "@/src/lib/game/context";

interface DecisionsPageProps {
  params: Promise<{ round: string }>;
  searchParams: Promise<{ error?: string | string[] }>;
}

const PERCENT_KEYS = new Set<keyof DecisionSet>([
  "hv_price_change",
  "std_price_change",
  "marketing_change",
  "rnd_pct",
  "capex_pct",
  "natural_rubber_hedge",
  "connected_rnd_allocation",
]);

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function toInputValue(
  key: keyof DecisionSet,
  value: number | undefined,
): number | undefined {
  if (value === undefined) return undefined;
  return PERCENT_KEYS.has(key) ? value * 100 : value;
}

function inputMin(key: keyof DecisionSet) {
  const definition = decisionDefinition(key);
  return PERCENT_KEYS.has(key) ? definition.min * 100 : definition.min;
}

function inputMax(key: keyof DecisionSet) {
  const definition = decisionDefinition(key);
  return PERCENT_KEYS.has(key) ? definition.max * 100 : definition.max;
}

function inputStep(key: keyof DecisionSet) {
  const definition = decisionDefinition(key);
  return PERCENT_KEYS.has(key) ? definition.step * 100 : definition.step;
}

function rangeLabel(key: keyof DecisionSet) {
  const min = inputMin(key);
  const max = inputMax(key);

  if (key === "inventory_days" || key === "receivable_days") {
    return "Intervallo: " + min + " → " + max + " giorni";
  }

  if (key === "rnd_pct" || key === "capex_pct") {
    return "Intervallo: " + min + "% → " + max + "% dei ricavi";
  }

  if (key === "connected_rnd_allocation") {
    return "Intervallo: " + min + "% → " + max + "% della R&S";
  }

  if (key === "natural_rubber_hedge") {
    return "Intervallo: " + min + "% → " + max + "%";
  }

  const signed = (value: number) => (value > 0 ? "+" + value + "%" : value + "%");
  return "Intervallo: " + signed(min) + " → " + signed(max);
}

function decisionValues(
  row: Record<string, unknown> | null,
): Partial<DecisionSet> {
  if (!row) {
    return {};
  }

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

export default async function DecisionsPage({
  params,
  searchParams,
}: DecisionsPageProps) {
  const resolved = await params;
  let round;

  try {
    round = roundNumber(Number(resolved.round));
  } catch {
    redirect("/case-study");
  }

  const { supabase, session, team } = await requireStudentGameContext();

  if (session.status !== "live") {
    redirect("/lobby");
  }

  const { data: gameRound } = await supabase
    .from("game_rounds")
    .select(
      "id, round_number, period_label, scenario_title, scenario_summary, status, closes_at",
    )
    .eq("session_id", session.id)
    .eq("round_number", round)
    .maybeSingle();

  if (!gameRound || gameRound.status === "scheduled") {
    redirect("/case-study");
  }

  if (gameRound.status === "closed") {
    redirect("/rounds/" + round + "/results");
  }

  const { data: draft } = await supabase
    .from("team_round_decisions")
    .select("*")
    .eq("round_id", gameRound.id)
    .eq("team_id", team.id)
    .maybeSingle();

  if (draft?.status === "submitted") {
    redirect("/rounds/" + round + "/submitted");
  }

  const values = decisionValues(draft);
  const selectedObjective = draft?.objective ?? null;
  const search = await searchParams;
  const error = param(search.error);
  const content = ROUND_CONTENT[round];
  const isReducedModel = isReducedDecisionModelVersion(session.model_version);

  return (
    <main className="application-page">
      <GameRealtime
        sessionId={session.id}
        teamId={team.id}
        roundId={gameRound.id}
      />
      <AppHeader
        section="Decisioni"
        sessionCode={gameRound.period_label + " · LIVE"}
        userName={team.name}
      />

      <div className="page-main decisions-main">
        <section className="decisions-heading">
          <div>
            <h1>Decisioni {gameRound.period_label}</h1>
            <p>
              {isReducedModel
                ? "Compilate le 6 decisioni economiche. R&S include l’orientamento e la resilienza unifica scorte e copertura; dopo l’invio non potrete più modificarle."
                : "Compilate le 9 voci. Nessun valore è preimpostato; dopo l’invio non potrete più modificarle."}
            </p>
          </div>
          <div className="status-badge amber">
            <span className="status-dot" />
            Bozza non inviata
          </div>
        </section>

        {error ? <div className="page-error decision-page-error">{error}</div> : null}

        <section className="scenario-strip">
          <div>
            <strong>
              {gameRound.period_label} — {content.title}
            </strong>
            <p>{gameRound.scenario_summary}</p>
            <span>
              Promemoria: conservate la chat AI del team. L’export/documento
              completo sarà richiesto al termine della simulazione.
            </span>
          </div>
          <div className="scenario-actions">
            <a
              className="button-secondary scenario-briefing-link"
              href={"/rounds/" + round + "/briefing"}
            >
              ← Rivedi briefing
            </a>
            <div className="scenario-time">
              <span>Tempo rimasto</span>
              <RoundTimer closesAt={gameRound.closes_at} compact />
            </div>
          </div>
        </section>

        {isReducedModel ? (
          <V05DecisionForm
            draft={draft as (StoredDecisionRow & { objective?: string | null }) | null}
            round={round}
            roundId={gameRound.id}
            selectedObjective={selectedObjective}
          />
        ) : (
          <form action={reviewDecisionsAction}>
            <input name="round_id" type="hidden" value={gameRound.id} />
            <input name="round_number" type="hidden" value={round} />
  
            <div className="decision-columns">
              {DECISION_GROUPS.map((group) => (
                <section className="decision-column" key={group.title}>
                  <h2>{group.title}</h2>
                  <div className="decision-card-stack">
                    {group.keys.map((key) => {
                      const definition = decisionDefinition(key);
                      const current = toInputValue(key, values[key]);
  
                      return (
                        <article className="decision-card" key={key}>
                          <div className="decision-card-top">
                            <label htmlFor={key}>{definition.label}</label>
                            <details className="decision-info">
                              <summary>ⓘ Info</summary>
                              <div className="decision-info-panel">
                                <strong>Cosa significa</strong>
                                <p>{DECISION_HELP[key]}</p>
                                <strong>Riferimento 2025</strong>
                                <p>{DECISION_BASELINE_CONTEXT[key]}</p>
                              </div>
                            </details>
                            <div className="decision-value-input">
                              <input
                                defaultValue={current}
                                id={key}
                                max={inputMax(key)}
                                min={inputMin(key)}
                                name={key}
                                placeholder="Valore"
                                required
                                step={inputStep(key)}
                                type="number"
                              />
                              {PERCENT_KEYS.has(key) ? <span>%</span> : null}
                            </div>
                          </div>
                          <div className="decision-range">{rangeLabel(key)}</div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
  
            <section className="objective-panel">
              <div>
                <strong>Prima di inviare</strong>
                <p>Qual è il vostro obiettivo principale in questo round?</p>
                <div className="objective-chips">
                  {ROUND_OBJECTIVES.map((objective) => (
                    <label className="objective-chip" key={objective.value}>
                      <input
                        defaultChecked={selectedObjective === objective.value}
                        name="objective"
                        required
                        type="radio"
                        value={objective.value}
                      />
                      <span>{objective.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="objective-submit">
                <span>1 clic, nessun testo da scrivere.</span>
                <button className="button-primary" type="submit">
                  Rivedi le decisioni
                </button>
              </div>
            </section>
          </form>
        )}
      </div>

      <AppFooter />
    </main>
  );
}
