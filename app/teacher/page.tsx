import { redirect } from "next/navigation";
import { AppFooter } from "@/src/components/app-footer";
import { AppHeader } from "@/src/components/app-header";
import { TeacherRealtime } from "@/src/components/teacher-realtime";
import { TeacherRoundControls } from "@/src/components/teacher-round-controls";
import { RestartSimulationControl } from "@/src/components/restart-simulation-control";
import { requireTeacherGameContext } from "@/src/lib/game/context";
import {
  setSessionStatusAction,
  setTeamStatusAction,
} from "@/app/teacher/actions";

interface TeacherPageProps {
  searchParams: Promise<{
    error?: string | string[];
  }>;
}

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function statusLabel(status: string) {
  switch (status) {
    case "registration_open":
      return "Registrazioni aperte";
    case "locked":
      return "Registrazioni bloccate";
    case "live":
      return "Simulazione avviata";
    case "completed":
      return "Completata";
    default:
      return "In preparazione";
  }
}

function teamStatusLabel(status: string) {
  switch (status) {
    case "forming":
      return "Da confermare";
    case "confirmed":
      return "Confermato";
    case "active":
      return "Attivo";
    case "completed":
      return "Completato";
    default:
      return status;
  }
}

export default async function TeacherPage({ searchParams }: TeacherPageProps) {
  const {
    supabase,
    user,
    profile,
    membership: staffMembership,
    session,
  } = await requireTeacherGameContext();

  if (session.status === "completed") {
    redirect("/teacher/leaderboard");
  }

  const [{ data: counts }, { data: teams }, { data: students }] =
    await Promise.all([
      supabase.rpc("teacher_session_counts", {
        p_session_id: session.id,
      }),
      supabase
        .from("teams")
        .select("id, name, join_code, status, created_at")
        .eq("session_id", session.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("session_members")
        .select("user_id, joined_at")
        .eq("session_id", session.id)
        .eq("role", "student")
        .order("joined_at", { ascending: true }),
    ]);

  const teamIds = (teams ?? []).map((team) => team.id);

  const { data: teamMembers } = teamIds.length
    ? await supabase
        .from("team_members")
        .select("team_id, user_id, joined_at")
        .in("team_id", teamIds)
        .order("joined_at", { ascending: true })
    : { data: [] };

  const userIds = Array.from(
    new Set([
      ...(students ?? []).map((student) => student.user_id),
      ...(teamMembers ?? []).map((member) => member.user_id),
    ]),
  );

  const { data: profiles } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds)
    : { data: [] };

  const profileMap = new Map(
    (profiles ?? []).map((student) => [student.id, student]),
  );

  const membersByTeam = new Map<
    string,
    Array<{ id: string; full_name: string; email: string }>
  >();

  for (const member of teamMembers ?? []) {
    const memberProfile = profileMap.get(member.user_id);
    if (!memberProfile) continue;

    const current = membersByTeam.get(member.team_id) ?? [];
    current.push(memberProfile);
    membersByTeam.set(member.team_id, current);
  }

  const assignedIds = new Set((teamMembers ?? []).map((member) => member.user_id));
  const unassigned = (students ?? [])
    .filter((student) => !assignedIds.has(student.user_id))
    .map((student) => profileMap.get(student.user_id))
    .filter(Boolean);

  const metrics = counts?.[0] ?? {
    registered_students: 0,
    team_count: 0,
    confirmed_team_count: 0,
    unassigned_students: 0,
  };

  const readyToStart =
    metrics.team_count > 0 &&
    metrics.confirmed_team_count === metrics.team_count &&
    metrics.unassigned_students === 0;

  const { data: rounds } = await supabase
    .from("game_rounds")
    .select("id, round_number, period_label, scenario_title, status")
    .eq("session_id", session.id)
    .order("round_number", { ascending: true });

  const params = await searchParams;
  const error = param(params.error);
  const editable =
    session.status === "registration_open" || session.status === "locked";

  return (
    <main className="application-page">
      <TeacherRealtime sessionId={session.id} />
      <AppHeader
        section="Controllo docente"
        sessionCode={session.code}
        userName={profile?.full_name ?? user.email ?? "Docente"}
      />

      <div className="page-main teacher-main">
        <section className="teacher-heading">
          <div>
            <div className="card-eyebrow">CONTROLLO SESSIONE</div>
            <h1>{session.title}</h1>
            <p>
              Gestisci la composizione dei gruppi e avvia la simulazione quando
              tutti gli studenti sono assegnati e i team sono confermati.
            </p>
          </div>
          <div
            className={
              session.status === "live"
                ? "status-badge green"
                : "status-badge amber"
            }
          >
            <span className="status-dot" />
            {statusLabel(session.status)}
          </div>
        </section>

        {session.is_test ? (
          <section className="test-session-banner">
            <div>
              <strong>SESSIONE TEST</strong>
              <span>
                Per questa sessione puoi registrare come studenti anche normali
                account Google/Gmail verificati. Le sessioni di classe reale
                restano limitate agli account UniTo.
              </span>
            </div>
          </section>
        ) : null}

        {error ? <div className="page-error teacher-error">{error}</div> : null}

        {staffMembership.role === "admin" ? (
          <section className="admin-access-banner">
            <div>
              <div className="card-eyebrow">AMMINISTRAZIONE</div>
              <strong>Gestisci sessioni, test e accessi staff</strong>
              <span>
                Crea codici indipendenti per ogni test o classe, cambia
                sessione attiva e autorizza docenti senza intervenire
                manualmente su Supabase.
              </span>
            </div>
            <div className="admin-banner-actions">
              <a className="button-secondary" href="/admin/sessions">
                Gestisci sessioni
              </a>
              <a className="button-secondary" href="/admin/teachers">
                Gestisci accessi
              </a>
            </div>
          </section>
        ) : null}

        <section className="teacher-metrics" aria-label="Metriche sessione">
          <article>
            <span>Studenti registrati</span>
            <strong>{metrics.registered_students}</strong>
          </article>
          <article>
            <span>Team creati</span>
            <strong>{metrics.team_count}</strong>
          </article>
          <article>
            <span>Team confermati</span>
            <strong>
              {metrics.confirmed_team_count}/{metrics.team_count}
            </strong>
          </article>
          <article className={metrics.unassigned_students ? "metric-warning" : ""}>
            <span>Senza team</span>
            <strong>{metrics.unassigned_students}</strong>
          </article>
        </section>

        <section className="teacher-control-card">
          <div>
            <div className="card-eyebrow">STATO SESSIONE</div>
            <h2>{statusLabel(session.status)}</h2>
            <p>
              {session.status === "registration_open"
                ? "Gli studenti possono ancora creare o entrare nei team."
                : session.status === "locked"
                  ? "Le registrazioni sono bloccate. Verifica i gruppi prima dell’avvio."
                  : "La simulazione è attiva e i team non sono più modificabili."}
            </p>
          </div>

          <div className="teacher-actions">
            {session.status === "registration_open" ? (
              <form action={setSessionStatusAction}>
                <input name="session_id" type="hidden" value={session.id} />
                <input name="status" type="hidden" value="locked" />
                <button className="button-secondary" type="submit">
                  Blocca registrazioni
                </button>
              </form>
            ) : null}

            {session.status === "locked" ? (
              <>
                <form action={setSessionStatusAction}>
                  <input name="session_id" type="hidden" value={session.id} />
                  <input name="status" type="hidden" value="registration_open" />
                  <button className="button-secondary" type="submit">
                    Riapri registrazioni
                  </button>
                </form>
                <form action={setSessionStatusAction}>
                  <input name="session_id" type="hidden" value={session.id} />
                  <input name="status" type="hidden" value="live" />
                  <button
                    className="button-primary"
                    disabled={!readyToStart}
                    type="submit"
                  >
                    Avvia simulazione
                  </button>
                </form>
              </>
            ) : null}

            {session.status === "live" ? (
              <div className="teacher-live-note">
                Avvio registrato. Il prossimo step è la Data Room.
              </div>
            ) : null}
          </div>
        </section>

        {!readyToStart && session.status === "locked" ? (
          <div className="teacher-readiness-warning">
            Per avviare: conferma tutti i team e assegna tutti gli studenti a un
            gruppo.
          </div>
        ) : null}

        {session.status === "live" ? (
          <section className="teacher-restart-card">
            <div>
              <div className="card-eyebrow">RIAVVIO SIMULAZIONE</div>
              <h2>Riparti dall’inizio mantenendo classe e team</h2>
              <p>
                Azzera decisioni, risultati e output finali della run corrente.
                Mantiene studenti, composizione dei team e materiali della Data
                Room. Tutti gli studenti vengono riportati alla lobby pre-avvio
                e la sessione torna pronta per un nuovo Avvia simulazione.
              </p>
            </div>
            <RestartSimulationControl
              sessionCode={session.code}
              sessionId={session.id}
            />
          </section>
        ) : null}

        <TeacherRoundControls
          rounds={(rounds ?? []).map((round) => ({
            id: round.id,
            round_number: round.round_number,
            period_label: round.period_label,
            scenario_title: round.scenario_title,
            status: round.status,
          }))}
          sessionStatus={session.status}
        />

        <section className="teacher-section">
          <div className="teacher-section-heading">
            <div>
              <div className="card-eyebrow">TEAM</div>
              <h2>Composizione dei gruppi</h2>
            </div>
            <span>{teams?.length ?? 0} team</span>
          </div>

          <div className="teacher-team-grid">
            {(teams ?? []).map((team) => {
              const members = membersByTeam.get(team.id) ?? [];
              const confirmed =
                team.status === "confirmed" || team.status === "active";

              return (
                <article className="teacher-team-card" key={team.id}>
                  <div className="teacher-team-top">
                    <div>
                      <div className="card-eyebrow">{team.join_code}</div>
                      <h3>{team.name}</h3>
                    </div>
                    <div
                      className={
                        confirmed
                          ? "status-badge green"
                          : "status-badge amber"
                      }
                    >
                      <span className="status-dot" />
                      {teamStatusLabel(team.status)}
                    </div>
                  </div>

                  <div className="teacher-member-list">
                    {members.length ? (
                      members.map((member) => (
                        <div className="teacher-member-row" key={member.id}>
                          <div className="avatar">
                            {initials(member.full_name)}
                          </div>
                          <div className="member-copy">
                            <strong>{member.full_name}</strong>
                            <span>{member.email}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="teacher-empty-row">Nessun membro</div>
                    )}
                  </div>

                  <div className="teacher-team-footer">
                    <span>
                      {members.length} {members.length === 1 ? "membro" : "membri"}
                    </span>
                    {editable ? (
                      <form action={setTeamStatusAction}>
                        <input name="team_id" type="hidden" value={team.id} />
                        <input
                          name="status"
                          type="hidden"
                          value={confirmed ? "forming" : "confirmed"}
                        />
                        <button
                          className={
                            confirmed ? "button-secondary" : "button-primary"
                          }
                          type="submit"
                        >
                          {confirmed ? "Riapri team" : "Conferma team"}
                        </button>
                      </form>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="teacher-section unassigned-section">
          <div className="teacher-section-heading">
            <div>
              <div className="card-eyebrow">DA ASSEGNARE</div>
              <h2>Studenti senza team</h2>
            </div>
            <span>{unassigned.length}</span>
          </div>

          {unassigned.length ? (
            <div className="unassigned-list">
              {unassigned.map((student) => (
                <div className="unassigned-row" key={student!.id}>
                  <div className="avatar">{initials(student!.full_name)}</div>
                  <div className="member-copy">
                    <strong>{student!.full_name}</strong>
                    <span>{student!.email}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="teacher-all-assigned">
              Tutti gli studenti registrati appartengono a un team.
            </div>
          )}
        </section>
      </div>

      <AppFooter />
    </main>
  );
}
