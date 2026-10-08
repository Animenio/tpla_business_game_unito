import { AppFooter } from "@/src/components/app-footer";
import { AppHeader } from "@/src/components/app-header";
import { V05DecisionForm } from "@/src/components/v05-decision-form";
import {
  BASELINE_DISPLAY,
  ROUND_CONTENT,
  ROUND_OBJECTIVES,
  objectiveLabel,
} from "@/src/domain/game/round-content";
import {
  V05_DECISION_COUNT,
  V05_ROUND_DECISION_FOCUS,
} from "@/src/domain/game/round-content-v05";
import {
  DEFAULT_DECISIONS,
  type RoundNumber,
} from "@/src/domain/simulation/v053/spec";
import { decisionToStoredRow } from "@/src/domain/simulation/v05/storage";

type PreviewMaterial = {
  id: string;
  title: string;
  description: string | null;
  material_type: string;
  source_url: string | null;
  required: boolean;
};

interface AdminGamePreviewProps {
  screen: string;
  round: RoundNumber;
  profileName: string;
  sessionCode: string;
  sessionTitle: string;
  modelVersion: string;
  previewModelVersion: string;
  materials: PreviewMaterial[];
  roundInfo: {
    period: string;
    title: string;
    summary: string;
    decisionWindowMinutes: number;
  };
  annual: {
    revenue: number;
    ebitdaMargin: number;
    netDebt: number;
    premiumShare: number;
    strategicHealth: number;
    competitivePosition: number;
    cumulativeUfcf: number;
  };
  final: {
    finalGameValue: number;
    enterpriseValue: number;
    impliedEquityValue: number;
    riskPenalty: number;
    pvExplicitUfcf: number;
    pvTerminalValue: number;
    finalRevenue: number;
    finalEbitdaMargin: number;
    finalPremiumShare: number;
    finalNetDebt: number;
    competitivePosition: number;
    strategicHealth: number;
  };
}

const PREVIEW_SCREENS: ReadonlyArray<{
  id: string;
  label: string;
  audience: string;
  roundAware?: boolean;
}> = [
  { id: "registration", label: "Registrazione", audience: "Studente" },
  { id: "team", label: "Team", audience: "Studente" },
  { id: "lobby", label: "Lobby", audience: "Studente" },
  { id: "case-study", label: "Data Room", audience: "Studente" },
  { id: "briefing", label: "Briefing", audience: "Studente", roundAware: true },
  { id: "decisions", label: "Decisioni", audience: "Studente", roundAware: true },
  { id: "review", label: "Revisione", audience: "Studente", roundAware: true },
  { id: "submitted", label: "Inviato", audience: "Studente", roundAware: true },
  { id: "results", label: "Risultato round", audience: "Studente", roundAware: true },
  { id: "teacher-live", label: "Console round", audience: "Docente", roundAware: true },
  { id: "final-locked", label: "Finale bloccato", audience: "Studente" },
  { id: "ai-evidence", label: "Consegna AI", audience: "Studente" },
  { id: "ai-waiting", label: "Consegna registrata", audience: "Studente" },
  { id: "teacher-debrief", label: "Debrief", audience: "Docente" },
  { id: "final-released", label: "Finale pubblicato", audience: "Studente" },
  { id: "leaderboard", label: "Leaderboard", audience: "Docente" },
];

function moneyBn(value: number) {
  return `€${(Math.abs(value) / 1000).toFixed(2)}bn${value < 0 ? " cash" : ""}`;
}

function percent(value: number, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
}

function signedPercent(value: number, digits = 1) {
  const pct = value * 100;
  return `${pct > 0 ? "+" : ""}${pct.toFixed(digits)}%`;
}

function PreviewHeader({
  section,
  sessionCode,
}: {
  section: string;
  sessionCode: string;
}) {
  return (
    <AppHeader
      section={section}
      sessionCode={sessionCode}
      userName="Alpha"
    />
  );
}

function PreviewFooter() {
  return <AppFooter />;
}

function PreviewRegistration({ sessionCode }: { sessionCode: string }) {
  return (
    <main className="application-page admin-preview-surface">
      <div className="brand-bar" aria-hidden="true" />
      <div className="auth-main">
        <section className="auth-hero">
          <div className="course-pill">TECNOLOGIE PER L’ACCOUNTING</div>
          <h1>CFO AI Business Game</h1>
          <p>
            Analizzate Aurora Tyres, prendete decisioni finanziarie e
            strategiche e confrontate il valore creato dal vostro team.
          </p>
        </section>
        <section className="auth-card">
          <div className="card-eyebrow">REGISTRAZIONE STUDENTE</div>
          <h2>Entra nella simulazione</h2>
          <div className="google-auth-form">
            <label>
              <span>Codice sessione</span>
              <input defaultValue={sessionCode} readOnly />
            </label>
            <button className="google-auth-button" type="button">
              <span className="google-g-logo">G</span>
              Registrati con Google
            </button>
            <div className="google-auth-note">
              Sessione reale: account Google UniTo · sessione Test: anche Gmail
              verificato.
            </div>
          </div>
          <div className="auth-separator">
            <span>oppure usa email e password</span>
          </div>
          <form className="auth-form">
            <label>
              <span>Nome e cognome</span>
              <input placeholder="Nome Cognome" readOnly />
            </label>
            <label>
              <span>Email</span>
              <input placeholder="nome@edu.unito.it" readOnly />
            </label>
            <label>
              <span>Password</span>
              <input placeholder="••••••••" readOnly />
            </label>
            <label>
              <span>Conferma password</span>
              <input placeholder="••••••••" readOnly />
            </label>
            <label>
              <span>Codice sessione</span>
              <input defaultValue={sessionCode} readOnly />
            </label>
            <button className="button-primary" type="button">
              Registrati
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function PreviewTeam({ sessionCode }: { sessionCode: string }) {
  return (
    <main className="application-page admin-preview-surface">
      <PreviewHeader section="Configurazione team" sessionCode={sessionCode} />
      <div className="page-main">
        <section className="page-heading">
          <div className="card-eyebrow">TEAM SETUP</div>
          <h1>Crea o raggiungi il tuo team</h1>
          <p>
            Ogni studente deve appartenere a un team prima che il docente possa
            avviare la simulazione.
          </p>
        </section>
        <div className="team-setup-grid">
          <section className="team-card">
            <div className="card-eyebrow">NUOVO TEAM</div>
            <h2>Crea il tuo gruppo</h2>
            <p>Il sistema genererà un codice da condividere con i compagni.</p>
            <label>
              <span>Nome team</span>
              <input defaultValue="Alpha" readOnly />
            </label>
            <button className="button-primary" type="button">
              Crea team
            </button>
          </section>
          <section className="team-card">
            <div className="card-eyebrow">TEAM ESISTENTE</div>
            <h2>Entra con il codice</h2>
            <p>Inserisci il codice del team ricevuto da un compagno.</p>
            <label>
              <span>Codice team</span>
              <input defaultValue="A7K2Q9" readOnly />
            </label>
            <button className="button-secondary" type="button">
              Entra nel team
            </button>
          </section>
        </div>
      </div>
      <PreviewFooter />
    </main>
  );
}

function PreviewLobby({
  sessionCode,
  sessionTitle,
}: {
  sessionCode: string;
  sessionTitle: string;
}) {
  return (
    <main className="application-page admin-preview-surface">
      <PreviewHeader section="Lobby" sessionCode={sessionCode} />
      <div className="page-main">
        <section className="lobby-heading">
          <div>
            <div className="card-eyebrow">TEAM ALPHA</div>
            <h1>In attesa del docente</h1>
            <p>
              Il team è pronto. La simulazione partirà quando il docente avrà
              confermato tutti i gruppi.
            </p>
          </div>
          <div className="status-badge amber">
            <span className="status-dot" />
            In attesa del docente
          </div>
        </section>
        <div className="lobby-grid">
          <section className="lobby-team-card">
            <div className="card-eyebrow">IL VOSTRO TEAM</div>
            <h2>Alpha</h2>
            <div className="team-code-block">
              <span>Codice team</span>
              <strong>A7K2Q9</strong>
            </div>
            <div className="member-row">
              <strong>Anna Rossi</strong>
              <span>Team member</span>
            </div>
            <div className="member-row">
              <strong>Luca Bianchi</strong>
              <span>Team member</span>
            </div>
            <div className="member-row">
              <strong>Giulia Verdi</strong>
              <span>Team member</span>
            </div>
          </section>
          <aside className="session-card">
            <div className="card-eyebrow">SESSIONE</div>
            <h2>{sessionTitle}</h2>
            <dl className="session-facts">
              <div>
                <dt>Codice</dt>
                <dd>{sessionCode}</dd>
              </div>
              <div>
                <dt>Round</dt>
                <dd>3</dd>
              </div>
              <div>
                <dt>Stato</dt>
                <dd>Non iniziato</dd>
              </div>
            </dl>
            <div className="data-room-box">
              <strong>DATA ROOM</strong>
              <p>
                I materiali verranno resi disponibili quando il docente avvierà
                la simulazione.
              </p>
            </div>
          </aside>
        </div>
      </div>
      <PreviewFooter />
    </main>
  );
}

function PreviewCaseStudy({
  sessionCode,
  materials,
  round,
}: {
  sessionCode: string;
  materials: PreviewMaterial[];
  round: RoundNumber;
}) {
  const focus = ROUND_CONTENT[round];
  return (
    <main className="application-page admin-preview-surface">
      <PreviewHeader section="Data Room" sessionCode={sessionCode} />
      <div className="page-main case-main">
        <section className="case-heading">
          <div>
            <div className="card-eyebrow">DATA ROOM · AURORA TYRES</div>
            <h1>Materiali per il Board</h1>
            <p>
              Consultate i documenti prima di entrare nel round. La Data Room
              resta disponibile per tutta la simulazione.
            </p>
          </div>
          <div className="study-time-card">
            <span>STATO</span>
            <strong>LIVE</strong>
          </div>
        </section>

        <section className="material-panel">
          <div className="material-panel-heading">
            <div>
              <div className="card-eyebrow">MATERIALI OBBLIGATORI</div>
              <h2>Documentazione condivisa</h2>
            </div>
            <span>{materials.length || 2} materiali</span>
          </div>
          <div className="material-grid">
            {(materials.length
              ? materials
              : [
                  {
                    id: "m1",
                    title: "Aurora Tyres — Annual Report 2025",
                    description:
                      "Bilancio, KPI operativi e principali dati economico-finanziari.",
                    material_type: "PDF",
                    source_url: "#",
                    required: true,
                  },
                  {
                    id: "m2",
                    title: "Investor Presentation",
                    description:
                      "Posizionamento strategico, segmento Premium e mercato.",
                    material_type: "PDF",
                    source_url: "#",
                    required: true,
                  },
                ]
            ).map((material) => (
              <article className="material-card" key={material.id}>
                <span className="material-type">
                  {material.material_type.toUpperCase()}
                </span>
                <h3>{material.title}</h3>
                <p>
                  {material.description ??
                    "Documento di riferimento per l’analisi del team."}
                </p>
                <button className="button-secondary material-button" type="button">
                  Apri materiale
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="board-mandate">
          <div>
            <div className="card-eyebrow">PROSSIMO ROUND</div>
            <h2>
              Round {round} · {focus.period} — {focus.title}
            </h2>
            <p>{focus.body}</p>
          </div>
          <strong>Scenario comune a tutti i team.</strong>
        </section>
      </div>
      <PreviewFooter />
    </main>
  );
}

function PreviewBriefing({
  sessionCode,
  round,
  roundInfo,
}: {
  sessionCode: string;
  round: RoundNumber;
  roundInfo: AdminGamePreviewProps["roundInfo"];
}) {
  const content = ROUND_CONTENT[round];
  const focus = V05_ROUND_DECISION_FOCUS[round];
  return (
    <main className="application-page admin-preview-surface">
      <PreviewHeader
        section={`Round ${round} di 3 · ${roundInfo.period}`}
        sessionCode={sessionCode}
      />
      <div className="page-main round-opening-main">
        <section className="round-opening-heading">
          <div>
            <h1>
              Round {round} — {roundInfo.period}
            </h1>
            <p>
              Leggete il briefing di scenario prima di definire le decisioni
              del round.
            </p>
          </div>
          <div className="round-clock-card">
            <span>TEMPO</span>
            <strong>11:23</strong>
          </div>
        </section>

        <div className="round-opening-grid">
          <section className="breaking-news-card">
            <div className="breaking-news-band">
              <strong>BREAKING NEWS</strong>
              <div className="status-badge amber">
                <span className="status-dot" />
                Scenario comune a tutti
              </div>
            </div>
            <h2>{roundInfo.title}</h2>
            <p>{roundInfo.summary}</p>
            <div className="card-rule" />
            <h3>Informazioni disponibili</h3>
            <ul>
              {content.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </section>

          <aside className="opening-state-card">
            <div className="card-eyebrow">SITUAZIONE INIZIALE 2025</div>
            <div className="opening-kpi-grid">
              <div>
                <span>Ricavi commerciali</span>
                <strong>€{BASELINE_DISPLAY.revenueBn.toFixed(2)}bn</strong>
              </div>
              <div>
                <span>Margine EBITDA</span>
                <strong>{percent(BASELINE_DISPLAY.ebitdaMargin)}</strong>
              </div>
              <div>
                <span>Mix ricavi Premium</span>
                <strong>{percent(BASELINE_DISPLAY.premiumShare, 0)}</strong>
              </div>
              <div>
                <span>Debito netto</span>
                <strong>€{BASELINE_DISPLAY.netDebtBn.toFixed(2)}bn</strong>
              </div>
            </div>
          </aside>
        </div>

        <section className="board-mandate">
          <div>
            <div className="card-eyebrow">FOCUS DECISIONALE</div>
            <h2>{focus.title}</h2>
            <p>{focus.body}</p>
          </div>
          <strong>
            Non esiste una scelta dominante: valutate valore, cassa, rischio e
            capacità futura.
          </strong>
        </section>

        <section className="decision-window-card">
          <div>
            <div className="card-eyebrow">DECISION WINDOW OPEN</div>
            <h2>
              Il vostro team ha {roundInfo.decisionWindowMinutes} minuti per
              definire le {V05_DECISION_COUNT} decisioni del Round {round}.
            </h2>
          </div>
          <button className="button-primary decision-window-button" type="button">
            Vai alle decisioni
          </button>
        </section>
      </div>
      <PreviewFooter />
    </main>
  );
}

function PreviewDecisions({
  sessionCode,
  round,
  roundInfo,
}: {
  sessionCode: string;
  round: RoundNumber;
  roundInfo: AdminGamePreviewProps["roundInfo"];
}) {
  const stored = decisionToStoredRow(DEFAULT_DECISIONS[round]);
  return (
    <main className="application-page admin-preview-surface">
      <PreviewHeader
        section={`Round ${round} di 3 · Decisioni`}
        sessionCode={sessionCode}
      />
      <div className="page-main decisions-main">
        <section className="decisions-heading">
          <div>
            <h1>Decisioni {roundInfo.period}</h1>
            <p>
              Compilate le 6 decisioni economiche. Dopo l’invio non potrete più
              modificarle.
            </p>
          </div>
          <div className="status-badge amber">
            <span className="status-dot" />
            Bozza non inviata
          </div>
        </section>

        <section className="scenario-strip">
          <div>
            <strong>
              {roundInfo.period} — {roundInfo.title}
            </strong>
            <p>{roundInfo.summary}</p>
            <span>
              Promemoria: conservate la chat AI del team per la consegna finale.
            </span>
          </div>
          <div className="scenario-time">
            <span>TEMPO RIMASTO</span>
            <strong>11:23</strong>
          </div>
        </section>

        <V05DecisionForm
          draft={{
            ...stored,
            objective: "crescita",
          }}
          round={round}
          roundId="admin-preview"
          selectedObjective="crescita"
        />
      </div>
      <PreviewFooter />
    </main>
  );
}

function DecisionSummary({
  round,
}: {
  round: RoundNumber;
}) {
  const decision = DEFAULT_DECISIONS[round];
  return (
    <div className="admin-preview-decision-summary">
      <div>
        <span>Premium</span>
        <strong>{signedPercent(decision.premium_price_positioning)}</strong>
      </div>
      <div>
        <span>Standard</span>
        <strong>{signedPercent(decision.standard_price_positioning)}</strong>
      </div>
      <div>
        <span>Marketing</span>
        <strong>{signedPercent(decision.marketing_change)}</strong>
      </div>
      <div>
        <span>R&S</span>
        <strong>{percent(decision.rnd_pct)}</strong>
      </div>
      <div>
        <span>Orientamento</span>
        <strong>{decision.rnd_orientation}</strong>
      </div>
      <div>
        <span>CapEx</span>
        <strong>{percent(decision.capex_pct)}</strong>
      </div>
      <div>
        <span>Resilienza</span>
        <strong>{decision.resilience_policy}</strong>
      </div>
    </div>
  );
}

function PreviewReview({
  sessionCode,
  round,
  roundInfo,
}: {
  sessionCode: string;
  round: RoundNumber;
  roundInfo: AdminGamePreviewProps["roundInfo"];
}) {
  return (
    <main className="application-page admin-preview-surface">
      <PreviewHeader
        section={`Round ${round} di 3 · Revisione`}
        sessionCode={sessionCode}
      />
      <div className="page-main review-main">
        <section className="review-heading">
          <div>
            <div className="card-eyebrow">CONTROLLO PRIMA DELL’INVIO</div>
            <h1>Rivedi le decisioni del Round {round}</h1>
            <p>
              Verificate le scelte. Dopo l’invio diventeranno definitive per
              questo round.
            </p>
          </div>
        </section>
        <section className="admin-preview-review-card">
          <div className="card-eyebrow">
            {roundInfo.period} — {roundInfo.title}
          </div>
          <DecisionSummary round={round} />
          <div className="admin-preview-objective">
            <span>Obiettivo dichiarato</span>
            <strong>Crescita</strong>
          </div>
          <div className="admin-preview-review-actions">
            <button className="button-secondary" type="button">
              Torna alle decisioni
            </button>
            <button className="button-primary" type="button">
              Invia decisioni
            </button>
          </div>
        </section>
      </div>
      <PreviewFooter />
    </main>
  );
}

function PreviewSubmitted({
  sessionCode,
  round,
}: {
  sessionCode: string;
  round: RoundNumber;
}) {
  return (
    <main className="application-page admin-preview-surface">
      <PreviewHeader
        section={`Round ${round} di 3 · Inviato`}
        sessionCode={sessionCode}
      />
      <div className="page-main submitted-main">
        <section className="submitted-card">
          <div className="status-badge green">
            <span className="status-dot" />
            Decisioni inviate
          </div>
          <h1>Round {round} completato dal team</h1>
          <p>
            Le decisioni sono definitive. Attendete che il docente chiuda il
            round e calcoli simultaneamente i risultati di tutti i team.
          </p>
          <div className="waiting-timer">
            <span>TEMPO RESIDUO</span>
            <strong>06:41</strong>
          </div>
          <DecisionSummary round={round} />
        </section>
      </div>
      <PreviewFooter />
    </main>
  );
}

function PreviewRoundResults({
  sessionCode,
  round,
  roundInfo,
  annual,
}: {
  sessionCode: string;
  round: RoundNumber;
  roundInfo: AdminGamePreviewProps["roundInfo"];
  annual: AdminGamePreviewProps["annual"];
}) {
  return (
    <main className="application-page admin-preview-surface">
      <PreviewHeader
        section={`Round ${round} di 3 · Risultati`}
        sessionCode={sessionCode}
      />
      <div className="page-main results-main">
        <section className="results-heading">
          <div>
            <div className="card-eyebrow">
              ROUND {round} · {roundInfo.period}
            </div>
            <h1>Risultati del team Alpha</h1>
            <p>
              Il risultato riflette le vostre decisioni e lo scenario comune.
              Nessuna classifica finale viene mostrata durante i round.
            </p>
          </div>
          <div className="status-badge green">
            <span className="status-dot" />
            Round chiuso
          </div>
        </section>
        <section className="live-metrics admin-preview-result-metrics">
          <article>
            <span>Ricavi</span>
            <strong>{moneyBn(annual.revenue)}</strong>
            <small>Risultato del periodo</small>
          </article>
          <article>
            <span>Margine EBITDA</span>
            <strong>{percent(annual.ebitdaMargin)}</strong>
            <small>Redditività operativa</small>
          </article>
          <article>
            <span>Mix Premium</span>
            <strong>{percent(annual.premiumShare)}</strong>
            <small>Quota ricavi Premium</small>
          </article>
          <article>
            <span>Debito netto / cassa</span>
            <strong>{moneyBn(annual.netDebt)}</strong>
            <small>Posizione finanziaria</small>
          </article>
          <article>
            <span>Solidità strategica</span>
            <strong>{annual.strategicHealth.toFixed(2)}x</strong>
            <small>Indice del World Model</small>
          </article>
        </section>
        <section className="next-round-card">
          <div>
            <div className="card-eyebrow">PROSSIMO PASSAGGIO</div>
            <h2>
              {round < 3
                ? `Attendete l’apertura del Round ${round + 1}`
                : "La simulazione è completata"}
            </h2>
            <p>
              {round < 3
                ? "La Data Room resta disponibile mentre il docente prepara il round successivo."
                : "Ora il team completa la consegna AI prima dello svelamento finale."}
            </p>
          </div>
          <button className="button-secondary" type="button">
            Continua
          </button>
        </section>
      </div>
      <PreviewFooter />
    </main>
  );
}

function PreviewTeacherLive({
  sessionCode,
  round,
  roundInfo,
}: {
  sessionCode: string;
  round: RoundNumber;
  roundInfo: AdminGamePreviewProps["roundInfo"];
}) {
  return (
    <main className="application-page admin-preview-surface">
      <PreviewHeader
        section={`Console docente · Round ${round}`}
        sessionCode={sessionCode}
      />
      <div className="page-main teacher-live-main">
        <section className="teacher-live-heading">
          <div>
            <div className="card-eyebrow">ROUND LIVE</div>
            <h1>
              Round {round} — {roundInfo.period}
            </h1>
            <p>
              {roundInfo.title} · World Model V0.5.3 · Tutti i team ricevono lo
              stesso scenario.
            </p>
          </div>
          <div className="round-clock-card">
            <span>TEMPO</span>
            <strong>07:18</strong>
          </div>
        </section>
        <section className="live-metrics">
          <article>
            <span>Inviati</span>
            <strong>10 / 12</strong>
            <small>2 team ancora al lavoro</small>
          </article>
          <article>
            <span>Prezzo Premium mediano</span>
            <strong>+2.0%</strong>
            <small>Vista live della classe</small>
          </article>
          <article>
            <span>Resilienza prevalente</span>
            <strong>Standard</strong>
            <small>Politica più scelta</small>
          </article>
          <article>
            <span>Orientamento R&S prevalente</span>
            <strong>Bilanciato</strong>
            <small>Composizione più scelta</small>
          </article>
          <article>
            <span>Stato round</span>
            <strong>OPEN</strong>
            <small>Finestra decisionale</small>
          </article>
        </section>
        <section className="teacher-control-card">
          <div>
            <div className="card-eyebrow">CONTROLLO ROUND</div>
            <h2>Attendi tutti i team o estendi la finestra</h2>
            <p>
              Il round può essere chiuso solo quando tutti i team attivi hanno
              inviato.
            </p>
          </div>
          <div className="teacher-actions">
            <button className="button-secondary" type="button">
              + 2 minuti
            </button>
            <button className="button-primary" disabled type="button">
              In attesa di 2 team
            </button>
          </div>
        </section>
        <section className="leaderboard-table-card">
          <div className="card-eyebrow">STATO INVII</div>
          <h2>12 team attivi</h2>
          <div className="submission-readiness-list">
            {["Alpha", "Beta", "Gamma", "Delta"].map((name, index) => (
              <div key={name}>
                <strong>{name}</strong>
                <span
                  className={
                    index < 3
                      ? "status-badge green compact"
                      : "status-badge blue compact"
                  }
                >
                  <span className="status-dot" />
                  {index < 3 ? "Inviato" : "Al lavoro"}
                </span>
                <small>{index < 3 ? "23:04" : "—"}</small>
              </div>
            ))}
          </div>
        </section>
      </div>
      <PreviewFooter />
    </main>
  );
}

function PreviewFinalLocked({
  sessionCode,
}: {
  sessionCode: string;
}) {
  return (
    <main className="application-page admin-preview-surface">
      <PreviewHeader section="Report finale" sessionCode={sessionCode} />
      <div className="page-main final-main">
        <section className="final-heading">
          <div>
            <h1>Alpha — Report finale</h1>
            <p>
              Il gioco è terminato. Completate la consegna AI: il docente
              mostrerà la classifica solo quando tutti i team avranno registrato
              il materiale richiesto.
            </p>
          </div>
        </section>
        <section className="final-results-locked">
          <div className="final-results-locked-copy">
            <div className="card-eyebrow">CLASSIFICA BLOCCATA</div>
            <h2>Il risultato comparativo verrà svelato dal docente</h2>
            <p>
              Potete già rivedere le vostre scelte e i KPI operativi. Valore
              finale, posizione e benchmark restano nascosti.
            </p>
          </div>
          <div className="final-results-locked-metrics">
            <div>
              <span>Stato consegna</span>
              <strong>Da completare</strong>
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
            <span className="status-badge amber">
              <span className="status-dot" />
              Consegna AI da completare
            </span>
            <strong>Attendi “Mostra risultati” dal docente</strong>
          </div>
        </section>
      </div>
      <PreviewFooter />
    </main>
  );
}

function PreviewAiEvidence({ sessionCode }: { sessionCode: string }) {
  return (
    <main className="application-page admin-preview-surface">
      <PreviewHeader section="Consegna AI" sessionCode={sessionCode} />
      <div className="page-main ai-upload-main">
        <section className="ai-upload-heading">
          <div>
            <div className="card-eyebrow">CONSEGNA FINALE</div>
            <h1>Evidenza della conversazione AI</h1>
            <p>
              La chat completa documenta come avete analizzato i materiali e
              supportato le decisioni dei tre round.
            </p>
          </div>
        </section>
        <div className="ai-upload-grid">
          <section className="ai-upload-card">
            <div className="card-eyebrow">1 · ESPORTA E CARICA</div>
            <h2>Documento completo della conversazione</h2>
            <div className="ai-external-upload-zone">
              <span className="ai-upload-arrow">↑</span>
              <strong>
                Esporta la chat e caricala nel modulo ufficiale Google Form /
                Drive
              </strong>
              <small>Formati consigliati: PDF · TXT · DOCX · HTML</small>
              <button className="button-secondary ai-form-button" type="button">
                Apri il modulo di caricamento
              </button>
            </div>
            <div className="card-rule" />
            <div className="ai-evidence-form">
              <div>
                <strong>2 · Dichiara il modello AI utilizzato</strong>
                <div className="provider-grid">
                  {["ChatGPT", "Claude", "Gemini", "Altro"].map((label) => (
                    <label className="provider-chip" key={label}>
                      <input
                        checked={label === "ChatGPT"}
                        readOnly
                        type="radio"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="ai-confirmation-title">3 · Conferma</div>
              <label className="ai-confirmation">
                <input checked readOnly type="checkbox" />
                <span>
                  Confermo che il materiale riguarda la simulazione e che sono
                  stati rimossi dati personali o contenuti non pertinenti.
                </span>
              </label>
              <button className="button-primary ai-submit-button" type="button">
                Registra la consegna
              </button>
            </div>
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
          </aside>
        </div>
      </div>
      <PreviewFooter />
    </main>
  );
}

function PreviewAiWaiting({ sessionCode }: { sessionCode: string }) {
  return (
    <main className="application-page admin-preview-surface">
      <PreviewHeader section="Consegna effettuata" sessionCode={sessionCode} />
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
              si aggiornerà automaticamente e verrà aperta la classifica finale.
            </p>
          </div>

          <div className="ai-waiting-details">
            <div>
              <span>Team</span>
              <strong>Alpha</strong>
            </div>
            <div>
              <span>Modello AI dichiarato</span>
              <strong>ChatGPT</strong>
            </div>
            <div>
              <span>Registrata il</span>
              <strong>08/10/26, 11:42</strong>
            </div>
            <div>
              <span>Stato verifica</span>
              <strong>Registrata</strong>
            </div>
          </div>

          <div className="ai-waiting-note">
            Non è necessario aggiornare manualmente la pagina.
          </div>
        </section>
      </div>
      <PreviewFooter />
    </main>
  );
}

function PreviewTeacherDebrief({
  sessionCode,
  final,
}: {
  sessionCode: string;
  final: AdminGamePreviewProps["final"];
}) {
  const roundRows = ([1, 2, 3] as const).map((round) => ({
    round,
    content: ROUND_CONTENT[round],
    decision: DEFAULT_DECISIONS[round],
  }));
  return (
    <main className="application-page admin-preview-surface">
      <PreviewHeader section="Debrief finale" sessionCode={sessionCode} />
      <div className="page-main leaderboard-main">
        <section className="leaderboard-heading">
          <div>
            <div className="card-eyebrow">FASE DI DEBRIEF</div>
            <h1>Sintesi della classe — {sessionCode}</h1>
            <p>
              Prima di svelare la classifica puoi discutere le scelte aggregate,
              le tendenze dei tre round e i risultati operativi della classe.
            </p>
          </div>
          <div className="status-badge amber">
            <span className="status-dot" />
            Classifica nascosta
          </div>
        </section>

        <section className="class-debrief-summary">
          <div className="class-debrief-heading">
            <div>
              <div className="card-eyebrow">SINTESI PRIMA DELLA CLASSIFICA</div>
              <h2>Come si è comportata la classe</h2>
            </div>
            <span>12 team completati</span>
          </div>
          <div className="class-debrief-kpis">
            <article>
              <span>Ricavi finali mediani</span>
              <strong>{moneyBn(final.finalRevenue * 0.98)}</strong>
            </article>
            <article>
              <span>Margine EBITDA mediano</span>
              <strong>{percent(final.finalEbitdaMargin * 0.96)}</strong>
            </article>
            <article>
              <span>Debito netto mediano</span>
              <strong>{moneyBn(final.finalNetDebt + 120)}</strong>
            </article>
            <article>
              <span>Solidità strategica mediana</span>
              <strong>{(final.strategicHealth * 0.97).toFixed(2)}x</strong>
            </article>
          </div>
          <div className="class-round-debrief-grid">
            {roundRows.map(({ round, content, decision }) => (
              <article key={round}>
                <div className="class-round-debrief-title">
                  <span>
                    ROUND {round} · {content.period}
                  </span>
                  <strong>{content.title}</strong>
                </div>
                <dl>
                  <div>
                    <dt>Premium mediano</dt>
                    <dd>{signedPercent(decision.premium_price_positioning)}</dd>
                  </div>
                  <div>
                    <dt>Standard mediano</dt>
                    <dd>{signedPercent(decision.standard_price_positioning)}</dd>
                  </div>
                  <div>
                    <dt>Marketing mediano</dt>
                    <dd>{signedPercent(decision.marketing_change)}</dd>
                  </div>
                  <div>
                    <dt>R&S mediana</dt>
                    <dd>{percent(decision.rnd_pct)}</dd>
                  </div>
                  <div>
                    <dt>Orientamento prevalente</dt>
                    <dd>{decision.rnd_orientation}</dd>
                  </div>
                  <div>
                    <dt>Resilienza prevalente</dt>
                    <dd>{decision.resilience_policy}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>

        <section className="results-release-card">
          <div>
            <div className="card-eyebrow">CONSEGNE E SVELAMENTO</div>
            <h2>11 di 12 team hanno registrato la consegna AI</h2>
            <p>
              Quando il contatore arriva al 100%, il docente può usare “Mostra
              risultati”.
            </p>
            <div className="results-release-stats">
              <span>11/12 registrate</span>
              <span>8/12 verificate</span>
            </div>
          </div>
          <button
            className="button-primary results-release-button"
            disabled
            type="button"
          >
            In attesa delle consegne
          </button>
        </section>
      </div>
      <PreviewFooter />
    </main>
  );
}

function PreviewFinalReleased({
  sessionCode,
  annual,
  final,
}: {
  sessionCode: string;
  annual: AdminGamePreviewProps["annual"];
  final: AdminGamePreviewProps["final"];
}) {
  const rows = [
    {
      position: 1,
      name: "Alpha",
      fgv: final.finalGameValue,
      fcf: annual.cumulativeUfcf,
      health: final.strategicHealth,
      own: true,
    },
    {
      position: 2,
      name: "Delta",
      fgv: final.finalGameValue * 0.96,
      fcf: annual.cumulativeUfcf * 0.94,
      health: final.strategicHealth * 0.96,
      own: false,
    },
    {
      position: 3,
      name: "Gamma",
      fgv: final.finalGameValue * 0.93,
      fcf: annual.cumulativeUfcf * 0.9,
      health: final.strategicHealth * 0.93,
      own: false,
    },
    {
      position: 4,
      name: "Sigma",
      fgv: final.finalGameValue * 0.88,
      fcf: annual.cumulativeUfcf * 0.86,
      health: final.strategicHealth * 0.88,
      own: false,
    },
    {
      position: 5,
      name: "Beta",
      fgv: final.finalGameValue * 0.83,
      fcf: annual.cumulativeUfcf * 0.8,
      health: final.strategicHealth * 0.84,
      own: false,
    },
  ];
  const podium = [rows[1], rows[0], rows[2]];

  return (
    <main className="application-page admin-preview-surface">
      <PreviewHeader section="Classifica finale" sessionCode={sessionCode} />
      <div className="page-main final-main">
        <section className="final-heading">
          <div>
            <h1>Classifica finale</h1>
            <p>
              I risultati sono stati pubblicati dal docente. Scopri il podio,
              la classifica completa e poi approfondisci il report del tuo team.
            </p>
          </div>
          <div className="status-badge green">
            <span className="status-dot" />
            1° di 5 team
          </div>
        </section>

        <section className="student-leaderboard-reveal">
          <div className="student-podium" aria-label="Podio finale">
            <div className="student-podium-label">PODIO</div>
            <div className="student-podium-grid">
              {podium.map((entry) => (
                <article
                  className={`student-podium-card position-${entry.position}${
                    entry.own ? " own-team" : ""
                  }`}
                  key={entry.name}
                >
                  <span>{entry.position}°</span>
                  <strong>{entry.name.toUpperCase()}</strong>
                  <small>{moneyBn(entry.fgv)}</small>
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
              <span>5 team</span>
            </div>

            <div className="student-ranking-table header">
              <span>#</span>
              <span>Team</span>
              <span>Valore finale</span>
              <span>FCF cumulato</span>
              <span>Solidità strategica</span>
            </div>

            <div className="student-ranking-rows">
              {rows.map((entry) => (
                <div
                  className={
                    entry.own
                      ? "student-ranking-table row own-team"
                      : "student-ranking-table row"
                  }
                  key={entry.name}
                >
                  <strong>{entry.position}</strong>
                  <div>
                    <strong>{entry.name}</strong>
                    {entry.own ? <small>Il tuo team</small> : null}
                  </div>
                  <span>{moneyBn(entry.fgv)}</span>
                  <span>{moneyBn(entry.fcf)}</span>
                  <span>{entry.health.toFixed(2)}x</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="final-value-hero">
          <div>
            <span>VALORE FINALE SIMULATO</span>
            <strong>{moneyBn(final.finalGameValue)}</strong>
            <small>
              La classifica premia il valore creato nel tempo, non un singolo
              KPI annuale.
            </small>
          </div>
          <div className="final-hero-metric">
            <span>Posizione</span>
            <strong>1° posto</strong>
          </div>
          <div className="final-hero-metric">
            <span>vs class median</span>
            <strong>+7.5%</strong>
          </div>
          <div className="final-hero-metric">
            <span>FCF cumulato</span>
            <strong>{moneyBn(annual.cumulativeUfcf)}</strong>
          </div>
          <div className="final-hero-metric">
            <span>Solidità strategica</span>
            <strong>{final.strategicHealth.toFixed(2)}x</strong>
          </div>
        </section>

        <section className="final-value-breakdown-card">
          <div className="card-eyebrow">COME SI FORMA IL VALORE</div>
          <h2>
            FGV = PV flussi espliciti + PV terminale − debito netto iniziale −
            distress
          </h2>
          <div className="final-value-breakdown-grid">
            <article>
              <span>PV flussi espliciti</span>
              <strong>{moneyBn(final.pvExplicitUfcf)}</strong>
            </article>
            <article>
              <span>PV valore terminale</span>
              <strong>{moneyBn(final.pvTerminalValue)}</strong>
            </article>
            <article>
              <span>Enterprise value</span>
              <strong>{moneyBn(final.enterpriseValue)}</strong>
            </article>
            <article>
              <span>Distress</span>
              <strong>{moneyBn(final.riskPenalty)}</strong>
            </article>
          </div>
        </section>
      </div>
      <PreviewFooter />
    </main>
  );
}

function PreviewLeaderboard({
  sessionCode,
  final,
}: {
  sessionCode: string;
  final: AdminGamePreviewProps["final"];
}) {
  const rows = [
    { name: "Gamma", fgv: final.finalGameValue * 1.03, revenue: final.finalRevenue * 1.02 },
    { name: "Beta", fgv: final.finalGameValue * 1.015, revenue: final.finalRevenue * 1.01 },
    { name: "Delta", fgv: final.finalGameValue * 1.007, revenue: final.finalRevenue * 0.99 },
    { name: "Alpha", fgv: final.finalGameValue, revenue: final.finalRevenue },
  ];
  return (
    <main className="application-page admin-preview-surface">
      <PreviewHeader section="Classifica finale" sessionCode={sessionCode} />
      <div className="page-main leaderboard-main">
        <section className="leaderboard-heading">
          <div>
            <div className="card-eyebrow">RISULTATI PUBBLICATI</div>
            <h1>Leaderboard — {sessionCode}</h1>
            <p>Classifica finale prodotta dal World Model v0.5.3.</p>
          </div>
          <div className="status-badge green">
            <span className="status-dot" />
            Classifica visibile
          </div>
        </section>
        <section className="leaderboard-table-card">
          <div className="card-eyebrow">CLASSIFICA</div>
          <h2>Classifica finale</h2>
          <div className="leaderboard-table header">
            <span>#</span>
            <span>Team</span>
            <span>Valore finale</span>
            <span>Ricavi 2030</span>
            <span>EBITDA</span>
            <span>AI evidence</span>
          </div>
          <div className="leaderboard-rows">
            {rows.map((row, index) => (
              <div className="leaderboard-table row" key={row.name}>
                <strong>{index + 1}</strong>
                <div>
                  <strong>{row.name}</strong>
                  <small>Solidità {final.strategicHealth.toFixed(2)}x</small>
                </div>
                <strong>{moneyBn(row.fgv)}</strong>
                <span>{moneyBn(row.revenue)}</span>
                <span>{percent(final.finalEbitdaMargin)}</span>
                <div className="leaderboard-ai-cell">
                  <span className="status-badge green compact">
                    <span className="status-dot" />
                    Verificata
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <PreviewFooter />
    </main>
  );
}

export function AdminGamePreview(props: AdminGamePreviewProps) {
  const validScreen = PREVIEW_SCREENS.some((item) => item.id === props.screen)
    ? props.screen
    : "registration";
  const currentIndex = PREVIEW_SCREENS.findIndex(
    (item) => item.id === validScreen,
  );
  const current = PREVIEW_SCREENS[currentIndex];
  const previous = PREVIEW_SCREENS[currentIndex - 1];
  const next = PREVIEW_SCREENS[currentIndex + 1];

  const query = (screen: string, round = props.round) =>
    `/admin/preview?screen=${screen}&round=${round}`;

  let body: React.ReactNode;

  switch (validScreen) {
    case "team":
      body = <PreviewTeam sessionCode={props.sessionCode} />;
      break;
    case "lobby":
      body = (
        <PreviewLobby
          sessionCode={props.sessionCode}
          sessionTitle={props.sessionTitle}
        />
      );
      break;
    case "case-study":
      body = (
        <PreviewCaseStudy
          materials={props.materials}
          round={props.round}
          sessionCode={props.sessionCode}
        />
      );
      break;
    case "briefing":
      body = (
        <PreviewBriefing
          round={props.round}
          roundInfo={props.roundInfo}
          sessionCode={props.sessionCode}
        />
      );
      break;
    case "decisions":
      body = (
        <PreviewDecisions
          round={props.round}
          roundInfo={props.roundInfo}
          sessionCode={props.sessionCode}
        />
      );
      break;
    case "review":
      body = (
        <PreviewReview
          round={props.round}
          roundInfo={props.roundInfo}
          sessionCode={props.sessionCode}
        />
      );
      break;
    case "submitted":
      body = (
        <PreviewSubmitted round={props.round} sessionCode={props.sessionCode} />
      );
      break;
    case "results":
      body = (
        <PreviewRoundResults
          annual={props.annual}
          round={props.round}
          roundInfo={props.roundInfo}
          sessionCode={props.sessionCode}
        />
      );
      break;
    case "teacher-live":
      body = (
        <PreviewTeacherLive
          round={props.round}
          roundInfo={props.roundInfo}
          sessionCode={props.sessionCode}
        />
      );
      break;
    case "final-locked":
      body = <PreviewFinalLocked sessionCode={props.sessionCode} />;
      break;
    case "ai-evidence":
      body = <PreviewAiEvidence sessionCode={props.sessionCode} />;
      break;
    case "ai-waiting":
      body = <PreviewAiWaiting sessionCode={props.sessionCode} />;
      break;
    case "teacher-debrief":
      body = (
        <PreviewTeacherDebrief
          final={props.final}
          sessionCode={props.sessionCode}
        />
      );
      break;
    case "final-released":
      body = (
        <PreviewFinalReleased
          annual={props.annual}
          final={props.final}
          sessionCode={props.sessionCode}
        />
      );
      break;
    case "leaderboard":
      body = (
        <PreviewLeaderboard
          final={props.final}
          sessionCode={props.sessionCode}
        />
      );
      break;
    default:
      body = <PreviewRegistration sessionCode={props.sessionCode} />;
  }

  return (
    <div className="admin-preview-root">
      <header className="admin-preview-toolbar">
        <div className="admin-preview-toolbar-main">
          <div>
            <div className="admin-preview-kicker">ANTEPRIMA AMMINISTRATORE</div>
            <strong>{props.sessionTitle}</strong>
            <span>
              {props.sessionCode} · {props.modelVersion.replace("aurora-tyres-", "")}
            </span>
          </div>
          <div className="admin-preview-toolbar-actions">
            <span className="status-badge blue compact">
              <span className="status-dot" />
              Dati dimostrativi · nessun salvataggio
            </span>
            <a className="button-secondary" href="/admin/sessions">
              Esci dall’anteprima
            </a>
          </div>
        </div>

        {props.modelVersion !== props.previewModelVersion ? (
          <div className="admin-preview-version-warning">
            Questa sessione usa {props.modelVersion}. L’anteprima visuale
            rappresenta il layout classroom corrente {props.previewModelVersion}.
          </div>
        ) : null}

        <nav className="admin-preview-screen-nav" aria-label="Schermate anteprima">
          {PREVIEW_SCREENS.map((item) => (
            <a
              className={item.id === validScreen ? "active" : undefined}
              href={query(item.id)}
              key={item.id}
            >
              <span>{item.label}</span>
              <small>{item.audience}</small>
            </a>
          ))}
        </nav>

        <div className="admin-preview-stepbar">
          <a
            aria-disabled={!previous}
            className={previous ? "button-secondary" : "button-secondary disabled"}
            href={previous ? query(previous.id) : query(validScreen)}
          >
            ← Precedente
          </a>
          <div>
            <strong>
              {currentIndex + 1}/{PREVIEW_SCREENS.length} · {current.label}
            </strong>
            <span>
              Vista {current.audience.toLowerCase()} · controlli della schermata
              disabilitati
            </span>
          </div>
          {current.roundAware ? (
            <div className="admin-preview-round-switcher">
              {([1, 2, 3] as const).map((round) => (
                <a
                  className={round === props.round ? "active" : undefined}
                  href={query(validScreen, round)}
                  key={round}
                >
                  R{round}
                </a>
              ))}
            </div>
          ) : null}
          <a
            aria-disabled={!next}
            className={next ? "button-primary" : "button-primary disabled"}
            href={next ? query(next.id) : query(validScreen)}
          >
            Successiva →
          </a>
        </div>
      </header>

      <div className="admin-preview-viewport">
        <div className="admin-preview-stage" aria-label="Anteprima non interattiva">
          {body}
        </div>
      </div>
    </div>
  );
}
