# CFO AI Business Game

Applicazione web per il **CFO AI Business Game** del corso Tecnologie per l’Accounting — Università degli Studi di Torino.

## Stack

- Next.js + TypeScript
- Supabase Auth / PostgreSQL / Realtime
- Vercel
- Aurora Tyres World Model v0.4 server-side

## Stato implementazione

### World Model

Il motore economico Aurora Tyres v0.4 è in:

```
src/domain/simulation/v04/
```

La traduzione Excel → TypeScript mantiene formule, dipendenze, DCF e scoring del workbook di riferimento.

### Verticali applicative implementate

Studente:

```
registrazione / login
→ associazione alla sessione
→ creazione o ingresso nel team
→ lobby realtime
→ Data Room
→ briefing del round
→ 9 decisioni
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

## Decisioni aperte

Prima del rilascio in aula va risolta l’incoerenza presente nel workbook v0.4 tra:

- decisione Balanced Round 1 R&S = **4,6%**
- step UI dichiarato per R&S = **0,5 punti percentuali**

Il motore conserva il valore Excel; la validazione dello step UI è separata.

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

Il docente apre un round con una finestra temporale; gli studenti salvano una bozza validata sulle regole UI del World Model e la inviano tramite RPC. La chiusura del docente calcola Aurora Tyres v0.4 server-side e salva per ogni team sia il payload completo sia i KPI principali.

La chiusura anticipata è consentita solo quando tutti i team attivi hanno inviato. Dopo la scadenza il docente può chiudere il round anche se alcuni team non hanno inviato; per quei team non viene generato un risultato.
