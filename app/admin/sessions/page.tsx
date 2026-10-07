import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  archiveSessionAction,
  createSessionAction,
  duplicateSessionAction,
  selectSessionAction,
} from "@/app/admin/sessions/actions";
import { AppFooter } from "@/src/components/app-footer";
import { AppHeader } from "@/src/components/app-header";
import { SELECTED_SESSION_COOKIE } from "@/src/lib/game/context";
import { createClient } from "@/src/lib/supabase/server";

interface SessionsPageProps {
  searchParams: Promise<{
    error?: string | string[];
    updated?: string | string[];
    notice?: string | string[];
  }>;
}

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function statusLabel(status: string) {
  switch (status) {
    case "draft":
      return "Bozza";
    case "registration_open":
      return "Registrazioni aperte";
    case "locked":
      return "Registrazioni bloccate";
    case "live":
      return "In corso";
    case "completed":
      return "Completata";
    case "archived":
      return "Archiviata";
    default:
      return status;
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AdminSessionsPage({
  searchParams,
}: SessionsPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?mode=login");
  }

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single(),
    supabase
      .from("session_members")
      .select("session_id, role, joined_at")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .order("joined_at", { ascending: false }),
  ]);

  if (!memberships?.length) {
    redirect("/teacher");
  }

  const sessionIds = memberships.map((item) => item.session_id);
  const [{ data: sessions }, { data: teams }, { data: studentMemberships }] =
    await Promise.all([
      supabase
        .from("game_sessions")
        .select(
          "id, code, title, academic_year, status, model_version, created_at, started_at, completed_at",
        )
        .in("id", sessionIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("teams")
        .select("id, session_id")
        .in("session_id", sessionIds),
      supabase
        .from("session_members")
        .select("session_id")
        .in("session_id", sessionIds)
        .eq("role", "student"),
    ]);

  const teamCounts = new Map<string, number>();
  for (const team of teams ?? []) {
    teamCounts.set(team.session_id, (teamCounts.get(team.session_id) ?? 0) + 1);
  }

  const studentCounts = new Map<string, number>();
  for (const member of studentMemberships ?? []) {
    studentCounts.set(
      member.session_id,
      (studentCounts.get(member.session_id) ?? 0) + 1,
    );
  }

  const cookieStore = await cookies();
  const selectedSessionId = cookieStore.get(SELECTED_SESSION_COOKIE)?.value;
  const search = await searchParams;
  const error = param(search.error);
  const updated = param(search.updated);
  const notice = param(search.notice);

  return (
    <main className="application-page">
      <AppHeader
        section="Gestione sessioni"
        sessionCode="ADMIN"
        userName={profile?.full_name ?? user.email ?? "Admin"}
      />

      <div className="page-main sessions-main">
        <section className="sessions-heading">
          <div>
            <div className="card-eyebrow">AMMINISTRAZIONE</div>
            <h1>Sessioni del Business Game</h1>
            <p>
              Ogni codice identifica un’esecuzione completamente separata:
              studenti, team, round, decisioni e risultati non vengono
              condivisi tra sessioni.
            </p>
          </div>
          <a className="button-secondary" href="/teacher">
            Torna alla console
          </a>
        </section>

        {error ? <div className="page-error teacher-error">{error}</div> : null}
        {updated === "archived" ? (
          <div className="admin-success">
            Sessione archiviata. I dati restano conservati ma il codice non
            accetta nuove registrazioni.
          </div>
        ) : null}
        {notice ? (
          <div className="teacher-readiness-warning">
            Non risulta una sessione attiva selezionabile. Creane una nuova o
            selezionane una dall’elenco.
          </div>
        ) : null}

        <div className="sessions-layout">
          <section className="session-create-card">
            <div className="card-eyebrow">NUOVA SESSIONE</div>
            <h2>Riparti da zero</h2>
            <p>
              La nuova sessione parte con registrazioni aperte e senza studenti,
              team, decisioni o risultati.
            </p>

            <form action={createSessionAction} className="session-create-form">
              <label>
                <span>Nome sessione</span>
                <input
                  name="title"
                  placeholder="Test Eugenio 01"
                  required
                />
              </label>
              <label>
                <span>Codice da condividere</span>
                <input
                  autoCapitalize="characters"
                  name="code"
                  placeholder="TEST-EUG-01"
                  required
                />
              </label>
              <label>
                <span>Anno accademico</span>
                <input
                  defaultValue="2026/2027"
                  name="academic_year"
                  placeholder="2026/2027"
                />
              </label>
              <label>
                <span>World Model</span>
                <select defaultValue="aurora-tyres-v0.4" name="model_version">
                  <option value="aurora-tyres-v0.4">
                    Aurora Tyres v0.4
                  </option>
                </select>
              </label>
              <button className="button-primary" type="submit">
                Crea e apri sessione
              </button>
            </form>
          </section>

          <section className="sessions-list-card">
            <div className="sessions-list-heading">
              <div>
                <div className="card-eyebrow">LE MIE SESSIONI</div>
                <h2>{sessions?.length ?? 0} sessioni</h2>
              </div>
              <span>1 sessione = 1 tentativo completo</span>
            </div>

            <div className="sessions-list">
              {(sessions ?? []).map((session) => {
                const selected = selectedSessionId === session.id;
                const archived = session.status === "archived";

                return (
                  <article
                    className={
                      selected
                        ? "session-row selected"
                        : archived
                          ? "session-row archived"
                          : "session-row"
                    }
                    key={session.id}
                  >
                    <div className="session-row-top">
                      <div>
                        <strong>{session.code}</strong>
                        <h3>{session.title}</h3>
                      </div>
                      <span
                        className={
                          session.status === "completed"
                            ? "status-badge green compact"
                            : session.status === "live"
                              ? "status-badge blue compact"
                              : "status-badge amber compact"
                        }
                      >
                        <span className="status-dot" />
                        {statusLabel(session.status)}
                      </span>
                    </div>

                    <div className="session-row-meta">
                      <span>{session.academic_year ?? "Anno non indicato"}</span>
                      <span>{session.model_version}</span>
                      <span>{studentCounts.get(session.id) ?? 0} studenti</span>
                      <span>{teamCounts.get(session.id) ?? 0} team</span>
                      <span>Creata {formatDate(session.created_at)}</span>
                    </div>

                    <div className="session-row-actions">
                      {!archived ? (
                        <form action={selectSessionAction}>
                          <input
                            name="session_id"
                            type="hidden"
                            value={session.id}
                          />
                          <button
                            className={
                              selected ? "button-primary" : "button-secondary"
                            }
                            type="submit"
                          >
                            {selected ? "Sessione selezionata" : "Apri sessione"}
                          </button>
                        </form>
                      ) : null}

                      <details className="session-duplicate">
                        <summary>Duplica da zero</summary>
                        <form action={duplicateSessionAction}>
                          <input
                            name="source_session_id"
                            type="hidden"
                            value={session.id}
                          />
                          <input
                            defaultValue={`${session.title} — copia`}
                            name="title"
                            required
                          />
                          <input
                            name="code"
                            placeholder="NUOVO-CODICE"
                            required
                          />
                          <button className="button-primary" type="submit">
                            Crea copia pulita
                          </button>
                        </form>
                      </details>

                      {!archived ? (
                        <form action={archiveSessionAction}>
                          <input
                            name="session_id"
                            type="hidden"
                            value={session.id}
                          />
                          <button className="text-danger-action" type="submit">
                            Archivia
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <section className="session-isolation-note">
          <div className="card-eyebrow">ISOLAMENTO DATI</div>
          <h2>I test non contaminano la classe reale</h2>
          <p>
            Puoi completare una sessione di test e crearne subito un’altra. La
            sessione nuova non eredita team, decisioni, timer, risultati,
            leaderboard o consegne AI. Le sessioni precedenti restano
            consultabili e possono essere archiviate.
          </p>
        </section>
      </div>

      <AppFooter />
    </main>
  );
}
