import { redirect } from "next/navigation";
import { leaveTeamAction } from "@/app/team/actions";
import { AppFooter } from "@/src/components/app-footer";
import { AppHeader } from "@/src/components/app-header";
import { LobbyRealtime } from "@/src/components/lobby-realtime";
import { createClient } from "@/src/lib/supabase/server";

interface LobbyPageProps {
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

function sessionStatusLabel(status: string) {
  switch (status) {
    case "registration_open":
      return "Registrazioni aperte";
    case "locked":
      return "Team confermati";
    case "live":
      return "Simulazione avviata";
    case "completed":
      return "Completata";
    default:
      return "In preparazione";
  }
}

export default async function LobbyPage({
  searchParams,
}: LobbyPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const { data: sessionMembership } = await supabase
    .from("session_members")
    .select("session_id, joined_at")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sessionMembership) {
    redirect("/team");
  }

  const { data: session } = await supabase
    .from("game_sessions")
    .select("id, code, title, status")
    .eq("id", sessionMembership.session_id)
    .single();

  if (!session) {
    redirect("/team");
  }

  const { data: memberships } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id);

  const teamIds = memberships?.map((membership) => membership.team_id) ?? [];

  if (!teamIds.length) {
    redirect("/team");
  }

  const { data: team } = await supabase
    .from("teams")
    .select("id, session_id, name, join_code, status")
    .in("id", teamIds)
    .eq("session_id", session.id)
    .maybeSingle();

  if (!team) {
    redirect("/team");
  }

  if (session.status === "live") {
    redirect("/case-study");
  }

  const { data: memberRows } = await supabase
    .from("team_members")
    .select("user_id, joined_at")
    .eq("team_id", team.id)
    .order("joined_at", { ascending: true });

  const memberIds = memberRows?.map((member) => member.user_id) ?? [];
  const { data: profiles } = memberIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", memberIds)
    : { data: [] };

  const profileMap = new Map(
    (profiles ?? []).map((member) => [member.id, member]),
  );

  const members = (memberRows ?? [])
    .map((member) => profileMap.get(member.user_id))
    .filter(Boolean);

  const { data: teamCount } = await supabase.rpc("session_team_count", {
    p_session_id: session.id,
  });

  const params = await searchParams;
  const error = param(params.error);
  const waiting = session.status !== "live" && session.status !== "completed";
  const membershipEditable =
    session.status === "registration_open" && team.status === "forming";

  return (
    <main className="application-page">
      <LobbyRealtime teamId={team.id} sessionId={session.id} />
      <AppHeader
        section="Lobby"
        sessionCode={session.code}
        userName={profile?.full_name ?? user.email ?? "Studente"}
      />

      <div className="page-main lobby-main">
        <section className="page-heading lobby-heading">
          <div>
            <h1>Lobby della simulazione</h1>
            <p>
              Il team è formato. Rimani in questa schermata finché il docente
              non avvia la simulazione.
            </p>
          </div>
          <div className={waiting ? "status-badge amber" : "status-badge green"}>
            <span className="status-dot" />
            {waiting ? "In attesa del docente" : "Sessione avviata"}
          </div>
        </section>

        {error ? <div className="page-error">{error}</div> : null}

        <div className="lobby-grid">
          <section className="lobby-team-card">
            <div className="team-summary">
              <div>
                <div className="card-eyebrow">
                  {team.name.toUpperCase()}
                </div>
                <h2>{team.name}</h2>
                <p>
                  Condividi questo codice con i tuoi compagni per farli entrare
                  nel team.
                </p>
              </div>
              <div className="team-code-block">
                <span>Codice team</span>
                <strong>{team.join_code}</strong>
              </div>
            </div>

            <div className="card-rule" />
            <h3 className="members-title">Membri del team</h3>

            <div className="members-list">
              {members.map((member) => (
                <div className="member-row" key={member!.id}>
                  <div className="avatar">{initials(member!.full_name)}</div>
                  <div className="member-copy">
                    <strong>{member!.full_name}</strong>
                    <span>{member!.email}</span>
                  </div>
                  <div className="status-badge green compact">
                    <span className="status-dot" />
                    Pronto
                  </div>
                </div>
              ))}
            </div>

            {membershipEditable ? (
              <form action={leaveTeamAction}>
                <input name="team_id" type="hidden" value={team.id} />
                <button className="button-secondary leave-button" type="submit">
                  Esci dal team
                </button>
              </form>
            ) : (
              <div className="team-locked-note">
                {team.status === "forming"
                  ? "La composizione del team è bloccata dal docente."
                  : "Team confermato: la composizione non è più modificabile."}
              </div>
            )}
          </section>

          <aside className="session-card">
            <div className="card-eyebrow">SESSIONE</div>
            <h2>{session.code}</h2>

            <dl className="session-facts">
              <div>
                <dt>Stato</dt>
                <dd>{sessionStatusLabel(session.status)}</dd>
              </div>
              <div>
                <dt>Team registrati</dt>
                <dd>{teamCount ?? "—"}</dd>
              </div>
              <div>
                <dt>Anno</dt>
                <dd>{session.status === "live" ? "In corso" : "Non iniziato"}</dd>
              </div>
              <div>
                <dt>Timer</dt>
                <dd>—</dd>
              </div>
            </dl>

            <div className="data-room-box">
              <strong>DATA ROOM</strong>
              <p>
                {session.status === "live"
                  ? "La sessione è stata avviata dal docente."
                  : "Sarà sbloccata quando il docente avvierà la simulazione."}
              </p>
            </div>

            <div className="wait-box">
              {session.status === "live"
                ? "Simulazione avviata"
                : "Attendi l’avvio della simulazione"}
            </div>
          </aside>
        </div>
      </div>

      <AppFooter />
    </main>
  );
}
