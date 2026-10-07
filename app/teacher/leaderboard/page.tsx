import { redirect } from "next/navigation";
import {
  setAiSubmissionFormAction,
  verifyAiEvidenceAction,
} from "@/app/teacher/leaderboard/actions";
import { AppFooter } from "@/src/components/app-footer";
import { AppHeader } from "@/src/components/app-header";
import { RestartSimulationControl } from "@/src/components/restart-simulation-control";
import { requireTeacherGameContext } from "@/src/lib/game/context";

interface TeacherLeaderboardProps {
  searchParams: Promise<{ error?: string | string[] }>;
}

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function moneyBn(value: number) {
  return `€${(value / 1000).toFixed(2)}bn`;
}

export default async function TeacherLeaderboardPage({
  searchParams,
}: TeacherLeaderboardProps) {
  const { supabase, profile, membership, session } = await requireTeacherGameContext();

  if (session.status !== "completed") {
    redirect("/teacher");
  }

  const [
    { data: scores },
    { data: teams },
    { data: submissions },
    { data: config },
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
      .eq("session_id", session.id),
    supabase
      .from("team_ai_submissions")
      .select(
        "team_id, provider, external_reference_url, status, submitted_at, verified_at",
      )
      .eq("session_id", session.id),
    supabase
      .from("game_sessions")
      .select("ai_submission_form_url, completed_at")
      .eq("id", session.id)
      .single(),
  ]);

  const teamMap = new Map((teams ?? []).map((team) => [team.id, team]));
  const submissionMap = new Map(
    (submissions ?? []).map((submission) => [submission.team_id, submission]),
  );
  const search = await searchParams;
  const error = param(search.error);

  return (
    <main className="application-page">
      <AppHeader
        section="Classifica finale"
        sessionCode="SIMULAZIONE COMPLETATA"
        userName={profile.full_name}
      />

      <div className="page-main leaderboard-main">
        <section className="leaderboard-heading">
          <div>
            <div className="card-eyebrow">RISULTATI FINALI</div>
            <h1>Leaderboard — {session.code}</h1>
            <p>
              Valore finale prodotto dal World Model v0.4 e stato della
              documentazione AI richiesta ai team.
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
            <div className="status-badge green">
              <span className="status-dot" />
              {scores?.length ?? 0} team calcolati
            </div>
          </div>
        </section>

        {error ? <div className="page-error teacher-error">{error}</div> : null}

        <section className="leaderboard-table-card">
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
        </section>

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
            <h2>
              {(submissions ?? []).length} / {(scores ?? []).length} team
            </h2>
            <p>
              {(submissions ?? []).filter((item) => item.status === "verified").length}{" "}
              consegne già verificate dal docente.
            </p>
            <a className="button-secondary" href="/teacher">
              Torna alla console
            </a>
          </section>
        </div>
      </div>

      <AppFooter />
    </main>
  );
}
