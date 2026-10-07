import { redirect } from "next/navigation";
import { submitAiEvidenceAction } from "@/app/ai-chat/actions";
import { AppFooter } from "@/src/components/app-footer";
import { AppHeader } from "@/src/components/app-header";
import { requireStudentGameContext } from "@/src/lib/game/context";

interface AiChatPageProps {
  searchParams: Promise<{
    error?: string | string[];
    submitted?: string | string[];
  }>;
}

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
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

  const search = await searchParams;
  const error = param(search.error);
  const submitted = param(search.submitted) === "1";
  const formUrl = sessionConfig?.ai_submission_form_url ?? null;

  return (
    <main className="application-page">
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
          <div
            className={
              existing?.status === "verified"
                ? "status-badge green"
                : existing
                  ? "status-badge amber"
                  : "status-badge blue"
            }
          >
            <span className="status-dot" />
            {existing?.status === "verified"
              ? "Verificata"
              : existing
                ? "Consegnata"
                : "Da consegnare"}
          </div>
        </section>

        {error ? <div className="page-error ai-upload-error">{error}</div> : null}
        {submitted ? (
          <div className="ai-upload-success">
            Consegna registrata. Il docente vedrà lo stato del team nella
            console finale.
          </div>
        ) : null}

        <div className="ai-upload-grid">
          <section className="ai-upload-card">
            <div className="card-eyebrow">1 · ESPORTA E CARICA</div>
            <h2>Documento completo della conversazione</h2>
            <p>
              Esporta la chat dal modello utilizzato e caricala nel modulo
              ufficiale. L’app registra lo stato della consegna; il file resta
              nel flusso Google Form/Drive previsto per il corso.
            </p>

            {formUrl ? (
              <a
                className="button-primary ai-form-button"
                href={formUrl}
                rel="noreferrer"
                target="_blank"
              >
                Apri il modulo di caricamento
              </a>
            ) : (
              <button className="button-primary ai-form-button" disabled type="button">
                Modulo non ancora pubblicato
              </button>
            )}

            <div className="ai-file-note">
              Formati consigliati: PDF, TXT, DOCX o HTML. Rimuovete contenuti
              personali o non pertinenti prima della consegna.
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
                        defaultChecked={existing?.provider === value}
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
                  defaultValue={existing?.external_reference_url ?? ""}
                  name="external_reference_url"
                  placeholder="https://..."
                  type="url"
                />
              </label>

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
            <h2>Cosa verrà associato al report</h2>
            <ul>
              <li>Decisioni dei tre round</li>
              <li>Obiettivo dichiarato in ogni round</li>
              <li>Uso dichiarato dell’AI</li>
              <li>Evidenza completa della conversazione</li>
              <li>Risultati economico-finanziari e benchmark</li>
            </ul>

            {existing ? (
              <div className="ai-existing-status">
                <span>Ultima registrazione</span>
                <strong>
                  {existing.submitted_at
                    ? new Intl.DateTimeFormat("it-IT", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(existing.submitted_at))
                    : "—"}
                </strong>
                <small>
                  Stato: {existing.status === "verified" ? "verificata" : "in verifica"}
                </small>
              </div>
            ) : null}

            <a className="button-secondary ai-back-button" href="/final">
              Torna al report finale
            </a>
          </aside>
        </div>
      </div>

      <AppFooter />
    </main>
  );
}
