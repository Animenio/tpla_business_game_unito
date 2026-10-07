import Link from "next/link";
import { loginAction, registerAction } from "@/app/auth/actions";
import { signInWithGoogleAction } from "@/app/auth/google-actions";

interface HomeProps {
  searchParams: Promise<{
    mode?: string | string[];
    error?: string | string[];
    message?: string | string[];
  }>;
}

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function GoogleGLogo() {
  return (
    <svg
      aria-hidden="true"
      className="google-g-logo"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.797 2.715v2.258h2.909c1.703-1.568 2.684-3.878 2.684-6.614Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.468-.806 5.956-2.181l-2.909-2.258c-.806.54-1.836.859-3.047.859-2.344 0-4.328-1.585-5.037-3.714H.956v2.332A9 9 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.963 10.706A5.41 5.41 0 0 1 3.682 9c0-.592.102-1.167.281-1.706V4.962H.956A9 9 0 0 0 0 9c0 1.452.347 2.827.956 4.038l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.322 0 2.508.454 3.441 1.346l2.581-2.581C13.464.891 11.426 0 9 0A9 9 0 0 0 .956 4.962l3.007 2.332C4.672 5.165 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GoogleAuthButton({ label }: { label: string }) {
  return (
    <button className="google-auth-button" type="submit">
      <GoogleGLogo />
      <span>{label}</span>
    </button>
  );
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const mode = param(params.mode) === "login" ? "login" : "register";
  const error = param(params.error);
  const message = param(params.message);

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
          {message === "password-updated" ? (
            <div className="auth-success">
              Password aggiornata. Puoi accedere con le nuove credenziali.
            </div>
          ) : null}

          {mode === "register" ? (
            <>
              <form action={signInWithGoogleAction} className="google-auth-form">
                <input name="mode" type="hidden" value="register" />
                <label>
                  <span>Codice sessione</span>
                  <input
                    autoCapitalize="characters"
                    name="session_code"
                    placeholder="Esempio: TEST-EUG-01"
                    required
                  />
                </label>
                <GoogleAuthButton label="Registrati con Google" />
                <p className="google-auth-note">
                  Sessione reale: usa l’account Google UniTo. Le sessioni Test
                  accettano anche un normale account Google/Gmail verificato.
                </p>
              </form>

              <div className="auth-separator">
                <span>oppure usa email e password</span>
              </div>

              <form action={registerAction} className="auth-form">
                <label>
                  <span>Nome</span>
                  <input
                    autoComplete="given-name"
                    name="first_name"
                    placeholder="Esempio: Mario"
                    required
                  />
                </label>
                <label>
                  <span>Cognome</span>
                  <input
                    autoComplete="family-name"
                    name="last_name"
                    placeholder="Esempio: Rossi"
                    required
                  />
                </label>
                <label>
                  <span>Email universitaria</span>
                  <input
                    autoComplete="email"
                    inputMode="email"
                    name="email"
                    placeholder="Esempio: mario.rossi@edu.unito.it"
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
                    placeholder="Almeno 8 caratteri"
                    required
                    type="password"
                  />
                </label>
                <label>
                  <span>Codice sessione</span>
                  <input
                    autoCapitalize="characters"
                    name="session_code"
                    placeholder="Esempio: TEST-EUG-01"
                    required
                  />
                </label>
                <button className="button-primary" type="submit">
                  Crea account
                </button>
                <p className="privacy-copy">
                  I tuoi dati saranno utilizzati esclusivamente per la gestione
                  della simulazione e del report finale. I docenti autorizzati
                  dall’amministratore vengono riconosciuti automaticamente
                  tramite email UniTo.
                </p>
              </form>
            </>
          ) : (
            <>
              <form action={signInWithGoogleAction} className="google-auth-form">
                <input name="mode" type="hidden" value="login" />
                <GoogleAuthButton label="Accedi con Google" />
                <p className="google-auth-note">
                  Se hai già partecipato a una sessione, Google ti riporta
                  direttamente alla tua area.
                </p>
              </form>

              <div className="auth-separator">
                <span>oppure usa email e password</span>
              </div>

              <form action={loginAction} className="auth-form login-form">
                <label>
                  <span>Email universitaria</span>
                  <input
                    autoComplete="email"
                    name="email"
                    placeholder="Esempio: mario.rossi@edu.unito.it"
                    required
                    type="email"
                  />
                </label>
                <label>
                  <span>Password</span>
                  <input
                    autoComplete="current-password"
                    name="password"
                    placeholder="Inserisci la password"
                    required
                    type="password"
                  />
                </label>
                <button className="button-primary" type="submit">
                  Accedi
                </button>
                <Link className="forgot-password-link" href="/forgot-password">
                  Password dimenticata?
                </Link>
              </form>
            </>
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
