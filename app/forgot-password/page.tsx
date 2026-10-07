import Link from "next/link";
import { requestPasswordResetAction } from "@/app/auth/password-actions";

interface ForgotPasswordPageProps {
  searchParams: Promise<{
    sent?: string | string[];
    error?: string | string[];
  }>;
}

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const search = await searchParams;
  const sent = param(search.sent) === "1";
  const error = param(search.error);

  return (
    <main className="auth-page">
      <div className="brand-bar" aria-hidden="true" />
      <div className="auth-main single-auth-main">
        <section className="auth-hero recovery-hero">
          <div className="eyebrow">CFO AI BUSINESS GAME</div>
          <h1>Recupera<br />la password</h1>
          <p className="hero-copy">
            Inserisci la tua email UniTo. Se esiste un account associato,
            riceverai un link per impostare una nuova password.
          </p>
        </section>

        <section className="auth-card recovery-card">
          <h3>Password dimenticata?</h3>
          <p className="auth-intro">
            Il messaggio di recupero viene inviato all’indirizzo universitario
            collegato all’account.
          </p>

          {error ? <div className="form-error">{error}</div> : null}

          {sent ? (
            <div className="auth-success">
              Se l’indirizzo è associato a un account, riceverai a breve
              un’email con il link di recupero. Controlla anche spam e posta
              indesiderata.
            </div>
          ) : (
            <form action={requestPasswordResetAction} className="auth-form">
              <label>
                <span>Email universitaria</span>
                <input
                  autoComplete="email"
                  name="email"
                  placeholder="nome.cognome@edu.unito.it"
                  required
                  type="email"
                />
              </label>
              <button className="button-primary" type="submit">
                Invia link di recupero
              </button>
            </form>
          )}

          <Link className="auth-back-link" href="/?mode=login">
            Torna al login
          </Link>
        </section>
      </div>

      <footer className="auth-footer">
        <span>Università degli Studi di Torino</span>
        <span>Dipartimento di Management “Valter Cantino”</span>
      </footer>
    </main>
  );
}
