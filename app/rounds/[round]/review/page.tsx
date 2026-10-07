import { redirect } from "next/navigation";
import { submitDecisionsAction } from "@/app/rounds/actions";
import { AppFooter } from "@/src/components/app-footer";
import { AppHeader } from "@/src/components/app-header";
import { GameRealtime } from "@/src/components/game-realtime";
import { RoundTimer } from "@/src/components/round-timer";
import {
  objectiveLabel,
  roundNumber,
} from "@/src/domain/game/round-content";
import { requireStudentGameContext } from "@/src/lib/game/context";
import { MODEL_VERSION as V05_MODEL_VERSION } from "@/src/domain/simulation/v05/spec";
import {
  orientationLabel,
  resilienceLabel,
} from "@/src/domain/simulation/v05/storage";

interface ReviewPageProps {
  params: Promise<{ round: string }>;
  searchParams: Promise<{ error?: string | string[] }>;
}

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function percent(value: number, digits = 0) {
  const amount = value * 100;
  const sign = amount > 0 ? "+" : "";
  return `${sign}${amount.toFixed(digits)}%`;
}

export default async function ReviewPage({
  params,
  searchParams,
}: ReviewPageProps) {
  const resolved = await params;
  let round;

  try {
    round = roundNumber(Number(resolved.round));
  } catch {
    redirect("/case-study");
  }

  const { supabase, session, team } = await requireStudentGameContext();

  const { data: gameRound } = await supabase
    .from("game_rounds")
    .select("id, round_number, period_label, status, closes_at")
    .eq("session_id", session.id)
    .eq("round_number", round)
    .maybeSingle();

  if (!gameRound || gameRound.status === "scheduled") {
    redirect("/case-study");
  }

  if (gameRound.status === "closed") {
    redirect(`/rounds/${round}/results`);
  }

  const { data: decision } = await supabase
    .from("team_round_decisions")
    .select("*")
    .eq("round_id", gameRound.id)
    .eq("team_id", team.id)
    .maybeSingle();

  if (!decision) {
    redirect(`/rounds/${round}/decisions`);
  }

  if (decision.status === "submitted") {
    redirect(`/rounds/${round}/submitted`);
  }

  const search = await searchParams;
  const error = param(search.error);

  const isV05 = session.model_version === V05_MODEL_VERSION;
  const groups = isV05
    ? [
        {
          title: "MERCATO",
          items: [
            ["Prezzo Premium vs mercato", percent(decision.hv_price_change)],
            ["Prezzo Standard vs mercato", percent(decision.std_price_change)],
            ["Marketing", percent(decision.marketing_change)],
          ],
        },
        {
          title: "INNOVAZIONE E INVESTIMENTI",
          items: [
            ["R&S / Ricavi", percent(decision.rnd_pct, 1).replace("+", "")],
            [
              "Orientamento R&S",
              orientationLabel(
                Number(decision.connected_rnd_allocation),
                round,
              ),
            ],
            ["Investimenti / Ricavi", percent(decision.capex_pct, 1).replace("+", "")],
          ],
        },
        {
          title: "RESILIENZA",
          items: [
            [
              "Politica supply chain",
              resilienceLabel(
                Number(decision.inventory_days),
                Number(decision.natural_rubber_hedge),
              ),
            ],
          ],
        },
      ]
    : [
        {
          title: "MERCATO",
          items: [
            ["Prezzo premium", percent(decision.hv_price_change)],
            ["Prezzo standard", percent(decision.std_price_change)],
            ["Marketing", percent(decision.marketing_change)],
          ],
        },
        {
          title: "INNOVAZIONE E INVESTIMENTI",
          items: [
            ["R&S / Ricavi", percent(decision.rnd_pct, 1).replace("+", "")],
            [
              "R&S pneumatici connessi",
              percent(decision.connected_rnd_allocation).replace("+", ""),
            ],
            ["Investimenti / Ricavi", percent(decision.capex_pct, 1).replace("+", "")],
          ],
        },
        {
          title: "CASSA E RISCHIO",
          items: [
            ["Scorte di magazzino", `${decision.inventory_days} gg`],
            ["Tempo medio di incasso", `${decision.receivable_days} gg`],
            [
              "Copertura costo gomma",
              percent(decision.natural_rubber_hedge).replace("+", ""),
            ],
          ],
        },
      ];

  return (
    <main className="application-page">
      <GameRealtime
        sessionId={session.id}
        teamId={team.id}
        roundId={gameRound.id}
      />
      <AppHeader
        section="Decision Review"
        sessionCode={`Round ${round}`}
        userName={team.name}
      />

      <div className="page-main review-main">
        <section className="review-heading">
          <div>
            <h1>Rivedi prima di inviare</h1>
            <p>
              Dopo la conferma non sarà possibile modificare le decisioni del
              Round {round}.
            </p>
          </div>
          <div className="review-status-stack">
            <div className="status-badge amber">
              <span className="status-dot" />
              Non ancora inviato
            </div>
            <RoundTimer closesAt={gameRound.closes_at} compact />
          </div>
        </section>

        {error ? <div className="page-error">{error}</div> : null}

        <section className="review-card">
          <h2>Riepilogo decisioni</h2>
          <div className="review-grid">
            {groups.map((group) => (
              <div className="review-group" key={group.title}>
                <h3>{group.title}</h3>
                {group.items.map(([label, value]) => (
                  <div className="review-row" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="review-objective">
            <span>Obiettivo principale</span>
            <strong>{objectiveLabel(decision.objective)}</strong>
          </div>
        </section>

        <form action={submitDecisionsAction}>
          <input name="round_id" type="hidden" value={gameRound.id} />
          <input name="round_number" type="hidden" value={round} />

          <label className="review-warning">
            <div>
              <strong>ATTENZIONE</strong>
              <p>
                Confermando, il sistema salva le decisioni e le trasmette al
                docente. Il round resterà bloccato fino alla chiusura ufficiale.
              </p>
            </div>
            <input name="confirm" required type="checkbox" value="yes" />
          </label>

          <div className="review-actions">
            <a
              className="button-secondary review-back"
              href={`/rounds/${round}/decisions`}
            >
              Torna alle decisioni
            </a>
            <button className="button-primary review-submit" type="submit">
              Conferma e invia
            </button>
          </div>
        </form>
      </div>

      <AppFooter />
    </main>
  );
}
