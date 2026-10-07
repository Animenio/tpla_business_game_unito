import { redirect } from "next/navigation";
import { AppFooter } from "@/src/components/app-footer";
import { AppHeader } from "@/src/components/app-header";
import { GameRealtime } from "@/src/components/game-realtime";
import { BASELINE_2025 } from "@/src/domain/simulation/v04/spec";
import { roundNumber } from "@/src/domain/game/round-content";
import { requireStudentGameContext } from "@/src/lib/game/context";

interface ResultsPageProps {
  params: Promise<{ round: string }>;
}

function moneyBn(value: number) {
  const sign = value < 0 ? "−" : "";
  return `${sign}€${Math.abs(value / 1000).toFixed(2)}bn`;
}

function moneyM(value: number) {
  const sign = value < 0 ? "−" : "";
  return `${sign}€${Math.abs(value).toFixed(0)}m`;
}

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function pp(value: number) {
  const points = value * 100;
  return `${points >= 0 ? "+" : "−"}${Math.abs(points).toFixed(1)} pp`;
}

function clampBar(value: number) {
  return Math.max(4, Math.min(100, value));
}

export default async function ResultsPage({ params }: ResultsPageProps) {
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
    .select(
      "id, round_number, period_label, status, closed_at, scenario_title",
    )
    .eq("session_id", session.id)
    .eq("round_number", round)
    .maybeSingle();

  if (!gameRound || gameRound.status === "scheduled") {
    redirect("/case-study");
  }

  if (gameRound.status === "open") {
    const { data: decision } = await supabase
      .from("team_round_decisions")
      .select("status")
      .eq("round_id", gameRound.id)
      .eq("team_id", team.id)
      .maybeSingle();

    redirect(
      decision?.status === "submitted"
        ? `/rounds/${round}/submitted`
        : `/rounds/${round}/decisions`,
    );
  }

  const { data: result } = await supabase
    .from("team_round_results")
    .select(
      "model_version, total_revenue, adjusted_ebitda_margin, unlevered_free_cash_flow, net_debt, premium_revenue_share, strategic_health, calculated_at",
    )
    .eq("round_id", gameRound.id)
    .eq("team_id", team.id)
    .maybeSingle();

  if (!result) {
    return (
      <main className="application-page">
        <GameRealtime
          sessionId={session.id}
          teamId={team.id}
          roundId={gameRound.id}
        />
        <AppHeader
          section="Risultati del round"
          sessionCode={`ROUND ${round} · CHIUSO`}
          userName={team.name}
        />
        <div className="page-main empty-result-main">
          <section className="simple-card empty-result-card">
            <div className="card-eyebrow">ROUND {round}</div>
            <h1>Risultato non disponibile</h1>
            <p>
              Il round è chiuso, ma non risulta una decisione valida elaborata
              per questo team.
            </p>
          </section>
        </div>
        <AppFooter />
      </main>
    );
  }

  const revenueDelta =
    result.total_revenue / BASELINE_2025.revenue - 1;
  const ebitdaDelta =
    result.adjusted_ebitda_margin - BASELINE_2025.adjusted_ebitda_margin;
  const netDebtDelta = result.net_debt - BASELINE_2025.net_debt;
  const premiumDelta =
    result.premium_revenue_share - BASELINE_2025.premium_share;

  const revenueIndex =
    (result.total_revenue / BASELINE_2025.revenue) * 100;
  const ebitdaAmount =
    result.total_revenue * result.adjusted_ebitda_margin;
  const ebitdaIndex =
    (ebitdaAmount / BASELINE_2025.adjusted_ebitda) * 100;
  const strategicIndex = result.strategic_health * 100;
  const premiumIndex =
    (result.premium_revenue_share / BASELINE_2025.premium_share) * 100;

  const { data: nextRound } =
    round < 3
      ? await supabase
          .from("game_rounds")
          .select("round_number, period_label, status")
          .eq("session_id", session.id)
          .eq("round_number", round + 1)
          .maybeSingle()
      : { data: null };

  const bars = [
    ["Ricavi", revenueIndex],
    ["EBITDA", ebitdaIndex],
    ["Solidità strategica", strategicIndex],
    ["Mix Premium", premiumIndex],
  ] as const;

  return (
    <main className="application-page">
      <GameRealtime
        sessionId={session.id}
        teamId={team.id}
        roundId={gameRound.id}
      />
      <AppHeader
        section="Risultati del round"
        sessionCode={`ROUND ${round} · CHIUSO`}
        userName={team.name}
      />

      <div className="page-main results-main">
        <section className="results-heading">
          <div>
            <h1>Risultati Round {round}</h1>
            <p>
              Le vostre scelte hanno modificato redditività, cassa e posizione
              competitiva. La classifica completa resta nascosta.
            </p>
          </div>
          <div className="status-badge green">
            <span className="status-dot" />
            Calcolato
          </div>
        </section>

        <section className="result-kpis">
          <article>
            <span>Ricavi commerciali</span>
            <strong>{moneyBn(result.total_revenue)}</strong>
            <small>{pct(revenueDelta)} vs 2025</small>
          </article>
          <article>
            <span>Margine EBITDA</span>
            <strong>{pct(result.adjusted_ebitda_margin)}</strong>
            <small>{pp(ebitdaDelta)}</small>
          </article>
          <article>
            <span>Flusso di cassa libero</span>
            <strong>{moneyM(result.unlevered_free_cash_flow)}</strong>
            <small>CapEx + capitale circolante</small>
          </article>
          <article>
            <span>Debito netto</span>
            <strong>{moneyBn(result.net_debt)}</strong>
            <small>{moneyBn(netDebtDelta)} vs 2025</small>
          </article>
          <article>
            <span>Quota Premium</span>
            <strong>{pct(result.premium_revenue_share)}</strong>
            <small>{pp(premiumDelta)}</small>
          </article>
        </section>

        <div className="results-grid">
          <section className="index-card">
            <h2>Dal 2025 al Round {round}</h2>
            <p>Indice iniziale = 100</p>
            <div className="index-bars">
              {bars.map(([label, value]) => (
                <div className="index-row" key={label}>
                  <span>{label}</span>
                  <div className="index-track">
                    <div
                      className="index-fill"
                      style={{ width: `${clampBar(value)}%` }}
                    />
                  </div>
                  <strong>{Math.round(value)}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="result-explanation-card">
            <h2>Cosa è successo</h2>
            <dl>
              <div>
                <dt>MIX</dt>
                <dd>
                  Il mix Premium ha modificato la composizione dei ricavi e il
                  profilo di redditività.
                </dd>
              </div>
              <div>
                <dt>CASSA</dt>
                <dd>
                  CapEx, scorte e tempi di incasso hanno modificato
                  l’assorbimento di cassa.
                </dd>
              </div>
              <div>
                <dt>RISCHIO</dt>
                <dd>
                  Le scelte di copertura hanno modificato l’esposizione alla
                  volatilità delle materie prime.
                </dd>
              </div>
              <div>
                <dt>LUNGO PERIODO</dt>
                <dd>
                  R&S, marketing e investimenti accumulano effetti strategici
                  che proseguono nei round successivi.
                </dd>
              </div>
            </dl>
          </section>
        </div>

        {round === 3 && session.status === "completed" ? (
          <section className="next-round-card final-result-entry">
            <div>
              <div className="card-eyebrow">SIMULAZIONE COMPLETATA</div>
              <h2>Il risultato finale del team è disponibile.</h2>
              <p>
                Consulta valore creato, KPI 2030, storico dei round e benchmark
                rispetto alla classe.
              </p>
            </div>
            <a className="button-primary next-round-button" href="/final">
              Apri il report finale
            </a>
          </section>
        ) : nextRound ? (
          <section className="next-round-card">
            <div>
              <div className="card-eyebrow">NEXT</div>
              <h2>
                {nextRound.status === "open"
                  ? `Round ${nextRound.round_number} — ${nextRound.period_label} è aperto.`
                  : `Attendi l’apertura del Round ${nextRound.round_number} — ${nextRound.period_label}.`}
              </h2>
              <p>Il nuovo scenario sarà uguale per tutti i team.</p>
            </div>
            {nextRound.status === "open" ? (
              <a
                className="button-primary next-round-button"
                href={`/rounds/${nextRound.round_number}/briefing`}
              >
                Apri il nuovo scenario
              </a>
            ) : (
              <div className="status-badge amber">
                <span className="status-dot" />
                In attesa
              </div>
            )}
          </section>
        ) : null}
      </div>

      <AppFooter />
    </main>
  );
}
