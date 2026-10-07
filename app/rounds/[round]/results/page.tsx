import { redirect } from "next/navigation";
import { AppFooter } from "@/src/components/app-footer";
import { AppHeader } from "@/src/components/app-header";
import { GameRealtime } from "@/src/components/game-realtime";
import { BASELINE_2025 as BASELINE_V04 } from "@/src/domain/simulation/v04/spec";
import {
  BASELINE_2025 as BASELINE_V05,
  MODEL_VERSION as V05_MODEL_VERSION,
} from "@/src/domain/simulation/v05/spec";
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

  const isV05 = session.model_version === V05_MODEL_VERSION;
  const baseline = isV05
    ? {
        revenue: BASELINE_V05.revenue,
        adjustedEbitda: BASELINE_V05.adjusted_ebitda,
        adjustedEbitdaMargin:
          BASELINE_V05.adjusted_ebitda / BASELINE_V05.revenue,
        netDebt: BASELINE_V05.net_debt,
        premiumShare: BASELINE_V05.premium_share,
      }
    : {
        revenue: BASELINE_V04.revenue,
        adjustedEbitda: BASELINE_V04.adjusted_ebitda,
        adjustedEbitdaMargin: BASELINE_V04.adjusted_ebitda_margin,
        netDebt: BASELINE_V04.net_debt,
        premiumShare: BASELINE_V04.premium_share,
      };

  const revenueDelta =
    result.total_revenue / baseline.revenue - 1;
  const ebitdaDelta =
    result.adjusted_ebitda_margin - baseline.adjustedEbitdaMargin;
  const netDebtDelta = result.net_debt - baseline.netDebt;
  const premiumDelta =
    result.premium_revenue_share - baseline.premiumShare;

  const cashSignal =
    result.unlevered_free_cash_flow >= 0
      ? `Il flusso di cassa libero del round è positivo (${moneyM(result.unlevered_free_cash_flow)}).`
      : `Il flusso di cassa libero del round è negativo (${moneyM(result.unlevered_free_cash_flow)}).`;
  const debtSignal =
    netDebtDelta <= 0
      ? ` La posizione finanziaria è migliorata di ${moneyBn(Math.abs(netDebtDelta))} rispetto al 2025.`
      : ` Il debito netto è aumentato di ${moneyBn(Math.abs(netDebtDelta))} rispetto al 2025.`;
  const premiumMove = `${Math.abs(premiumDelta * 100).toFixed(1)} pp`;
  const mixSignal =
    premiumDelta >= 0
      ? `La quota di ricavi Premium è salita di ${premiumMove} rispetto al 2025.`
      : `La quota di ricavi Premium è scesa di ${premiumMove} rispetto al 2025.`;
  const strategicSignal =
    result.strategic_health >= 1
      ? `L’indice di solidità strategica è ${result.strategic_health.toFixed(2)}x, sopra il riferimento iniziale 1,00x.`
      : `L’indice di solidità strategica è ${result.strategic_health.toFixed(2)}x, sotto il riferimento iniziale 1,00x.`;

  const revenueIndex =
    (result.total_revenue / baseline.revenue) * 100;
  const ebitdaAmount =
    result.total_revenue * result.adjusted_ebitda_margin;
  const ebitdaIndex =
    (ebitdaAmount / baseline.adjustedEbitda) * 100;
  const strategicIndex = result.strategic_health * 100;
  const premiumIndex =
    (result.premium_revenue_share / baseline.premiumShare) * 100;

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
                <dd>{mixSignal}</dd>
              </div>
              <div>
                <dt>CASSA</dt>
                <dd>
                  {cashSignal}
                  {debtSignal}
                </dd>
              </div>
              <div>
                <dt>{isV05 ? "CAPACITÀ / RISCHIO" : "RISCHIO"}</dt>
                <dd>
                  {isV05
                    ? "Nel v0.5.2 il CapEx influenza la capacità con un anno di ritardo, mentre la resilienza combina scorte e copertura commodity. Il risultato aggregato non consente di attribuire l’effetto a una sola leva."
                    : "Le scelte di copertura modificano l’esposizione alla volatilità delle materie prime."}
                </dd>
              </div>
              <div>
                <dt>STRATEGIA</dt>
                <dd>
                  {strategicSignal} R&S, marketing e investimenti possono
                  accumulare effetti che proseguono nei round successivi.
                </dd>
              </div>
            </dl>
            {isV05 ? (
              <p className="result-causality-note">
                Lettura manageriale: questi indicatori descrivono l’esito
                complessivo della strategia. Per capire il contributo di una
                singola decisione serve un confronto controfattuale, non basta
                osservare il risultato finale del round.
              </p>
            ) : null}
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
