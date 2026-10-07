import { redirect } from "next/navigation";
import {
  authorizeStaffAction,
  revokeStaffAction,
} from "@/app/admin/teachers/actions";
import { AppFooter } from "@/src/components/app-footer";
import { AppHeader } from "@/src/components/app-header";
import { requireTeacherGameContext } from "@/src/lib/game/context";

interface AdminTeachersPageProps {
  searchParams: Promise<{
    error?: string | string[];
    updated?: string | string[];
  }>;
}

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function roleLabel(role: string) {
  return role === "admin" ? "Amministratore" : "Docente";
}

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AdminTeachersPage({
  searchParams,
}: AdminTeachersPageProps) {
  const { supabase, user, profile, membership, session } =
    await requireTeacherGameContext();

  if (membership.role !== "admin") {
    redirect("/teacher");
  }

  const { data: authorizations } = await supabase
    .from("staff_authorizations")
    .select(
      "id, email, role, authorized_at, claimed_by, claimed_at, revoked_at",
    )
    .eq("session_id", session.id)
    .is("revoked_at", null)
    .order("authorized_at", { ascending: false });

  const search = await searchParams;
  const error = param(search.error);
  const updated = param(search.updated) === "1";

  return (
    <main className="application-page">
      <AppHeader
        section="Amministrazione accessi"
        sessionCode={session.code}
        userName={profile.full_name}
      />

      <div className="page-main admin-staff-main">
        <section className="admin-staff-heading">
          <div>
            <div className="card-eyebrow">ACCESSI STAFF</div>
            <h1>Docenti e amministratori</h1>
            <p>
              Autorizza in anticipo le email UniTo che potranno entrare nella
              sessione come docenti o amministratori. Non esiste alcuna
              auto-promozione dal form pubblico.
            </p>
          </div>
          <a className="button-secondary admin-back-button" href="/teacher">
            Torna alla console
          </a>
        </section>

        {error ? <div className="page-error teacher-error">{error}</div> : null}
        {updated ? (
          <div className="admin-success">
            Elenco accessi aggiornato correttamente.
          </div>
        ) : null}

        <div className="admin-staff-grid">
          <section className="admin-authorize-card">
            <div className="card-eyebrow">NUOVO ACCESSO</div>
            <h2>Autorizza un docente</h2>
            <p>
              Se l’account esiste già, il ruolo viene aggiornato subito. Se
              non esiste, l’email viene messa in whitelist e il ruolo verrà
              assegnato automaticamente alla registrazione.
            </p>

            <form action={authorizeStaffAction} className="admin-staff-form">
              <label>
                <span>Email UniTo</span>
                <input
                  autoComplete="email"
                  name="email"
                  placeholder="nome.cognome@unito.it"
                  required
                  type="email"
                />
              </label>

              <label>
                <span>Ruolo</span>
                <select defaultValue="teacher" name="role">
                  <option value="teacher">Docente</option>
                  <option value="admin">Amministratore</option>
                </select>
              </label>

              <button className="button-primary" type="submit">
                Autorizza accesso
              </button>
            </form>

            <div className="admin-security-note">
              Gli amministratori possono autorizzare o revocare altri membri
              dello staff. I docenti possono gestire il gioco ma non gli
              accessi.
            </div>
          </section>

          <section className="admin-access-list-card">
            <div className="admin-list-heading">
              <div>
                <div className="card-eyebrow">ACCESSI ATTIVI</div>
                <h2>{authorizations?.length ?? 0} autorizzazioni</h2>
              </div>
              <span>{session.code}</span>
            </div>

            <div className="admin-access-list">
              {(authorizations ?? []).map((authorization) => {
                const isSelf = authorization.claimed_by === user.id;
                const claimed = Boolean(authorization.claimed_by);

                return (
                  <article className="admin-access-row" key={authorization.id}>
                    <div className="admin-access-main">
                      <strong>{authorization.email}</strong>
                      <span>
                        {roleLabel(authorization.role)} · autorizzato il{" "}
                        {formatDate(authorization.authorized_at)}
                      </span>
                    </div>

                    <div className="admin-access-state">
                      <span
                        className={
                          claimed
                            ? "status-badge green compact"
                            : "status-badge amber compact"
                        }
                      >
                        <span className="status-dot" />
                        {claimed ? "Account collegato" : "In attesa registrazione"}
                      </span>
                      {authorization.claimed_at ? (
                        <small>
                          Attivo dal {formatDate(authorization.claimed_at)}
                        </small>
                      ) : null}
                    </div>

                    <form action={revokeStaffAction}>
                      <input
                        name="authorization_id"
                        type="hidden"
                        value={authorization.id}
                      />
                      <button
                        className="button-secondary admin-revoke-button"
                        disabled={isSelf}
                        title={
                          isSelf
                            ? "Non puoi revocare il tuo stesso accesso."
                            : "Revoca accesso"
                        }
                        type="submit"
                      >
                        {isSelf ? "Il tuo account" : "Revoca"}
                      </button>
                    </form>
                  </article>
                );
              })}

              {!authorizations?.length ? (
                <div className="teacher-empty-row">
                  Nessun accesso staff autorizzato.
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <section className="admin-how-it-works">
          <div className="card-eyebrow">COME FUNZIONA</div>
          <h2>Un solo form pubblico, ruoli assegnati dal server</h2>
          <div className="admin-flow">
            <div>
              <strong>1</strong>
              <span>L’admin autorizza l’email UniTo.</span>
            </div>
            <div>
              <strong>2</strong>
              <span>Il docente si registra normalmente con il codice sessione.</span>
            </div>
            <div>
              <strong>3</strong>
              <span>Supabase riconosce la whitelist e assegna il ruolo staff.</span>
            </div>
            <div>
              <strong>4</strong>
              <span>Al login viene aperta automaticamente la console docente.</span>
            </div>
          </div>
        </section>
      </div>

      <AppFooter />
    </main>
  );
}
