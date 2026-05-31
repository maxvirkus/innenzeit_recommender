# Innenzeit Recommender (Prototyp)

Regelbasierter Empfehlungs-Prototyp für Meditationsübungen. React + TypeScript +
Vite, Algorithmus strikt von der UI getrennt. Feedback-Sammlung über Vercel
Serverless Functions + Supabase, Zugang per Passwort geschützt.

## Setup

```bash
npm install
npm run dev      # Dev-Server (http://localhost:5173) – Passwort-Gate ist im Dev übersprungen
npm test         # Vitest
npm run build    # Production-Build (dist/)
```

## Struktur

- `src/data/` – Stamm-Daten (Moods, Übungen inkl. stateGoals, longTermGoals, sciencePrior, contraindicationRisk)
- `src/domain/` – reine Algorithmus-Logik (ohne React, separat testbar)
  - `deriveStateGoal.ts` – kurzfristiges Zustandsziel
  - `scoring.ts` – StateFit, LongTermGoalFit, PersonalEvidence, FinalScore
  - `safetyRules.ts` – harte Filter (Rapid Breathing, Breathhold, L3-Gating, feltWorse)
  - `recommender.ts` – Pipeline inkl. Coherent-Breathing-Sonderregeln
- `src/components/` – UI-Bausteine (inkl. Onboarding/Settings, Feedback, Debug)
- `api/` – Vercel Serverless Functions (Login, Session, Feedback)
- `src/__tests__/` – Vitest Unit Tests

## Konzept: kurzfristig vs. langfristig

- **LongTermGoals** (Onboarding/Settings): fließen über `calculateLongTermGoalFit` ein.
- **StateGoal** (pro Session aus dem Profil abgeleitet): treibt `calculateStateFit`.
- **PersonalEvidence**: aus lokaler History (localStorage), ab 3 relevanten Einträgen
  wirksam; `feltWorse` wird stark negativ gewichtet.
- Gewichtung verschiebt sich bei hohem Stress / niedriger Stabilität stärker auf den State-Fit.

## History-Simulation

Im Feedback-Bereich kann das Team Fake-Feedback **lokal speichern**. Es landet in
`localStorage` und beeinflusst sofort das Scoring (Spalte „PersonalEvidence“ im
Debug-Panel). „Lokale Historie zurücksetzen“ leert sie wieder.

## Deployment auf Vercel

1. Repo zu GitHub pushen und in Vercel importieren (Framework: **Vite**, wird automatisch erkannt).
2. In Vercel unter **Settings → Environment Variables** setzen:
   - `APP_PASSWORD` – gemeinsames Login-Passwort
   - `SESSION_SECRET` – langer Zufallswert (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (nur serverseitig, nie im Client)
3. Supabase-Tabelle anlegen: Inhalt von `supabase/schema.sql` im Supabase SQL-Editor ausführen.
4. Deploy. Die App fragt beim Aufruf nach dem Passwort; danach kann das Team Feedback
   per „An Team senden“ zentral in Supabase speichern und per „Team-Feedback laden“ einsehen.

### Passwortschutz

`api/login.ts` prüft das Passwort serverseitig gegen `APP_PASSWORD` und setzt ein
HttpOnly-Session-Cookie (`SESSION_SECRET`). Geschützte Endpunkte (`api/feedback.ts`)
verifizieren dieses Cookie. Lokal (`npm run dev`) ist das Gate übersprungen, damit
der Algorithmus ohne Backend testbar bleibt.

### Feedback-Auswertung

Alle gesendeten Einträge liegen in der Supabase-Tabelle `session_feedback` und
können dort (SQL/Dashboard) oder über „Team-Feedback laden“ in der App ausgewertet werden.

`.env.example` listet alle benötigten Variablen für lokale Tests der Functions
(z. B. mit `vercel dev`).
