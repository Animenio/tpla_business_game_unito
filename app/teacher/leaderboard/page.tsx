import { redirect } from "next/navigation";
import {
  releaseFinalResultsAction,
  setAiSubmissionFormAction,
  verifyAiEvidenceAction,
} from "@/app/teacher/leaderboard/actions";
import { AppFooter } from "@/src/components/app-footer";
import { AppHeader } from "@/src/components/app-header";
import { RestartSimulationControl } from "@/src/components/restart-simulation-control";
import { TeacherRealtime } from "@/src/components/teacher-realtime";
import { objectiveLabel } from "@/src/domain/game/round-content";
import {
  orientationLabel,
  resilienceLabel,
} from "@/src/domain/simulation/v05/storage";
import type { RoundNumber } from "@/src/domain/simulation/v05/spec";
import { requireTeacherGameContext } from "@/src/lib/game/context";

interface TeacherLeaderboardProps {
  searchParams: Promise<{ error?: string | string[] }>;
}

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function moneyBn(value: number) {
  const absolute = Math.abs(value / 1000);
  return `${value < 0 ? "−" : ""}€${absolute.toFixed(2)}bn`;
}

function percent(value: number | null, digits = 1) {
  if (value === null) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

function signedPercent(value: number | null, digits = 1) {
  if (value === null) return "—";
  const pct = value * 100;
  return `${pct > 0 ? "+" : ""}${pct.toFixed(digits)}%`;
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[midpoint]
    : (sorted[midpoint - 1] + sorted[midpoint]) / 2;
}

function mode(values: string[]) {
  if (!values.length) return "—";
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
  );
  if (!ranked[0]) return "—";
  if (ranked[1] && ranked[1][1] === ranked[0][1]) return "Misto";
  return ranked[0][0];
}

export default async function TeacherLeaderboardPage({
  searchParams,
}: TeacherLeaderboardProps) {
  const { supabase, profile, membership, session } =
    await requireTeacherGameContext();

  if (session.status !== "completed") {
    redirect("/teacher");
  }

  const [
    { data: scores },
    { data: teams },
    { data: submissions },
    { data: config },
    { data: rounds },
  ] = await Promise.all([
    supabase
      .from("team_final_scores")
      .select(
        "team_id, final_game_value, final_revenue, final_ebitda_margin, final_premium_share, final_net_debt, competitive_position, strategic_health",
      )
      .eq("session_id", session.id)
      .order("final_game_value", { ascending: false }),
    supabase
      .from("teams")
      .select("id, name")
      .eq("session_id", session.id)
      .eq("status", "completed")
      .order("created_at", { ascending: true }),
    supabase
      .from("team_ai_submissions")
      .select(
        "team_id, provider, external_reference_url, status, submitted_at, verified_at",
      )
      .eq("session_id", session.id),
    supabase
      .from("game_sessions")
      .select("ai_submission_form_url, completed_at, results_released_at")
      .eq("id", session.id)
      .single(),
    supabase
      .from("game_rounds")
      .select("id, round_number, period_label, scenario_title")
      .eq("session_id", session.id)
      .order("round_number", { ascending: true }),
  ]);

  const roundIds = (rounds ?? []).map((round) => round.id);
  const { data: decisions } = roundIds.length
    ? await supabase
        .from("team_round_decisions")
        .select(
          "round_id, objective, hv_price_change, std_price_change, marketing_change, rnd_pct, capex_pct, inventory_days, natural_rubber_hedge, connected_rnd_allocation",
        )
        .in("round_id", roundIds)
        .eq("status", "submitted")
    : { data: [] };

  const teamMap = new Map((teams ?? []).map((team) => [team.id, team]));
  const submissionMap = new Map(
    (submissions ?? []).map((submission) => [submission.team_id, submission]),
  );
  const resultsReleased = Boolean(config?.results_released_at);
  const submittedCount = submissions?.length ?? 0;
  const teamCount = teams?.length ?? 0;
  const verifiedCount =
    submissions?.filter((item) => item.status === "verified").length ?? 0;
  const allSubmitted = teamCount > 0 && submittedCount === teamCount;

  const finalRevenueMedian = median(
    (scores ?? []).map((score) => Number(score.final_revenue)),
  );
  const finalMarginMedian = median(
    (scores ?? []).map((score) => Number(score.final_ebitda_margin)),
  );
  const finalNetDebtMedian = median(
    (scores ?? []).map((score) => Number(score.final_net_debt)),
  );
  const finalHealthMedian = median(
    (scores ?? []).map((score) => Number(score.strategic_health)),
  );

  const roundDebrief = (rounds ?? []).map((round) => {
    const roundNumber = round.round_number as RoundNumber;
    const rows = (decisions ?? []).filter(
      (decision) => decision.round_id === round.id,
    );

    return {
      id: round.id,
      roundNumber,
      periodLabel: round.period_label,
      scenarioTitle: round.scenario_title,
      premiumMedian: median(rows.map((row) => Number(row.hv_price_change))),
      standardMedian: median(rows.map((row) => Number(row.std_price_change))),
      marketingMedian: median(rows.map((row) => Number(row.marketing_change))),
      rndMedian: median(rows.map((row) => Number(row.rnd_pct))),
      capexMedian: median(rows.map((row) => Number(row.capex_pct))),
      orientationMode: mode(
        rows.map((row) =>
          orientationLabel(Number(row.connected_rnd_allocation), roundNumber),
        ),
      ),
      resilienceMode: mode(
        rows.map((row) =>
          resilienceLabel(
            Number(row.inventory_days),
            Number(row.natural_rubber_hedge),
          ),
        ),
      ),
      objectiveMode: mode(
        rows.map((row) => objectiveLabel(row.objective)),
      ),
    };
  });

  const search = await searchParams;
  const error = param(search.error);

  return (
    <main className="application-page">
      <TeacherRealtime sessionId={session.id} />
      <AppHeader
        section={resultsReleased ? "Classifica finale" : "Debrief finale"}
        sessionCode="SIMULAZIONE COMPLETATA"
        userName={profile.full_name}
      />

      <div className="page-main leaderboard-main">
        <section className="leaderboard-heading">
          <div>
            <div className="card-eyebrow">
              {resultsReleased ? "RISULTATI PUBBLICATI" : "FASE DI DEBRIEF"}
            </div>
            <h1>
              {resultsReleased
                ? `Leaderboard — ${session.code}`
                : `Sintesi della classe — ${session.code}`}
            </h1>
            <p>
              {resultsReleased
                ? `Classifica finale prodotta dal World Model ${session.model_version.replace("aurora-tyres-", "")}.`
                : "Prima di svelare la classifica puoi discutere le scelte aggregate, le tendenze dei tre round e i risultati operativi della classe."}
            </p>
          </div>
          <div className="leaderboard-heading-actions">
            {membership.role === "admin" ? (
              <>
                <a className="button-secondary" href="/admin/sessions">
                  Sessioni
                </a>
                <a className="button-secondary" href="/admin/teachers">
                  Gestisci accessi
                </a>
              </>
            ) : null}
            <div className={resultsReleased ? "status-badge green" : "status-badge amber"}>
              <span className="status-dot" />
              {resultsReleased ? "Classifica visibile" : "Classifica nascosta"}
            </div>
          </div>
        </section>

        {error ? <div className="page-error teacher-error">{error}</div> : null}

        <section className="class-debrief-summary">
          <div className="class-debrief-heading">
            <div>
              <div className="card-eyebrow">SINTESI PRIMA DELLA CLASSIFICA</div>
              <h2>Come si è comportata la classe</h2>
            </div>
            <span>{teamCount} team completati</span>
          </div>
          <div className="class-debrief-kpis">
            <article>
              <span>Ricavi finali mediani</span>
              <strong>
                {finalRevenueMedian === null ? "—" : moneyBn(finalRevenueMedian)}
              </strong>
            </article>
            <article>
              <span>Margine EBITDA mediano</span>
              <strong>{percent(finalMarginMedian)}</strong>
            </article>
            <article>
              <span>Debito netto mediano</span>
              <strong>
                {finalNetDebtMedian === null ? "—" : moneyBn(finalNetDebtMedian)}
              </strong>
            </article>
            <article>
              <span>Solidità strategica mediana</span>
              <strong>
                {finalHealthMedian === null ? "—" : `${finalHealthMedian.toFixed(2)}x`}
              </strong>
            </article>
          </div>

          <div className="class-round-debrief-grid">
            {roundDebrief.map((round) => (
              <article key={round.id}>
                <div className="class-round-debrief-title">
                  <span>Round {round.roundNumber} · {round.periodLabel}</span>
                  <strong>{round.scenarioTitle}</strong>
                </div>
                <dl>
                  <div>
                    <dt>Premium mediano</dt>
                    <dd>{signedPercent(round.premiumMedian)}</dd>
                  </div>
                  <div>
                    <dt>Standard mediano</dt>
                    <dd>{signedPercent(round.standardMedian)}</dd>
                  </div>
                  <div>
                    <dt>Marketing mediano</dt>
                    <dd>{signedPercent(round.marketingMedian)}</dd>
                  </div>
                  <div>
                    <dt>R&S mediana</dt>
                    <dd>{percent(round.rndMedian)}</dd>
                  </div>
                  <div>
                    <dt>CapEx mediano</dt>
                    <dd>{percent(round.capexMedian)}</dd>
                  </div>
                  <div>
                    <dt>Orientamento prevalente</dt>
                    <dd>{round.orientationMode}</dd>
                  </div>
                  <div>
                    <dt>Resilienza prevalente</dt>
                    <dd>{round.resilienceMode}</dd>
                  </div>
                  <div>
                    <dt>Obiettivo prevalente</dt>
                    <dd>{round.objectiveMode}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>

        <section className="results-release-card">
          <div>
            <div className="card-eyebrow">CONSEGNE E SVELAMENTO</div>
            <h2>
              {resultsReleased
                ? "La classifica è stata pubblicata"
                : allSubmitted
                  ? "Tutti i team hanno registrato la consegna"
                  : "Attendi tutte le consegne AI"}
            </h2>
            <p>
              {resultsReleased
                ? "Gli studenti possono ora vedere valore finale, posizione e benchmark della classe."
                : `${submittedCount} di ${teamCount} team hanno cliccato “Registra la consegna”. Quando il contatore arriva al 100%, puoi usare “Mostra risultati”.`}
            </p>
            <div className="results-release-stats">
              <span>{submittedCount}/{teamCount} registrate</span>
              <span>{verifiedCount}/{teamCount} verificate</span>
            </div>
          </div>
          {resultsReleased ? (
            <div className="status-badge green">
              <span className="status-dot" />
              Pubblicata
            </div>
          ) : (
            <form action={releaseFinalResultsAction}>
              <button
                className="button-primary results-release-button"
                disabled={!allSubmitted}
                type="submit"
              >
                {allSubmitted ? "Mostra risultati" : "In attesa delle consegne"}
              </button>
            </form>
          )}
        </section>

        <section className="leaderboard-table-card">
          <div className="card-eyebrow">
            {resultsReleased ? "CLASSIFICA" : "STATO CONSEGNE"}
          </div>
          <h2>
            {resultsReleased
              ? "Classifica finale"
              : "Controllo team prima dello svelamento"}
          </h2>

          {resultsReleased ? (
            <>
              <div className="leaderboard-table header">
                <span>#</span>
                <span>Team</span>
                <span>Valore finale</span>
                <span>Ricavi 2030</span>
                <span>EBITDA</span>
                <span>AI evidence</span>
              </div>

              <div className="leaderboard-rows">
                {(scores ?? []).map((score, index) => {
                  const team = teamMap.get(score.team_id);
                  const submission = submissionMap.get(score.team_id);

                  return (
                    <div className="leaderboard-table row" key={score.team_id}>
                      <strong>{index + 1}</strong>
                      <div>
                        <strong>{team?.name ?? "Team"}</strong>
                        <small>
                          Solidità {Number(score.strategic_health).toFixed(2)}x
                        </small>
                      </div>
                      <strong>{moneyBn(Number(score.final_game_value))}</strong>
                      <span>{moneyBn(Number(score.final_revenue))}</span>
                      <span>
                        {(Number(score.final_ebitda_margin) * 100).toFixed(1)}%
                      </span>
                      <div className="leaderboard-ai-cell">
                        <span
                          className={
                            submission?.status === "verified"
                              ? "status-badge green compact"
                              : submission
                                ? "status-badge amber compact"
                                : "status-badge blue compact"
                          }
                        >
                          <span className="status-dot" />
                          {submission?.status === "verified"
                            ? "Verificata"
                            : submission
                              ? "Consegnata"
                              : "Mancante"}
                        </span>
                        {submission && submission.status !== "verified" ? (
                          <form action={verifyAiEvidenceAction}>
                            <input name="team_id" type="hidden" value={score.team_id} />
                            <button className="text-action" type="submit">
                              Verifica
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="submission-readiness-list">
              {(teams ?? []).map((team) => {
                const submission = submissionMap.get(team.id);
                return (
                  <div key={team.id}>
                    <strong>{team.name}</strong>
                    <span
                      className={
                        submission?.status === "verified"
                          ? "status-badge green compact"
                          : submission
                            ? "status-badge amber compact"
                            : "status-badge blue compact"
                      }
                    >
                      <span className="status-dot" />
                      {submission?.status === "verified"
                        ? "Verificata"
                        : submission
                          ? "Registrata"
                          : "Mancante"}
                    </span>
                    <small>
                      {submission?.submitted_at
                        ? new Intl.DateTimeFormat("it-IT", {
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(submission.submitted_at))
                        : "—"}
                    </small>
                    {submission && submission.status !== "verified" ? (
                      <form action={verifyAiEvidenceAction}>
                        <input name="team_id" type="hidden" value={team.id} />
                        <button className="text-action" type="submit">
                          Verifica
                        </button>
                      </form>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="leaderboard-bottom-grid">
          <section className="teacher-form-config">
            <div className="card-eyebrow">CONSEGNA CHAT AI</div>
            <h2>Modulo Google Form / Drive</h2>
            <p>
              Pubblica il link utilizzato dagli studenti per caricare il file
              completo della conversazione AI.
            </p>
            <form action={setAiSubmissionFormAction}>
              <input
                defaultValue={config?.ai_submission_form_url ?? ""}
                name="form_url"
                placeholder="https://forms.gle/..."
                type="url"
              />
              <button className="button-primary" type="submit">
                Salva link
              </button>
            </form>
          </section>

          <section className="leaderboard-summary">
            <div className="card-eyebrow">STATO CONSEGNE</div>
            <h2>{submittedCount} / {teamCount} team</h2>
            <p>
              {verifiedCount} consegne già verificate dal docente.
            </p>
            <a className="button-secondary" href="/teacher">
              Torna alla console
            </a>
          </section>
        </div>

        <section className="teacher-restart-card leaderboard-restart-card">
          <div>
            <div className="card-eyebrow">RIAVVIO SIMULAZIONE</div>
            <h2>Riparti con la stessa classe</h2>
            <p>
              Azzera la run completata e riporta tutti i team alla lobby
              pre-avvio, mantenendo studenti, team e materiali.
            </p>
          </div>
          <RestartSimulationControl
            sessionCode={session.code}
            sessionId={session.id}
          />
        </section>
      </div>

      <AppFooter />
    </main>
  );
}
