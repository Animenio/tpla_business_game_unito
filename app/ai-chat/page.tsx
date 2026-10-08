import { redirect } from "next/navigation";
import { submitAiEvidenceAction } from "@/app/ai-chat/actions";
import { AppFooter } from "@/src/components/app-footer";
import { AppHeader } from "@/src/components/app-header";
import { GameRealtime } from "@/src/components/game-realtime";
import { StudentFinalLeaderboard } from "@/src/components/student-final-leaderboard";
import { requireStudentGameContext } from "@/src/lib/game/context";

interface AiChatPageProps {
  searchParams: Promise<{
    error?: string | string[];
  }>;
}

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function providerLabel(provider: string) {
  switch (provider) {
    case "chatgpt":
      return "ChatGPT";
    case "claude":
      return "Claude";
    case "gemini":
      return "Gemini";
    default:
      return "Altro";
  }
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AiChatPage({ searchParams }: AiChatPageProps) {
  const { supabase, session, team } = await requireStudentGameContext();

  if (session.status !== "completed") {
    redirect("/case-study");
  }

  const [{ data: sessionConfig }, { data: existing }] = await Promise.all([
    supabase
      .from("game_sessions")
      .select("ai_submission_form_url")
      .eq("id", session.id)
      .single(),
    supabase
      .from("team_ai_submissions")
      .select(
        "provider, external_reference_url, status, submitted_at, verified_at",
      )
      .eq("session_id", session.id)
      .eq("team_id", team.id)
      .maybeSingle(),
  ]);

  if (existing && session.results_released_at) {
    const { data: leaderboard, error: leaderboardError } = await supabase.rpc(
      "student_final_leaderboard",
      {
        p_session_id: session.id,
      },
    );

    return (
      <main className="application-page">
        <GameRealtime sessionId={session.id} teamId={team.id} />
        <AppHeader
          section="Classifica finale"
          sessionCode="SIMULAZIONE COMPLETATA"
          userName={team.name}
        />

        {leaderboardError ? (
          <div className="page-main student-results-main">
            <div className="page-error">
              La classifica è stata pubblicata ma non è ancora disponibile.
              Aggiorna la pagina tra qualche secondo.
            </div>
          </div>
        ) : (
          <StudentFinalLeaderboard
            currentTeamId={team.id}
            modelVersion={session.model_version}
            rows={leaderboard ?? []}
          />
        )}

        <AppFooter />
      </main>
    );
  }

  if (existing) {
    return (
      <main className="application-page">
        <GameRealtime sessionId={session.id} teamId={team.id} />
        <AppHeader
          section="Consegna completata"
          sessionCode="SIMULAZIONE COMPLETATA"
          userName={team.name}
        />

        <div className="page-main ai-waiting-main">
          <section className="ai-waiting-card">
            <div className="ai-waiting-check" aria-hidden="true">
              ✓
            </div>
            <div className="card-eyebrow">CONSEGNA REGISTRATA</div>
            <h1>Consegna effettuata</h1>
            <p>
              La conversazione AI del team <strong>{team.name}</strong> è stata
              registrata correttamente.
            </p>

            <div className="ai-waiting-status">
              <div className="status-badge amber">
                <span className="status-dot" />
                Risultati in attesa del docente
              </div>
              <h2>Attendi la pubblicazione della classifica</h2>
              <p>
                Il docente sta completando il debrief finale. Quando selezionerà
                “Mostra risultati”, questa pagina si aggiornerà automaticamente
                e visualizzerà il podio e la classifica completa dei team.
              </p>
            </div>

            <dl className="ai-waiting-meta">
              <div>
                <dt>Modello AI dichiarato</dt>
                <dd>{providerLabel(existing.provider)}</dd>
              </div>
              <div>
                <dt>Registrata il</dt>
                <dd>{formatDateTime(existing.submitted_at)}</dd>
              </div>
              <div>
                <dt>Stato consegna</dt>
                <dd>
                  {existing.status === "verified"
                    ? "Verificata dal docente"
                    : "Registrata"}
                </dd>
              </div>
            </dl>

            <p className="ai-waiting-note">
              Non è necessario ricaricare manualmente la pagina.
            </p>
          </section>
        </div>

        <AppFooter />
      </main>
    );
  }

  const search = await searchParams;
  const error = param(search.error);
  const formUrl = sessionConfig?.ai_submission_form_url ?? null;

  return (
    <main className="application-page">
      <GameRealtime sessionId={session.id} teamId={team.id} />
      <AppHeader
        section="Consegna chat AI"
        sessionCode="REPORT FINALE"
        userName={team.name}
      />

      <div className="page-main ai-upload-main">
        <section className="ai-upload-heading">
          <div>
            <div className="card-eyebrow">EVIDENZA AI</div>
            <h1>Carica la conversazione AI del team</h1>
            <p>
              La chat completa documenta come avete analizzato i materiali,
              ricercato evidenze e supportato le decisioni dei tre round.
            </p>
          </div>
          <div className="status-badge blue">
            <span className="status-dot" />
            Da consegnare
          </div>
        </section>

        {error ? <div className="page-error ai-upload-error">{error}</div> : null}

        <div className="ai-upload-grid">
          <section className="ai-upload-card">
            <div className="card-eyebrow">1 · ESPORTA E CARICA</div>
            <h2>Documento completo della conversazione</h2>
            <p>
              Esporta la chat dal modello utilizzato e caricala nel modulo
              ufficiale. L’app registra lo stato della consegna; il file resta
              nel flusso Google Form/Drive previsto per il corso.
            </p>

            <div className="ai-external-upload-zone">
              <span className="ai-upload-arrow" aria-hidden="true">
                ↑
              </span>
              {formUrl ? (
                <a
                  className="button-secondary ai-form-button"
                  href={formUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Apri il modulo di caricamento
                </a>
              ) : (
                <button
                  className="button-secondary ai-form-button"
                  disabled
                  type="button"
                >
                  Modulo non ancora pubblicato
                </button>
              )}

              <div className="ai-file-note">
                Formati consigliati: PDF · TXT · DOCX · HTML. Rimuovete contenuti
                personali o non pertinenti prima della consegna.
              </div>
            </div>

            <div className="card-rule" />

            <form action={submitAiEvidenceAction} className="ai-evidence-form">
              <div>
                <strong>2 · Dichiara il modello AI utilizzato</strong>
                <div className="provider-grid">
                  {[
                    ["chatgpt", "ChatGPT"],
                    ["claude", "Claude"],
                    ["gemini", "Gemini"],
                    ["other", "Altro"],
                  ].map(([value, label]) => (
                    <label className="provider-chip" key={value}>
                      <input
                        name="provider"
                        required
                        type="radio"
                        value={value}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="ai-reference-field">
                <span>Link alla copia/documento (opzionale)</span>
                <input
                  name="external_reference_url"
                  placeholder="https://..."
                  type="url"
                />
              </label>

              <div className="ai-confirmation-title">3 · Conferma</div>
              <label className="ai-confirmation">
                <input name="confirmed_cleaned" required type="checkbox" />
                <span>
                  Confermo che il materiale riguarda la simulazione e che sono
                  stati rimossi dati personali o contenuti non pertinenti.
                </span>
              </label>

              <button
                className="button-primary ai-submit-button"
                disabled={!formUrl}
                type="submit"
              >
                Registra la consegna
              </button>
            </form>
          </section>

          <aside className="ai-report-card">
            <div className="card-eyebrow">REPORT FINALE</div>
            <h2>Completa la consegna e attendi lo svelamento</h2>
            <ul>
              <li>Decisioni dei tre round</li>
              <li>Obiettivo dichiarato in ogni round</li>
              <li>Uso dichiarato dell’AI</li>
              <li>Evidenza completa della conversazione</li>
              <li>Risultati economico-finanziari e benchmark</li>
            </ul>

            <a className="button-secondary ai-back-button" href="/final">
              Torna al report in attesa
            </a>
          </aside>
        </div>
      </div>

      <AppFooter />
    </main>
  );
}
