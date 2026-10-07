import { redirect } from "next/navigation";
import {
  extendRoundAction,
  finalizeRoundAction,
} from "@/app/teacher/round-actions";
import { AppFooter } from "@/src/components/app-footer";
import { AppHeader } from "@/src/components/app-header";
import { GameRealtime } from "@/src/components/game-realtime";
import { RoundTimer } from "@/src/components/round-timer";
import {
  objectiveLabel,
  roundNumber,
} from "@/src/domain/game/round-content";
import { requireTeacherGameContext } from "@/src/lib/game/context";
import { MODEL_VERSION as V05_MODEL_VERSION } from "@/src/domain/simulation/v05/spec";

interface TeacherRoundPageProps {
  params: Promise<{ round: string }>;
  searchParams: Promise<{ error?: string | string[] }>;
}

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);

  return sorted.length % 2
    ? sorted[midpoint]
    : (sorted[midpoint - 1] + sorted[midpoint]) / 2;
}

function signedPercent(value: number | null) {
  if (value === null) return "—";
  const amount = value * 100;
  return `${amount > 0 ? "+" : ""}${amount.toFixed(0)}%`;
}

function plainPercent(value: number | null) {
  if (value === null) return "—";
  return `${(value * 100).toFixed(0)}%`;
}

function submissionTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

export default async function TeacherRoundPage({
  params,
  searchParams,
}: TeacherRoundPageProps) {
  const resolved = await params;
  let round;

  try {
    round = roundNumber(Number(resolved.round));
  } catch {
    redirect("/teacher");
  }

  const { supabase, profile, session } =
    await requireTeacherGameContext();

  const { data: gameRound } = await supabase
    .from("game_rounds")
    .select(
      "id, round_number, period_label, scenario_title, scenario_summary, status, opens_at, closes_at, closed_at",
    )
    .eq("session_id", session.id)
    .eq("round_number", round)
    .maybeSingle();

  if (!gameRound || gameRound.status === "scheduled") {
    redirect("/teacher");
  }

  const [{ data: teams }, { data: decisions }, { data: results }] =
    await Promise.all([
      supabase
        .from("teams")
        .select("id, name, status")
        .eq("session_id", session.id)
        .in("status", ["active", "completed"])
        .order("created_at", { ascending: true }),
      supabase
        .from("team_round_decisions")
        .select(
          "team_id, status, submitted_at, objective, hv_price_change, inventory_days, natural_rubber_hedge",
        )
        .eq("round_id", gameRound.id),
      supabase
        .from("team_round_results")
        .select("team_id")
        .eq("round_id", gameRound.id),
    ]);

  const decisionMap = new Map(
    (decisions ?? []).map((decision) => [decision.team_id, decision]),
  );
  const submitted = (decisions ?? []).filter(
    (decision) => decision.status === "submitted",
  );

  const premiumMedian = median(
    submitted.map((decision) => Number(decision.hv_price_change)),
  );
  const hedgeMedian = median(
    submitted.map((decision) => Number(decision.natural_rubber_hedge)),
  );
  const inventoryMedian = median(
    submitted.map((decision) => Number(decision.inventory_days)),
  );

  const search = await searchParams;
  const error = param(search.error);
  const totalTeams = teams?.length ?? 0;
  const submittedCount = submitted.length;
  const isV05 = session.model_version === V05_MODEL_VERSION;

  return (
    <main className="application-page">
      <GameRealtime sessionId={session.id} roundId={gameRound.id} />
      <AppHeader
        section="Console docente"
        sessionCode={`ROUND ${round} · ${gameRound.status === "open" ? "LIVE" : "CHIUSO"}`}
        userName={profile.full_name}
      />

      <div className="page-main teacher-live-main">
        <section className="teacher-live-heading">
          <div>
            <h1>
              Round {round} — {gameRound.period_label}
            </h1>
            <p>
              {gameRound.scenario_title} · Tutti i team ricevono lo stesso
              scenario.
            </p>
          </div>
          <div className="round-clock-card teacher-clock">
            <span>
              {gameRound.status === "open" ? "TEMPO RIMASTO" : "ROUND CHIUSO"}
            </span>
            {gameRound.status === "open" ? (
              <RoundTimer closesAt={gameRound.closes_at} />
            ) : (
              <strong>FINAL</strong>
            )}
          </div>
        </section>

        {error ? <div className="page-error teacher-error">{error}</div> : null}

        <section className="live-metrics">
          <article>
            <span>Inviati</span>
            <strong>
              {submittedCount} / {totalTeams}
            </strong>
            <small>
              {Math.max(0, totalTeams - submittedCount)} team ancora al lavoro
            </small>
          </article>
          <article>
            <span>Prezzo Premium mediano</span>
            <strong>{signedPercent(premiumMedian)}</strong>
            <small>Vista live della classe</small>
          </article>
          <article>
            <span>Copertura gomma mediana</span>
            <strong>{plainPercent(hedgeMedian)}</strong>
            <small>Risposta allo shock</small>
          </article>
          <article>
            <span>Scorte mediane</span>
            <strong>
              {inventoryMedian === null
                ? "—"
                : `${Math.round(inventoryMedian)} giorni`}
            </strong>
            <small>Scelte sul capitale circolante</small>
          </article>
          <article>
            <span>Stato round</span>
            <strong>{gameRound.status === "open" ? "OPEN" : "CLOSED"}</strong>
            <small>
              {gameRound.status === "open"
                ? "Finestra decisionale"
                : `${results?.length ?? 0} risultati calcolati`}
            </small>
          </article>
        </section>

        <div className="teacher-live-grid">
          <section className="submission-table-card">
            <h2>Controllo invii</h2>
            <div className="submission-table header">
              <span>Team</span>
              <span>Stato</span>
              <span>Ora invio</span>
              <span>Obiettivo</span>
              <span>Decisioni</span>
            </div>
            <div className="submission-rows">
              {(teams ?? []).map((team) => {
                const decision = decisionMap.get(team.id);
                const isSubmitted = decision?.status === "submitted";

                return (
                  <div
                    className={
                      isSubmitted
                        ? "submission-table row"
                        : "submission-table row pending"
                    }
                    key={team.id}
                  >
                    <strong>{team.name}</strong>
                    <span>{isSubmitted ? "Inviato" : "In corso"}</span>
                    <span>
                      {submissionTime(decision?.submitted_at ?? null)}
                    </span>
                    <span>
                      {isSubmitted && decision?.objective
                        ? objectiveLabel(decision.objective)
                        : "—"}
                    </span>
                    <span>{isSubmitted ? (isV05 ? "6/6" : "9/9") : "—"}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="round-control-card">
            <h2>Controlli del round</h2>
            <div className="teacher-scenario-box">
              <span>BREAKING NEWS</span>
              <strong>{gameRound.scenario_title}</strong>
              <p>{gameRound.scenario_summary}</p>
            </div>

            {gameRound.status === "open" ? (
              <>
                <form action={extendRoundAction}>
                  <input name="round_id" type="hidden" value={gameRound.id} />
                  <input name="round_number" type="hidden" value={round} />
                  <button className="button-secondary" type="submit">
                    +2 minuti al turno
                  </button>
                </form>

                <div className="card-rule" />

                <p className="round-close-copy">
                  La chiusura rende definitive tutte le decisioni inviate e
                  calcola i risultati simultaneamente. Prima della scadenza è
                  possibile chiudere solo quando tutti i team hanno inviato.
                </p>

                <form action={finalizeRoundAction}>
                  <input name="round_id" type="hidden" value={gameRound.id} />
                  <input name="round_number" type="hidden" value={round} />
                  <button className="button-primary" type="submit">
                    Chiudi round e calcola
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="teacher-all-assigned">
                  Round chiuso. I risultati sono stati elaborati per{" "}
                  {results?.length ?? 0} team.
                </div>
                <a className="button-secondary" href="/teacher">
                  Torna al controllo sessione
                </a>
              </>
            )}
          </aside>
        </div>
      </div>

      <AppFooter />
    </main>
  );
}
