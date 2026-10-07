# CFO AI Business Game

Applicazione web per il **CFO AI Business Game** del corso Tecnologie per l’Accounting — Università degli Studi di Torino.

## Stack

- Next.js + TypeScript
- Supabase Auth / PostgreSQL / Realtime
- Vercel
- Aurora Tyres World Model v0.5.2 server-side (v0.4 retained for legacy sessions)

## Stato implementazione

### World Model

Il modello predefinito per le nuove sessioni è **Aurora Tyres v0.5.2**:

```
src/domain/simulation/v05/
```

La v0.5.2 usa il set didattico ridotto a 6 decisioni economiche e mantiene test di parità deterministici rispetto al reference twin. La precedente v0.4 resta disponibile in `src/domain/simulation/v04/` esclusivamente per la retrocompatibilità delle sessioni già create. Il routing avviene tramite `game_sessions.model_version`.

### Verticali applicative implementate

Studente:

```
registrazione / login
→ associazione alla sessione
→ creazione o ingresso nel team
→ lobby realtime
→ Data Room
→ briefing del round
→ 6 decisioni nella v0.5.2 (9 nella v0.4 legacy)
→ review
→ invio immutabile
→ attesa chiusura
→ risultati del round
```

Docente:

```
registrazione con email pre-autorizzata
→ riconoscimento automatico del ruolo
→ dashboard sessione
→ monitoraggio studenti e team
→ conferma gruppi
→ blocco / riapertura registrazioni
→ avvio simulazione
→ apertura round
→ monitoraggio invii live
→ estensione timer
→ chiusura e calcolo server-side
```

Admin:

```
console docente
→ Gestisci accessi
→ whitelist email UniTo
→ assegna teacher/admin
→ revoca accessi staff
```

Le schermate seguono il Figma **CFO AI Business Game — UI Design**.

## Setup locale

### 1. Dipendenze

```bash
npm install
```

### 2. Supabase

Il progetto Supabase dedicato è `cfo-ai-business-game-unito`. Le migration versionate sono:

```
supabase/migrations/202610060001_app_foundation.sql
```

Per sviluppo locale puoi eseguire:

```
supabase/seed.sql
```

che crea la sessione demo:

```
ACCOUNTING26
```

### 3. Variabili ambiente

Copia `.env.example` in `.env.local` e valorizza:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

### 4. Avvio

```bash
npm run dev
```

## Auth e sicurezza

- Auth gestita da Supabase.
- RLS attiva sulle tabelle applicative.
- Creazione/ingresso/uscita dai team avvengono tramite RPC `SECURITY DEFINER`.
- Un utente non può appartenere a più team nella stessa sessione.
- La lobby usa Supabase Realtime per membership e stato sessione.
- Il pannello docente usa RPC autorizzate e registra le transizioni in `session_events`.
- Gli account staff non possono creare o unirsi ai team studenti.
- I ruoli teacher/admin non sono selezionabili dal form pubblico: vengono assegnati solo tramite whitelist amministrata server-side.
- Un admin può autorizzare un'email UniTo prima della registrazione oppure promuovere immediatamente un account esistente non associato a un team studente.
- L'avvio della simulazione richiede tutti i team confermati e nessuno studente senza team.
- Le decisioni sono modificabili soltanto dal proprio team durante la finestra aperta.
- Dopo l'invio le decisioni diventano immutabili.
- La chiusura del round e il salvataggio dei risultati sono atomici lato database.
- Il motore Aurora Tyres viene eseguito server-side e i risultati persistono insieme alla versione del modello.
- Il motore economico non viene eseguito nel browser.

## Branch di sviluppo

Il lavoro è organizzato in PR impilate:

1. technical foundation
2. World Model v0.4
3. application foundation / auth + team + lobby
4. teacher control panel / team confirmation + session start
5. round lifecycle / Data Room + decisions + results


## Data Room

La struttura della Data Room è già attiva tramite `session_materials`.

I due materiali previsti dal Figma sono:

- Bilancio consolidato semplificato — XLSX
- Nota integrativa 2025 — Aurora Tyres — PDF

I relativi `source_url` restano intenzionalmente vuoti finché i file Drive definitivi non vengono pubblicati/condivisi per gli studenti. L'app mostra nel frattempo uno stato non cliccabile invece di esporre link privati.

## Round lifecycle

Ogni sessione contiene tre record in `game_rounds`:

- Round 1 — 2026
- Round 2 — 2027–2028
- Round 3 — 2029–2030

Il docente apre un round con una finestra temporale; gli studenti salvano una bozza validata sulle regole della versione associata alla sessione e la inviano tramite RPC. La chiusura del docente instrada il calcolo verso Aurora Tyres v0.5.2 oppure, per le sessioni legacy, v0.4, e salva per ogni team sia il payload completo sia i KPI principali.

La chiusura anticipata è consentita solo quando tutti i team attivi hanno inviato. Dopo la scadenza il docente può chiudere il round anche se alcuni team non hanno inviato; per quei team non viene generato un risultato.


## Session management

Admins can manage independent game runs from `/admin/sessions`.

Each session code represents an isolated execution of the Business Game. Creating or duplicating a session does not copy students, teams, decisions, timers, results, rankings or AI evidence.

Supported admin operations:

- create a fresh session with a new code;
- switch the active staff session;
- duplicate configuration into a clean session;
- archive an old or abandoned session while preserving its data.

The selected staff session is stored in a secure HTTP-only cookie and validated against the user's staff membership before use.

## Password recovery

The login page exposes **Password dimenticata?**.

Recovery flow:

```
forgot-password
→ Supabase recovery email
→ /auth/recovery (non consuma il token)
→ conferma esplicita dell'utente
→ verifyOtp(type=recovery)
→ /auth/reset-password
→ new password
→ forced login
```

The canonical application URL is supplied through `NEXT_PUBLIC_SITE_URL`.

For hosted Supabase, the canonical production URL and callback URL must be allowed in **Authentication → URL Configuration**:

```
https://cfo-ai-business-game-unito.vercel.app
https://cfo-ai-business-game-unito.vercel.app/auth/callback
```


### Recovery email template

Per evitare che gli scanner automatici delle email consumino il link monouso prima dell'utente, il template **Reset password** di Supabase deve puntare alla pagina intermedia dell'app invece di usare direttamente `{{ .ConfirmationURL }}`.

Usare:

```html
<h2>Reimposta la password</h2>
<p>Hai richiesto il recupero della password.</p>
<p>
  <a href="{{ .SiteURL }}/auth/recovery?token_hash={{ .TokenHash }}&type=recovery">
    Continua con il recupero
  </a>
</p>
<p>Se non hai richiesto questa operazione, ignora questa email.</p>
```

La pagina `/auth/recovery` non verifica automaticamente il token: mostra un pulsante che richiede un'azione esplicita dell'utente.


### Recovery compatibility

The recovery landing page accepts both Supabase recovery mechanisms:

- the default SSR/PKCE redirect with a `code` query parameter;
- the optional custom email template using `token_hash` and `type=recovery`.

The PKCE code is exchanged only after the user explicitly presses the confirmation button, so a redirect reaching the landing page does not immediately finalize the recovery session.


## Google OAuth (recommended classroom login)

The preferred classroom authentication path is Google OAuth through the institutional UniTo Google Workspace accounts.

Flow:

```
Register
→ enter session code
→ Continue with Google
→ Supabase Google OAuth
→ /auth/callback
→ verify confirmed UniTo email domain
→ complete_google_session_join(session code)
→ student team setup OR teacher/admin console
```

Existing users can use **Continue with Google** from the login tab without entering a session code. New users must use the Register tab and provide the session code before OAuth.

Server-side controls:

- only confirmed Google identities are accepted;
- accepted domains are `@edu.unito.it` and `@unito.it`;
- session registration status is checked in PostgreSQL;
- teacher/admin roles still require the existing session-scoped staff authorization;
- students cannot self-promote to staff through Google;
- the session code is stored only temporarily in an HTTP-only cookie during the OAuth redirect.

Google Cloud / Supabase configuration:

1. Create a Google OAuth Web application.
2. Authorized JavaScript origin:
   `https://cfo-ai-business-game-unito.vercel.app`
3. Authorized redirect URI:
   `https://qzoxmbnikvaqqzojvqta.supabase.co/auth/v1/callback`
4. Copy the Google Client ID and Client Secret into Supabase:
   Authentication → Sign In / Providers → Google.
5. Keep the app callback allowed in Supabase URL Configuration:
   `https://cfo-ai-business-game-unito.vercel.app/auth/callback`

The Google Client Secret belongs only in Supabase provider configuration and must never be committed to this repository or exposed as a public Vercel variable.
