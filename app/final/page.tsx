import { redirect } from "next/navigation";
import { AppFooter } from "@/src/components/app-footer";
import { AppHeader } from "@/src/components/app-header";
import { GameRealtime } from "@/src/components/game-realtime";
import { objectiveLabel } from "@/src/domain/game/round-content";
import { BASELINE_2025 as BASELINE_V04 } from "@/src/domain/simulation/v04/spec";
import {
  BASELINE_2025 as BASELINE_V05,
  type RoundNumber,
} from "@/src/domain/simulation/v05/spec";
import { BASELINE_2025 as BASELINE_V053 } from "@/src/domain/simulation/v053/spec";
import {
  V053_MODEL_VERSION,
  isReducedDecisionModelVersion,
} from "@/src/domain/simulation/model-version";
import {
  orientationLabel,
  resilienceLabel,
} from "@/src/domain/simulation/v05/storage";
import { requireStudentGameContext } from "@/src/lib/game/context";

function moneyBn(value: number) {
  const absolute = Math.abs(value / 1000);
  return `${value < 0 ? "−" : ""}€${absolute.toFixed(2)}bn`;
}

function percent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function signedPercent(value: number) {
  const pct = value * 100;
  return `${pct >= 0 ? "+" : "−"}${Math.abs(pct).toFixed(1)}%`;
}

function pp(value: number) {
  const points = value * 100;
  return `${points >= 0 ? "+" : "−"}${Math.abs(points).toFixed(1)} pp`;
}

function decisionSummary(
  row: {
    hv_price_change: number;
    std_price_change: number;
    marketing_change: number;
    rnd_pct: number;
    capex_pct: number;
    inventory_days: number;
    natural_rubber_hedge: number;
    connected_rnd_allocation: number;
  },
  round: RoundNumber,
  isReducedModel: boolean,
) {
  if (isReducedModel) {
    return [
      `Premium vs mercato ${signedPercent(Number(row.hv_price_change))}`,
      `Standard vs mercato ${signedPercent(Number(row.std_price_change))}`,
      `Marketing ${signedPercent(Number(row.marketing_change))}`,
      `R&S ${percent(Number(row.rnd_pct))} (${orientationLabel(Number(row.connected_rnd_allocation), round)})`,
      `CapEx ${percent(Number(row.capex_pct))}`,
      `Resilienza ${resilienceLabel(Number(row.inventory_days), Number(row.natural_rubber_hedge))}`,
    ].join(" · ");
  }

  return [
    `Premium ${signedPercent(Number(row.hv_price_change))}`,
    `Standard ${signedPercent(Number(row.std_price_change))}`,
    `R&S ${percent(Number(row.rnd_pct))}`,
    `CapEx ${percent(Number(row.capex_pct))}`,
    `Scorte ${row.inventory_days} gg`,
    `Copertura ${percent(Number(row.natural_rubber_hedge))}`,
    `Connected ${percent(Number(row.connected_rnd_allocation))}`,
  ].join(" · ");
}

export default async function FinalPage() {
  const { supabase, session, team } = await requireStudentGameContext();

  if (session.status !== "completed") {
    redirect("/case-study");
  }

  const resultsReleased = Boolean(session.results_released_at);
  const benchmarkRequest = resultsReleased
    ? supabase.rpc("student_final_benchmark", { p_session_id: session.id })
    : Promise.resolve({ data: [] as Array<{
        own_rank: number;
        total_teams: number;
        median_final_game_value: number;
      }> });

  const leaderboardScoresRequest = resultsReleased
    ? supabase
        .from("team_final_scores")
        .select("team_id, final_game_value, cumulative_ufcf, strategic_health")
        .eq("session_id", session.id)
        .order("final_game_value", { ascending: false })
    : Promise.resolve({
        data: [] as Array<{
          team_id: string;
          final_game_value: number;
          cumulative_ufcf: number;
          strategic_health: number;
        }>,
      });

  const leaderboardTeamsRequest = resultsReleased
    ? supabase
        .from("teams")
        .select("id, name")
        .eq("session_id", session.id)
    : Promise.resolve({ data: [] as Array<{ id: string; name: string }> });

  const [
    { data: finalScore },
    { data: benchmarkRows },
    { data: rounds },
    { data: aiSubmission },
    { data: leaderboardScores },
    { data: leaderboardTeams },
  ] = await Promise.all([
    supabase
      .from("team_final_scores")
      .select("*")
      .eq("session_id", session.id)
      .eq("team_id", team.id)
      .maybeSingle(),
    benchmarkRequest,
    supabase
      .from("game_rounds")
      .select("id, round_number, period_label, scenario_title")
      .eq("session_id", session.id)
      .order("round_number", { ascending: true }),
    supabase
      .from("team_ai_submissions")
      .select("status, provider, submitted_at")
      .eq("session_id", session.id)
      .eq("team_id", team.id)
      .maybeSingle(),
    leaderboardScoresRequest,
    leaderboardTeamsRequest,
  ]);

  if (!finalScore) {
    redirect("/rounds/3/results");
  }

  const roundIds = (rounds ?? []).map((round) => round.id);
  const { data: decisions } = roundIds.length
    ? await supabase
        .from("team_round_decisions")
        .select(
          "round_id, objective, hv_price_change, std_price_change, marketing_change, rnd_pct, capex_pct, inventory_days, natural_rubber_hedge, connected_rnd_allocation",
        )
        .eq("team_id", team.id)
        .in("round_id", roundIds)
        .eq("status", "submitted")
    : { data: [] };

  const decisionByRound = new Map(
    (decisions ?? []).map((decision) => [decision.round_id, decision]),
  );

  const isReducedModel = isReducedDecisionModelVersion(
    session.model_version,
  );
  const reducedBaseline =
    session.model_version === V053_MODEL_VERSION
      ? BASELINE_V053
      : BASELINE_V05;
  const baseline = isReducedModel
    ? {
        revenue: reducedBaseline.revenue,
        adjustedEbitdaMargin:
          reducedBaseline.adjusted_ebitda / reducedBaseline.revenue,
        premiumShare: reducedBaseline.premium_share,
        netDebt: reducedBaseline.net_debt,
      }
    : {
        revenue: BASELINE_V04.revenue,
        adjustedEbitdaMargin: BASELINE_V04.adjusted_ebitda_margin,
        premiumShare: BASELINE_V04.premium_share,
        netDebt: BASELINE_V04.net_debt,
      };

  const benchmark = benchmarkRows?.[0];
  const rank = benchmark?.own_rank ?? null;
  const totalTeams = benchmark?.total_teams ?? null;
  const median = Number(benchmark?.median_final_game_value ?? 0);
  const vsMedian =
    median > 0 ? Number(finalScore.final_game_value) / median - 1 : null;

  const revenueDelta =
    Number(finalScore.final_revenue) / baseline.revenue - 1;
  const ebitdaDelta =
    Number(finalScore.final_ebitda_margin) -
    baseline.adjustedEbitdaMargin;
  const premiumDelta =
    Number(finalScore.final_premium_share) - baseline.premiumShare;

  const netDebt = Number(finalScore.final_net_debt);
  const aiDone = Boolean(aiSubmission);
  const leaderboardTeamMap = new Map(
    (leaderboardTeams ?? []).map((item) => [item.id, item.name]),
  );
  const leaderboard = (leaderboardScores ?? []).map((score, index) => ({
    position: index + 1,
    teamId: score.team_id,
    teamName: leaderboardTeamMap.get(score.team_id) ?? "Team",
    finalGameValue: Number(score.final_game_value),
    cumulativeUfcf: Number(score.cumulative_ufcf),
    strategicHealth: Number(score.strategic_health),
    isOwnTeam: score.team_id === team.id,
  }));
  const podium = [leaderboard[1], leaderboard[0], leaderboard[2]].filter(
    (item): item is NonNullable<typeof item> => Boolean(item),
  );

  return (
    <main className="application-page">
      <GameRealtime sessionId={session.id} teamId={team.id} />
      <AppHeader
        section={resultsReleased ? "Classifica finale" : "Risultato finale"}
        sessionCode="SIMULAZIONE COMPLETATA"
        userName={team.name}
      />

      <div className="page-main final-main">
        <section className="final-heading">
          <div>
            <h1>
              {resultsReleased ? "Classifica finale" : `${team.name} — Report finale`}
            </h1>
            <p>
              {resultsReleased
                ? "I risultati sono stati pubblicati dal docente. Scopri il podio, la classifica completa e poi approfondisci il report del tuo team."
                : "Il gioco è terminato. Completate la consegna AI: il docente mostrerà la classifica solo quando tutti i team avranno registrato il materiale richiesto."}
            </p>
          </div>
          {resultsReleased && rank && totalTeams ? (
            <div className="status-badge green">
              <span className="status-dot" />
              {rank}° di {totalTeams} team
            </div>
          ) : null}
        </section>

        {resultsReleased && leaderboard.length ? (
          <section className="student-leaderboard-reveal">
            <div className="student-podium" aria-label="Podio finale">
              <div className="student-podium-label">PODIO</div>
              <div className="student-podium-grid">
                {podium.map((entry) => (
                  <article
                    className={`student-podium-card position-${entry.position}${
                      entry.isOwnTeam ? " own-team" : ""
                    }`}
                    key={entry.teamId}
                  >
                    <span>{entry.position}°</span>
                    <strong>{entry.teamName.toUpperCase()}</strong>
                    <small>{moneyBn(entry.finalGameValue)}</small>
                  </article>
                ))}
              </div>
            </div>

            <div className="student-ranking-card">
              <div className="student-ranking-heading">
                <div>
                  <div className="card-eyebrow">RISULTATI FINALI</div>
                  <h2>Classifica completa</h2>
                </div>
                <span>{leaderboard.length} team</span>
              </div>

              <div className="student-ranking-table header">
                <span>#</span>
                <span>Team</span>
                <span>Valore finale</span>
                <span>FCF cumulato</span>
                <span>Solidità strategica</span>
              </div>

              <div className="student-ranking-rows">
                {leaderboard.map((entry) => (
                  <div
                    className={
                      entry.isOwnTeam
                        ? "student-ranking-table row own-team"
                        : "student-ranking-table row"
                    }
                    key={entry.teamId}
                  >
                    <strong>{entry.position}</strong>
                    <div>
                      <strong>{entry.teamName}</strong>
                      {entry.isOwnTeam ? <small>Il tuo team</small> : null}
                    </div>
                    <span>{moneyBn(entry.finalGameValue)}</span>
                    <span>{moneyBn(entry.cumulativeUfcf)}</span>
                    <span>{entry.strategicHealth.toFixed(2)}x</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {resultsReleased ? (
          <section className="final-value-hero">
            <div>
              <span>VALORE FINALE SIMULATO</span>
              <strong>{moneyBn(Number(finalScore.final_game_value))}</strong>
              <small>
                La classifica premia il valore creato nel tempo, non un singolo
                KPI annuale.
              </small>
            </div>
            <div className="final-hero-metric">
              <span>Posizione</span>
              <strong>{rank ? `${rank}° posto` : "—"}</strong>
            </div>
            <div className="final-hero-metric">
              <span>vs class median</span>
              <strong>{vsMedian === null ? "—" : signedPercent(vsMedian)}</strong>
            </div>
            <div className="final-hero-metric">
              <span>FCF cumulato</span>
              <strong>{moneyBn(Number(finalScore.cumulative_ufcf))}</strong>
            </div>
            <div className="final-hero-metric">
              <span>Solidità strategica</span>
              <strong>{Number(finalScore.strategic_health).toFixed(2)}x</strong>
            </div>
          </section>
        ) : (
          <section className="final-results-locked">
            <div className="final-results-locked-copy">
              <div className="card-eyebrow">CLASSIFICA BLOCCATA</div>
              <h2>Il risultato comparativo verrà svelato dal docente</h2>
              <p>
                Potete già rivedere le vostre scelte e i KPI operativi. Valore
                finale, posizione e benchmark della classe restano nascosti fino
                alla pubblicazione ufficiale.
              </p>
            </div>

            <div className="final-results-locked-metrics">
              <div>
                <span>Stato consegna</span>
                <strong>{aiDone ? "Registrata" : "Da completare"}</strong>
              </div>
              <div>
                <span>Cosa puoi vedere ora</span>
                <strong>KPI operativi</strong>
              </div>
              <div>
                <span>Classifica</span>
                <strong>Nascosta</strong>
              </div>
            </div>

            <div className="final-results-locked-status">
              <span className={aiDone ? "status-badge green" : "status-badge amber"}>
                <span className="status-dot" />
                {aiDone ? "Consegna AI registrata" : "Consegna AI da completare"}
              </span>
              <strong>Attendi “Mostra risultati” dal docente</strong>
            </div>
          </section>
        )}

        {isReducedModel && resultsReleased ? (
          <section className="final-value-breakdown-card">
            <div>
              <div className="card-eyebrow">COME SI FORMA IL VALORE</div>
              <h2>
                FGV = PV flussi espliciti + PV terminale − debito netto iniziale − distress
              </h2>
              <p>
                Il valore finale non coincide con il solo utile del 2030. Il
                modello costruisce prima l’Enterprise Value dai flussi
                attualizzati e dalla continuazione dell’impresa, poi sottrae la
                posizione finanziaria netta iniziale e l’eventuale costo atteso
                di distress.
              </p>
            </div>
            <div className="final-value-breakdown-grid">
              <article>
                <span>PV flussi espliciti</span>
                <strong>{moneyBn(Number(finalScore.pv_explicit_ufcf))}</strong>
                <small>UFCF 2026–2031 attualizzati</small>
              </article>
              <article>
                <span>PV valore terminale</span>
                <strong>{moneyBn(Number(finalScore.pv_terminal_value))}</strong>
                <small>continuità operativa oltre il piano</small>
              </article>
              <article>
                <span>Enterprise value</span>
                <strong>{moneyBn(Number(finalScore.enterprise_value))}</strong>
                <small>prima della posizione finanziaria iniziale</small>
              </article>
              <article>
                <span>Debito iniziale + distress</span>
                <strong>
                  −{moneyBn(baseline.netDebt).replace("−", "")}
                </strong>
                <small>
                  debito iniziale; distress: {moneyBn(Number(finalScore.risk_penalty))}
                </small>
              </article>
            </div>
          </section>
        ) : null}

        <section className="final-kpis">
          <article>
            <span>Ricavi finali (2030)</span>
            <strong>{moneyBn(Number(finalScore.final_revenue))}</strong>
            <small>{signedPercent(revenueDelta)} vs 2025</small>
          </article>
          <article>
            <span>Margine EBITDA</span>
            <strong>{percent(Number(finalScore.final_ebitda_margin))}</strong>
            <small>{pp(ebitdaDelta)} vs 2025</small>
          </article>
          <article>
            <span>Quota Premium</span>
            <strong>{percent(Number(finalScore.final_premium_share))}</strong>
            <small>{pp(premiumDelta)} vs 2025</small>
          </article>
          <article>
            <span>Debito netto / cassa</span>
            <strong>
              {netDebt < 0
                ? `${moneyBn(Math.abs(netDebt))} cash`
                : moneyBn(netDebt)}
            </strong>
            <small>{netDebt < 0 ? "posizione di cassa netta" : "debito netto"}</small>
          </article>
          <article>
            <span>Posizione competitiva</span>
            <strong>{Number(finalScore.competitive_position).toFixed(2)}x</strong>
            <small>indice finale del World Model</small>
          </article>
        </section>

        <div className="final-grid">
          <section className="final-history-card">
            <h2>Storico dei 3 round</h2>
            <div className="final-history-list">
              {(rounds ?? []).map((round) => {
                const decision = decisionByRound.get(round.id);
                return (
                  <article key={round.id}>
                    <div>
                      <span>
                        Round {round.round_number} · {round.period_label}
                      </span>
                      <strong>{round.scenario_title}</strong>
                    </div>
                    <p>
                      {decision
                        ? decisionSummary(
                            decision,
                            round.round_number as RoundNumber,
                            isReducedModel,
                          )
                        : "Decisioni non disponibili."}
                    </p>
                    <small>
                      Obiettivo:{" "}
                      {decision ? objectiveLabel(decision.objective) : "—"}
                    </small>
                  </article>
                );
              })}
            </div>
          </section>

          <aside className="final-next-card">
            <h2>Ultimo passaggio</h2>
            <ul>
              <li>Decisioni dei 3 round (2026–2030)</li>
              <li>Obiettivo scelto in ogni round</li>
              <li className={aiDone ? "done" : ""}>
                Conversazione AI {aiDone ? "registrata" : "da caricare"}
              </li>
              <li>KPI e conseguenze round per round</li>
              <li>
                {resultsReleased
                  ? "Benchmark rispetto alla classe"
                  : "Classifica e benchmark: in attesa del docente"}
              </li>
            </ul>
            <p>
              {aiDone
                ? resultsReleased
                  ? "La consegna AI è stata registrata e la classifica è stata pubblicata."
                  : "La consegna AI è stata registrata. Attendete che tutti i team completino la consegna e che il docente pubblichi la classifica."
                : "Per completare la consegna manca l’evidenza della conversazione AI del team."}
            </p>
            <a className="button-primary" href="/ai-chat">
              {aiDone ? "Vedi consegna chat AI" : "Vai al caricamento della chat AI"}
            </a>
          </aside>
        </div>
      </div>

      <AppFooter />
    </main>
  );
}
