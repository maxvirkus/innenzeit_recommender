# AGENTS.md

Rule-based recommender for meditation exercises. React + TypeScript + Vite, with
the algorithm strictly separated from the UI. Feedback collection runs through
Vercel Serverless Functions backed by Supabase, behind a password gate.

See [README.md](README.md) for the full concept, scoring model, and deployment
steps. This file captures what an AI agent needs to be productive and avoid
known pitfalls.

## Commands

```bash
npm install
npm run dev      # Vite dev server (http://localhost:5173) – password gate is bypassed in dev
npm test         # Vitest (single run); npm run test:watch for watch mode
npm run build    # tsc -b then vite build → dist/
```

There is no lint step. `npm run build` is the type-check gate (`tsc -b`).

## Architecture

- `src/domain/` — pure algorithm logic, **no React/DOM imports**, runs in Node
  (Vitest `environment: 'node'`). Pipeline in
  [recommender.ts](src/domain/recommender.ts): mood profile →
  classify → derive state goal → per-exercise safety filter + scoring → rank.
  Types live in [types.ts](src/domain/types.ts).
- `src/data/` — static data ([moods.ts](src/data/moods.ts),
  [exercises.ts](src/data/exercises.ts)). IDs are snake_case; labels/descriptions
  are German. Each file also exports a `*_BY_ID` lookup map.
- `src/components/` — React UI (onboarding/settings, feedback, debug panels).
- `api/` — Vercel Serverless Functions. Each file default-exports
  `handler(req, res)`. Auth shared via [_auth.ts](api/_auth.ts).
- `src/__tests__/` — Vitest tests; black-box validation of the whole
  `recommendExercises()` pipeline (no mocking of domain functions).

**Boundary rule:** `src/domain/` may import only `src/data/` and its own types —
never React or anything UI. Keep it pure so the algorithm stays unit-testable.

## Conventions

- **Imports in `api/` MUST use `.js` extensions** on relative paths
  (e.g. `import { requireAuth } from './_auth.js'`). Vercel/Node ESM resolves the
  compiled output; omitting `.js` causes `ERR_MODULE_NOT_FOUND` at runtime.
- **Imports in `src/` must NOT use extensions** — Vite + tsconfig
  `moduleResolution: bundler` handles them.
- `package.json` is `"type": "module"` (ESM throughout).
- One function/concern per file, named after the file (camelCase).
- German for user-facing strings (labels, descriptions, error messages);
  English is fine for technical/algorithm comments.
- Domain functions are pure and return rich result objects (e.g.
  `RecommendationResult` with `primary`, `alternatives`, `excludedExercises`,
  `scoredExercises`) rather than mutating inputs.

## API / auth

- Login checks `req.body.password` against `APP_PASSWORD`, then sets an httpOnly
  cookie `iz_auth` whose value is `SESSION_SECRET`. Protected endpoints call
  `requireAuth(req, res)`. There is no JWT — it's a plain token comparison.
- The client ([src/api.ts](src/api.ts)) calls `/api/*` with
  `credentials: 'same-origin'` so the cookie is sent.
- Env vars (set in Vercel → Settings → Environment Variables):
  `APP_PASSWORD`, `SESSION_SECRET`, `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`. [feedback.ts](api/feedback.ts) reads URL/key with
  fallbacks to the Supabase-Vercel integration names
  (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY`).

## Pitfalls (learned the hard way)

- The UI shows **"Falsches Passwort"** for *any* failed `/api/login` request,
  including 500s. When debugging login, check the Vercel function logs / network
  status — the message is not proof the password is wrong.
- Running only `npm run dev` does not serve `api/` routes. Use `vercel dev` (or
  the Vite `/api` proxy already configured in
  [vite.config.ts](vite.config.ts) pointing at port 3000) to exercise the
  functions locally.
- `tsconfig.json` must include `"api"` in `include` and `"node"` in
  `compilerOptions.types`, and `@types/node` must be a direct devDependency —
  otherwise the Vercel build fails with `Cannot find name 'process'` /
  `Cannot find type definition file for 'node'`.
- Supabase: a `permission denied for table session_feedback` (code 42501) is a
  Postgres **GRANT** problem, not a key/RLS problem. The schema runs
  `grant all on public.session_feedback to service_role;` — make sure that ran in
  the SQL editor. RLS stays enabled; `service_role` bypasses it by design.
- The new Supabase `sb_secret_...` keys work with a recent `@supabase/supabase-js`
  (v2.107+). The key is sent on the `apikey` header, never `Authorization:
  Bearer`.
- Changing Vercel env vars does **not** auto-redeploy; trigger a new deployment.

## Quick local check (Supabase connectivity)

`.env` (gitignored, copy from `.env.example`) lets you smoke-test the DB without
deploying — read `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` and run a
`select id from session_feedback limit 1` via `@supabase/supabase-js`.
