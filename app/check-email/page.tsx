import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <main className="simple-page">
      <div className="brand-bar" aria-hidden="true" />
      <section className="simple-card">
        <div className="eyebrow">CFO AI BUSINESS GAME</div>
        <h1>Controlla la tua email</h1>
        <p>
          La registrazione è stata ricevuta. Se la conferma email è attiva nel
          progetto Supabase, apri il messaggio inviato al tuo indirizzo UniTo
          e completa l’accesso.
        </p>
        <Link className="button-primary link-button" href="/?mode=login">
          Torna all’accesso
        </Link>
      </section>
    </main>
  );
}
