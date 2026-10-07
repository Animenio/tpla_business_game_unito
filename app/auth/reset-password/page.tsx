import { redirect } from "next/navigation";
import { updatePasswordAction } from "@/app/auth/password-actions";
import { createClient } from "@/src/lib/supabase/server";

interface ResetPasswordPageProps {
  searchParams: Promise<{
    error?: string | string[];
  }>;
}

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/forgot-password?error=" +
        encodeURIComponent(
          "Il link di recupero non è valido o è scaduto. Richiedine uno nuovo.",
        ),
    );
  }

  const search = await searchParams;
  const error = param(search.error);

  return (
    <main className="auth-page">
      <div className="brand-bar" aria-hidden="true" />
      <div className="auth-main single-auth-main">
        <section className="auth-hero recovery-hero">
          <div className="eyebrow">CFO AI BUSINESS GAME</div>
          <h1>Nuova<br />password</h1>
          <p className="hero-copy">
            Scegli una nuova password per l’account {user.email}.
          </p>
        </section>

        <section className="auth-card recovery-card">
          <h3>Imposta la nuova password</h3>
          <p className="auth-intro">
            Usa almeno 8 caratteri. Dopo il salvataggio dovrai effettuare
            nuovamente il login.
          </p>

          {error ? <div className="form-error">{error}</div> : null}

          <form action={updatePasswordAction} className="auth-form">
            <label>
              <span>Nuova password</span>
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
              <span>Conferma password</span>
              <input
                autoComplete="new-password"
                minLength={8}
                name="confirm_password"
                placeholder="••••••••"
                required
                type="password"
              />
            </label>
            <button className="button-primary" type="submit">
              Salva nuova password
            </button>
          </form>
        </section>
      </div>

      <footer className="auth-footer">
        <span>Università degli Studi di Torino</span>
        <span>Dipartimento di Management “Valter Cantino”</span>
      </footer>
    </main>
  );
}
