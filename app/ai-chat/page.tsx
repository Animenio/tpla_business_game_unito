import { redirect } from "next/navigation";
import { submitAiEvidenceAction } from "@/app/ai-chat/actions";
import { AppFooter } from "@/src/components/app-footer";
import { AppHeader } from "@/src/components/app-header";
import { GameRealtime } from "@/src/components/game-realtime";
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
    redirect("/final");
  }

  if (existing) {
    return (
      <main className="application-page">
        <GameRealtime sessionId={session.id} teamId={team.id} />
        <AppHeader
          section="Consegna effettuata"
          sessionCode="REPORT FINALE"
          userName={team.name}
        />

        <div className="page-main ai-waiting-main">
          <section className="ai-waiting-card">
            <div className="ai-waiting-check" aria-hidden="true">
              ✓
            </div>
            <div className="card-eyebrow">CONSEGNA REGISTRATA</div>
            <h1>Consegna effettuata</h1>
            <p className="ai-waiting-lead">
              La conversazione AI del team è stata registrata correttamente.
            </p>

            <div className="ai-waiting-status">
              <span className="status-badge amber">
                <span className="status-dot" />
                Risultati in attesa del docente
              </span>
              <p>
                Attendete la pubblicazione ufficiale. Quando il docente
                selezionerà <strong>Mostra risultati</strong>, questa schermata
                si aggiornerà automaticamente e verrà aperta la classifica
                finale.
              </p>
            </div>

            <div className="ai-waiting-details">
              <div>
                <span>Team</span>
                <strong>{team.name}</strong>
              </div>
              <div>
                <span>Modello AI dichiarato</span>
                <strong>{providerLabel(existing.provider)}</strong>
              </div>
              <div>
                <span>Registrata il</span>
                <strong>
                  {new Intl.DateTimeFormat("it-IT", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(existing.submitted_at))}
                </strong>
              </div>
              <div>
                <span>Stato verifica</span>
                <strong>
                  {existing.status === "verified" ? "Verificata" : "Registrata"}
                </strong>
              </div>
            </div>

            <div className="ai-waiting-note">
              Non è necessario aggiornare manualmente la pagina.
            </div>
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

            <div className="ai-existing-status">
              <span>Stato</span>
              <strong>Da consegnare</strong>
              <small>
                Dopo “Registra la consegna” entrerete automaticamente nella
                schermata di attesa.
              </small>
            </div>

            <a className="button-secondary ai-back-button" href="/final">
              Torna al report
            </a>
          </aside>
        </div>
      </div>

      <AppFooter />
    </main>
  );
}
