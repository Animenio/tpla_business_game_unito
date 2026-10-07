import { redirect } from "next/navigation";
import { AppFooter } from "@/src/components/app-footer";
import { AppHeader } from "@/src/components/app-header";
import { GameRealtime } from "@/src/components/game-realtime";
import { requireStudentGameContext } from "@/src/lib/game/context";
import { V05_DECISION_COUNT } from "@/src/domain/game/round-content-v05";
import { MODEL_VERSION as V05_MODEL_VERSION } from "@/src/domain/simulation/v05/spec";

export default async function CaseStudyPage() {
  const { supabase, profile, session, team } =
    await requireStudentGameContext();

  if (session.status === "completed") {
    redirect("/final");
  }

  if (session.status !== "live") {
    redirect("/lobby");
  }

  const [{ data: materials }, { data: rounds }] = await Promise.all([
    supabase
      .from("session_materials")
      .select(
        "id, title, description, file_type, source_url, sort_order, required",
      )
      .eq("session_id", session.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("game_rounds")
      .select(
        "id, round_number, period_label, scenario_title, status, opens_at, closes_at",
      )
      .eq("session_id", session.id)
      .order("round_number", { ascending: true }),
  ]);

  const openRound = rounds?.find((round) => round.status === "open");
  const isV05 = session.model_version === V05_MODEL_VERSION;

  return (
    <main className="application-page">
      <GameRealtime sessionId={session.id} teamId={team.id} />
      <AppHeader
        section="Materiale iniziale"
        sessionCode={session.code}
        userName={profile.full_name}
      />

      <div className="page-main case-main">
        <section className="case-heading">
          <div>
            <div className="card-eyebrow">DATA ROOM</div>
            <h1>Materiale per lo studio — Aurora Tyres</h1>
            <p>
              Analizzate i documenti prima dell’apertura del primo round. Il
              materiale aziendale è comune a tutti i team.
            </p>
          </div>
          <div className="study-time-card">
            <span>STUDIO INIZIALE</span>
            <strong>20 min</strong>
          </div>
        </section>

        <section className="material-panel">
          <div className="material-panel-heading">
            <div>
              <div className="card-eyebrow">DOCUMENTI OBBLIGATORI</div>
              <h2>Data Room Aurora Tyres</h2>
            </div>
            <span>{materials?.length ?? 0} documenti</span>
          </div>

          <div className="material-grid">
            {(materials ?? []).map((material) => (
              <article className="material-card" key={material.id}>
                <div className="material-type">{material.file_type}</div>
                <h3>{material.title}</h3>
                <p>{material.description}</p>
                {material.source_url ? (
                  <a
                    className="button-secondary material-button"
                    href={material.source_url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Apri documento
                  </a>
                ) : (
                  <button
                    className="button-secondary material-button"
                    disabled
                    type="button"
                  >
                    Link in pubblicazione
                  </button>
                )}
              </article>
            ))}
          </div>

          <div className="ai-study-note">
            <strong>USO DELL’AI</strong>
            <p>
              Caricate entrambi i documenti nella stessa conversazione AI.
              Conservate la chat completa: sarà richiesta al termine della
              simulazione.
            </p>
          </div>
        </section>

        <section className="board-mandate">
          <div>
            <div className="card-eyebrow">MANDATO DEL BOARD</div>
            <h2>Create value across five years.</h2>
            <p>
              Proteggete redditività e cassa senza sacrificare la competitività
              di lungo periodo.
            </p>
          </div>
          <strong>
            2026 → 2030 · 3 round strategici · {isV05 ? V05_DECISION_COUNT : 9} decisioni per round
          </strong>
        </section>

        <section className="research-split">
          <div>
            <span>FORNITO</span>
            <strong>Materiale aziendale</strong>
            <p>
              Bilancio, nota integrativa e informazioni rilasciate dalla
              simulazione.
            </p>
          </div>
          <div>
            <span>RICERCATE VOI</span>
            <strong>Mercato, competitor e trend</strong>
            <p>
              Le evidenze esterne restano responsabilità del team e possono
              essere ricercate con il supporto dell’AI.
            </p>
          </div>
        </section>

        <section className="round-entry-card">
          <div>
            <div className="card-eyebrow">ROUND 1</div>
            <h2>
              {openRound
                ? "La finestra decisionale è aperta"
                : "Attendi l’apertura del Round 1"}
            </h2>
            <p>
              {openRound
                ? "Il docente ha aperto il round. Leggete il briefing prima di entrare nelle decisioni."
                : "La Data Room rimane disponibile mentre il docente prepara l’avvio."}
            </p>
          </div>
          {openRound ? (
            <a
              className="button-primary round-entry-button"
              href={`/rounds/${openRound.round_number}/briefing`}
            >
              Apri il briefing
            </a>
          ) : (
            <div className="status-badge amber">
              <span className="status-dot" />
              In attesa del docente
            </div>
          )}
        </section>
      </div>

      <AppFooter />
    </main>
  );
}
