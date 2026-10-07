import Link from "next/link";
import { verifyRecoveryTokenAction } from "@/app/auth/password-actions";

interface RecoveryPageProps {
  searchParams: Promise<{
    token_hash?: string | string[];
    type?: string | string[];
  }>;
}

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function RecoveryPage({
  searchParams,
}: RecoveryPageProps) {
  const search = await searchParams;
  const tokenHash = param(search.token_hash);
  const type = param(search.type);
  const valid = Boolean(tokenHash && type === "recovery");

  return (
    <main className="auth-page">
      <div className="brand-bar" aria-hidden="true" />
      <div className="auth-main single-auth-main">
        <section className="auth-hero recovery-hero">
          <div className="eyebrow">CFO AI BUSINESS GAME</div>
          <h1>Recupero<br />password</h1>
          <p className="hero-copy">
            Per sicurezza il link dell’email non viene consumato
            automaticamente. Conferma qui per procedere alla scelta della
            nuova password.
          </p>
        </section>

        <section className="auth-card recovery-card">
          <h3>Conferma il recupero</h3>
          <p className="auth-intro">
            Questo passaggio evita che i sistemi automatici di scansione delle
            email utilizzino il link prima di te.
          </p>

          {valid ? (
            <form action={verifyRecoveryTokenAction} className="auth-form">
              <input name="token_hash" type="hidden" value={tokenHash} />
              <button className="button-primary" type="submit">
                Continua e imposta una nuova password
              </button>
            </form>
          ) : (
            <div className="form-error">
              Il link non contiene un token di recupero valido. Richiedi una
              nuova email.
            </div>
          )}

          <Link className="auth-back-link" href="/forgot-password">
            Richiedi un nuovo link
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
