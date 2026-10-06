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
```

Docente:

```
login staff
→ dashboard sessione
→ monitoraggio studenti e team
→ conferma gruppi
→ blocco / riapertura registrazioni
→ avvio simulazione
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
- L'avvio della simulazione richiede tutti i team confermati e nessuno studente senza team.
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
