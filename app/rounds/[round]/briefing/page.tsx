import { redirect } from "next/navigation";
import { AppFooter } from "@/src/components/app-footer";
import { AppHeader } from "@/src/components/app-header";
import { GameRealtime } from "@/src/components/game-realtime";
import { RoundTimer } from "@/src/components/round-timer";
import {
  BASELINE_DISPLAY,
  ROUND_CONTENT,
  roundNumber,
} from "@/src/domain/game/round-content";
import { requireStudentGameContext } from "@/src/lib/game/context";

interface BriefingPageProps {
  params: Promise<{ round: string }>;
}

export default async function BriefingPage({ params }: BriefingPageProps) {
  const resolved = await params;
  const numericRound = Number(resolved.round);

  let round;
  try {
    round = roundNumber(numericRound);
  } catch {
    redirect("/case-study");
  }

  const { supabase, profile, session, team } =
    await requireStudentGameContext();

  if (session.status !== "live") {
    redirect("/lobby");
  }

  const { data: gameRound } = await supabase
    .from("game_rounds")
    .select(
      "id, round_number, period_label, scenario_title, scenario_summary, status, opens_at, closes_at",
    )
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
    .select("status")
    .eq("round_id", gameRound.id)
    .eq("team_id", team.id)
    .maybeSingle();

  if (decision?.status === "submitted") {
    redirect(`/rounds/${round}/submitted`);
  }

  const content = ROUND_CONTENT[round];

  return (
    <main className="application-page">
      <GameRealtime
        sessionId={session.id}
        teamId={team.id}
        roundId={gameRound.id}
      />
      <AppHeader
        section={`Round ${round} di 3 · ${gameRound.period_label}`}
        sessionCode={session.code}
        userName={team.name}
      />

      <div className="page-main round-opening-main">
        <section className="round-opening-heading">
          <div>
            <h1>
              Round {round} — {gameRound.period_label}
            </h1>
            <p>
              Leggete il briefing di scenario prima di definire le decisioni
              del round.
            </p>
          </div>
          <div className="round-clock-card">
            <span>TEMPO</span>
            <RoundTimer closesAt={gameRound.closes_at} />
          </div>
        </section>

        <div className="round-opening-grid">
          <section className="breaking-news-card">
            <div className="breaking-news-band">
              <strong>BREAKING NEWS</strong>
              <div className="status-badge amber">
                <span className="status-dot" />
                Scenario comune a tutti
              </div>
            </div>
            <h2>{content.title}</h2>
            <p>{content.body}</p>
            <div className="card-rule" />
            <h3>Informazioni disponibili</h3>
            <ul>
              {content.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </section>

          <aside className="opening-state-card">
            <div className="card-eyebrow">SITUAZIONE INIZIALE 2025</div>
            <div className="opening-kpi-grid">
              <div>
                <span>Ricavi commerciali</span>
                <strong>€{BASELINE_DISPLAY.revenueBn.toFixed(2)}bn</strong>
              </div>
              <div>
                <span>Margine EBITDA</span>
                <strong>
                  {(BASELINE_DISPLAY.ebitdaMargin * 100).toFixed(1)}%
                </strong>
              </div>
              <div>
                <span>Premium</span>
                <strong>
                  {(BASELINE_DISPLAY.premiumShare * 100).toFixed(0)}%
                </strong>
              </div>
              <div>
                <span>Debito netto</span>
                <strong>€{BASELINE_DISPLAY.netDebtBn.toFixed(2)}bn</strong>
              </div>
            </div>
            <div className="opening-note">
              <strong>Tutti i team ricevono lo stesso scenario esterno.</strong>
              <p>
                Vincerà chi costruisce la risposta migliore nel tempo, non chi
                indovina un singolo anno.
              </p>
            </div>
          </aside>
        </div>

        <section className="decision-window-card">
          <div>
            <div className="card-eyebrow">DECISION WINDOW OPEN</div>
            <h2>
              Il vostro team ha {gameRound.decision_window_minutes} minuti per
              definire le 9 decisioni del Round {round}.
            </h2>
            <p>
              Definite le 9 decisioni, selezionate l’obiettivo principale del
              round e inviate.
            </p>
          </div>
          <a
            className="button-primary decision-window-button"
            href={`/rounds/${round}/decisions`}
          >
            Vai alle decisioni
          </a>
        </section>
      </div>

      <AppFooter />
    </main>
  );
}
