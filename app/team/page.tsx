import { redirect } from "next/navigation";
import { AppFooter } from "@/src/components/app-footer";
import { AppHeader } from "@/src/components/app-header";
import { createClient } from "@/src/lib/supabase/server";
import {
  createTeamAction,
  joinTeamAction,
} from "@/app/team/actions";

interface TeamPageProps {
  searchParams: Promise<{
    error?: string | string[];
  }>;
}

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TeamPage({
  searchParams,
}: TeamPageProps) {
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
    redirect(
      "/?mode=login&error=" +
        encodeURIComponent(
          "Il tuo account non è associato a una sessione aperta.",
        ),
    );
  }

  const { data: session } = await supabase
    .from("game_sessions")
    .select("id, code, title, status")
    .eq("id", sessionMembership.session_id)
    .single();

  const { data: memberships } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id);

  if (memberships?.length) {
    const teamIds = memberships.map((membership) => membership.team_id);
    const { data: currentTeam } = await supabase
      .from("teams")
      .select("id")
      .in("id", teamIds)
      .eq("session_id", sessionMembership.session_id)
      .maybeSingle();

    if (currentTeam) {
      redirect("/lobby");
    }
  }

  const params = await searchParams;
  const error = param(params.error);

  return (
    <main className="application-page">
      <AppHeader
        section="Team setup"
        sessionCode={session?.code ?? "—"}
        userName={profile?.full_name ?? user.email ?? "Studente"}
      />

      <div className="page-main">
        <section className="page-heading">
          <h1>Forma il tuo team</h1>
          <p>
            Puoi creare un nuovo team oppure unirti a un team già esistente.
            Il numero di team della sessione è dinamico.
          </p>
        </section>

        {error ? <div className="page-error">{error}</div> : null}

        <div className="team-setup-grid">
          <section className="team-card team-card-primary">
            <div className="team-card-band">CREA UN NUOVO TEAM</div>
            <div className="team-card-body">
              <h2>Scegli un nome riconoscibile</h2>
              <p>
                Il sistema genererà automaticamente un codice breve da
                condividere con i tuoi compagni.
              </p>
              <form action={createTeamAction} className="team-form">
                <label>
                  <span>Nome del team</span>
                  <input
                    maxLength={60}
                    minLength={2}
                    name="team_name"
                    placeholder="es. Team Alpha"
                    required
                  />
                </label>
                <button className="button-primary" type="submit">
                  Crea team
                </button>
              </form>
              <p className="small-note">
                Dopo la creazione potrai invitare altri studenti tramite il
                codice team.
              </p>
            </div>
          </section>

          <section className="team-card">
            <div className="team-card-body join-card-body">
              <div className="card-eyebrow">ENTRA IN UN TEAM</div>
              <h2>Hai già ricevuto un codice?</h2>
              <p>
                Inserisci il codice team condiviso da un tuo compagno. Verrai
                aggiunto immediatamente alla lobby del gruppo.
              </p>
              <form action={joinTeamAction} className="team-form">
                <label>
                  <span>Codice team</span>
                  <input
                    autoCapitalize="characters"
                    maxLength={8}
                    name="team_code"
                    placeholder="A7K4"
                    required
                  />
                </label>
                <button className="button-secondary" type="submit">
                  Entra nel team
                </button>
              </form>
              <div className="info-box">
                Il team può avere un numero variabile di membri: sarà il
                docente a confermare i gruppi prima dell’avvio.
              </div>
            </div>
          </section>
        </div>
      </div>

      <AppFooter />
    </main>
  );
}
