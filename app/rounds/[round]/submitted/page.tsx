import { redirect } from "next/navigation";
import { AppFooter } from "@/src/components/app-footer";
import { AppHeader } from "@/src/components/app-header";
import { GameRealtime } from "@/src/components/game-realtime";
import { RoundTimer } from "@/src/components/round-timer";
import {
  objectiveLabel,
  roundNumber,
} from "@/src/domain/game/round-content";
import { requireStudentGameContext } from "@/src/lib/game/context";

interface SubmittedPageProps {
  params: Promise<{ round: string }>;
}

export default async function SubmittedPage({ params }: SubmittedPageProps) {
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
    .select("id, round_number, period_label, status, closes_at, closed_at")
    .eq("session_id", session.id)
    .eq("round_number", round)
    .maybeSingle();

  if (!gameRound || gameRound.status === "scheduled") {
    redirect("/case-study");
  }

  const { data: decision } = await supabase
    .from("team_round_decisions")
    .select("status, submitted_at, objective")
    .eq("round_id", gameRound.id)
    .eq("team_id", team.id)
    .maybeSingle();

  if (!decision) {
    redirect(`/rounds/${round}/decisions`);
  }

  if (decision.status !== "submitted") {
    redirect(`/rounds/${round}/review`);
  }

  if (gameRound.status === "closed") {
    const { data: result } = await supabase
      .from("team_round_results")
      .select("id")
      .eq("round_id", gameRound.id)
      .eq("team_id", team.id)
      .maybeSingle();

    if (result) {
      redirect(`/rounds/${round}/results`);
    }
  }

  return (
    <main className="application-page">
      <GameRealtime
        sessionId={session.id}
        teamId={team.id}
        roundId={gameRound.id}
      />
      <AppHeader
        section={`Decisioni Round ${round} inviate`}
        sessionCode={`ROUND ${round} · BLOCCATO`}
        userName={team.name}
      />

      <div className="page-main submitted-main">
        <section className="submitted-card">
          <div className="submitted-check">✓</div>
          <h1>Decisioni {gameRound.period_label} inviate</h1>
          <p>
            Le decisioni del team sono definitive. Attendete la chiusura
            ufficiale del round da parte del docente.
          </p>

          <div className="submitted-facts">
            <div>
              <span>Obiettivo</span>
              <strong>{objectiveLabel(decision.objective)}</strong>
            </div>
            <div>
              <span>Invio</span>
              <strong>
                {decision.submitted_at
                  ? new Intl.DateTimeFormat("it-IT", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    }).format(new Date(decision.submitted_at))
                  : "—"}
              </strong>
            </div>
            <div>
              <span>Stato</span>
              <strong>9 / 9 decisioni</strong>
            </div>
          </div>
        </section>

        <section className="waiting-card">
          <div>
            <div className="card-eyebrow">IN ATTESA DEL DOCENTE</div>
            <h2>
              {gameRound.status === "closed"
                ? "Il round è stato chiuso"
                : "I risultati saranno calcolati simultaneamente"}
            </h2>
            <p>
              La classifica completa resta nascosta. Al termine vedrete i
              risultati economico-finanziari del vostro team.
            </p>
          </div>
          {gameRound.status === "open" ? (
            <div className="waiting-timer">
              <span>Tempo residuo</span>
              <RoundTimer closesAt={gameRound.closes_at} />
            </div>
          ) : (
            <div className="status-badge green">
              <span className="status-dot" />
              Elaborazione risultati
            </div>
          )}
        </section>
      </div>

      <AppFooter />
    </main>
  );
}
