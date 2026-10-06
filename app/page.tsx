import Link from "next/link";
import { loginAction, registerAction } from "@/app/auth/actions";

interface HomeProps {
  searchParams: Promise<{
    mode?: string | string[];
    error?: string | string[];
  }>;
}

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const mode = param(params.mode) === "login" ? "login" : "register";
  const error = param(params.error);

  return (
    <main className="auth-page">
      <div className="brand-bar" aria-hidden="true" />
      <div className="auth-main">
        <section className="auth-hero">
          <div className="eyebrow">UNIVERSITÀ DEGLI STUDI DI TORINO</div>
          <h1>
            CFO AI
            <br />
            Business Game
          </h1>
          <h2>Prendi decisioni. Affronta gli shock. Crea valore.</h2>
          <p className="hero-copy">
            Una simulazione manageriale interattiva per analizzare
            un’impresa, prendere decisioni strategiche e osservare il loro
            impatto economico-finanziario nel tempo.
          </p>
          <div className="course-pill">Tecnologie per l’Accounting</div>
        </section>

        <section className="auth-card">
          <h3>Accedi alla simulazione</h3>
          <p className="auth-intro">
            Registrati o accedi per partecipare alla sessione della tua
            classe.
          </p>

          <nav className="auth-tabs" aria-label="Autenticazione">
            <Link
              className={mode === "register" ? "auth-tab active" : "auth-tab"}
              href="/?mode=register"
            >
              Registrati
            </Link>
            <Link
              className={mode === "login" ? "auth-tab active" : "auth-tab"}
              href="/?mode=login"
            >
              Accedi
            </Link>
          </nav>

          {error ? <div className="form-error">{error}</div> : null}

          {mode === "register" ? (
            <form action={registerAction} className="auth-form">
              <label>
                <span>Nome</span>
                <input
                  autoComplete="given-name"
                  name="first_name"
                  placeholder="Mario"
                  required
                />
              </label>
              <label>
                <span>Cognome</span>
                <input
                  autoComplete="family-name"
                  name="last_name"
                  placeholder="Rossi"
                  required
                />
              </label>
              <label>
                <span>Email universitaria</span>
                <input
                  autoComplete="email"
                  inputMode="email"
                  name="email"
                  placeholder="nome.cognome@edu.unito.it"
                  required
                  type="email"
                />
              </label>
              <label>
                <span>Password</span>
                <input
                  autoComplete="new-password"
                  minLength={8}
                  name="password"
                  placeholder="••••••••"
                  required
                  type="password"
                />
              </label>
              <label>
                <span>Codice sessione</span>
                <input
                  autoCapitalize="characters"
                  name="session_code"
                  placeholder="ACCOUNTING26"
                  required
                />
              </label>
              <button className="button-primary" type="submit">
                Crea account
              </button>
              <p className="privacy-copy">
                I tuoi dati saranno utilizzati esclusivamente per la gestione
                della simulazione e del report finale.
              </p>
            </form>
          ) : (
            <form action={loginAction} className="auth-form login-form">
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
              <label>
                <span>Password</span>
                <input
                  autoComplete="current-password"
                  name="password"
                  placeholder="••••••••"
                  required
                  type="password"
                />
              </label>
              <button className="button-primary" type="submit">
                Accedi
              </button>
            </form>
          )}
        </section>
      </div>

      <footer className="auth-footer">
        <span>Università degli Studi di Torino</span>
        <span>Dipartimento di Management “Valter Cantino”</span>
      </footer>
    </main>
  );
}
