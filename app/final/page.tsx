import { redirect } from "next/navigation";
import { AppFooter } from "@/src/components/app-footer";
import { AppHeader } from "@/src/components/app-header";
import { objectiveLabel } from "@/src/domain/game/round-content";
import { BASELINE_2025 as BASELINE_V04 } from "@/src/domain/simulation/v04/spec";
import {
  BASELINE_2025 as BASELINE_V05,
  MODEL_VERSION as V05_MODEL_VERSION,
  type RoundNumber,
} from "@/src/domain/simulation/v05/spec";
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
  isV05: boolean,
) {
  if (isV05) {
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

  const [
    { data: finalScore },
    { data: benchmarkRows },
    { data: rounds },
    { data: aiSubmission },
  ] = await Promise.all([
    supabase
      .from("team_final_scores")
      .select("*")
      .eq("session_id", session.id)
      .eq("team_id", team.id)
      .maybeSingle(),
    supabase.rpc("student_final_benchmark", { p_session_id: session.id }),
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

  const isV05 = session.model_version === V05_MODEL_VERSION;
  const baseline = isV05
    ? {
        revenue: BASELINE_V05.revenue,
        adjustedEbitdaMargin:
          BASELINE_V05.adjusted_ebitda / BASELINE_V05.revenue,
        premiumShare: BASELINE_V05.premium_share,
        netDebt: BASELINE_V05.net_debt,
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

  return (
    <main className="application-page">
      <AppHeader
        section="Risultato finale"
        sessionCode="SIMULAZIONE COMPLETATA"
        userName={team.name}
      />

      <div className="page-main final-main">
        <section className="final-heading">
          <div>
            <h1>{team.name} — Report finale</h1>
            <p>
              Il gioco è terminato. Il report combina valore creato, KPI finali,
              decisioni dei tre round e benchmark rispetto alla classe.
            </p>
          </div>
          {rank && totalTeams ? (
            <div className="status-badge green">
              <span className="status-dot" />
              {rank}° di {totalTeams} team
            </div>
          ) : null}
        </section>

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

        {isV05 ? (
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
                            isV05,
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
              <li>Benchmark rispetto alla classe</li>
            </ul>
            <p>
              {aiDone
                ? "La consegna AI è stata registrata. Il docente potrà verificarla."
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
