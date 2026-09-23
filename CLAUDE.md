# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Гараж" — a Nuxt 3 app for tracking car maintenance/expenses (repairs, part replacements, purchases, scheduled maintenance) with reminders and spending analytics. Personal/pet project, Russian-language UI. Full spec is in `TZ.md` — read it for feature scope, data model rationale, and what's explicitly out of scope (multi-currency, email notifications, attachments, etc.). `README.md` has setup/run instructions and a running "known limitations" note — keep both in sync when scope changes.

Stack: Nuxt 3 (Vue 3 Composition API) + TypeScript (strict) + Tailwind + Drizzle ORM over SQLite (`better-sqlite3`) + `nuxt-auth-utils` for cookie-session auth + Zod for validation + chart.js/vue-chartjs for analytics + `@vite-pwa/nuxt` (installable PWA — manifest/icons generated from `public/logo.svg` via `pwa-assets.config.ts`, no offline API caching; custom service worker in `service-worker/sw.ts` via `injectManifest`, handles Web Push) + `web-push` (VAPID) for reminder notifications.

## Branching & deploy

`master` is production; day-to-day work happens on `dev`, merged into `master` when ready to ship. Pushing to `master` triggers `.github/workflows/deploy.yml`, which runs two jobs: **build** (GitHub runner builds the Docker image and pushes it to `ghcr.io/dchakin/garage-nuxt-project:latest` + a `:<sha>` tag, with buildx layer caching via `type=gha`) and **deploy** (SSHes into the prod server, root@195.19.209.224, triggering `/opt/garage/deploy.sh`). The image is never built on the prod server — `deploy.sh` only does `git reset --hard origin/master` + `docker compose pull` + `docker compose up -d`, so the SSH session lasts seconds instead of minutes. `docker-compose.yml` references the GHCR image by tag and has no `build:` section; a local `docker compose build` is therefore not part of the deploy path. The server must be logged in to GHCR once (`docker login ghcr.io` with a PAT that has `read:packages`) unless the package is public. The deploy SSH key is scoped in the server's `authorized_keys` to only run that one script (`command="/opt/garage/deploy.sh"`), stored as GitHub secrets `DEPLOY_HOST`/`DEPLOY_SSH_KEY`. `deploy.sh` is versioned in the repo and self-updates (it re-fetches itself along with the rest of the checkout), so changes to the deploy flow just need a commit to `master`.

## Plans & autonomous work

`docs/plans/` holds per-stage feature plans (`stage-N-*.md`) and cross-cutting `conventions.md` — the durable memory between tasks: decisions and contracts (components, utils, routes, API shapes) that later issues rely on. When a task makes such a decision or creates such a contract, update the relevant plan in the same commit (format in `docs/plans/README.md`). A task is done only when it matches its issue and `TZ.md`, has tests for new/changed behavior, and `npm test` + `typecheck` + `build` + `test:e2e` pass; UI tasks also need a Playwright e2e scenario with screenshots of affected screens (390px). After UI changes in an interactive session, also check the running app via Playwright MCP. `ralph/` is an autonomous loop that implements GitHub issues one at a time — see `ralph/README.md`.

## Commands

```bash
npm install                # install deps (runs `nuxt prepare` via postinstall)
npm run dev                # dev server on http://localhost:3000
npm run build               # production build
npm run generate             # static generation
npm run preview              # preview a production build
npm run typecheck            # nuxt typecheck (tsc) — note: nuxt.config.ts has typeCheck: false for dev/build, so this must be run manually
npm run db:generate          # drizzle-kit generate — create a migration from schema.ts changes
npm run db:migrate           # apply migrations (tsx server/database/migrate.ts)
npm run db:seed              # seed default categories (tsx server/database/seed.ts)
```

There is no test suite and no lint script configured in `package.json` as of this writing — don't assume `npm test` or `npm run lint` exist; check `package.json` before relying on either.

Setup from scratch: copy `.env.example` to `.env` (needs `NUXT_SESSION_PASSWORD`, 32+ random chars, and `DB_FILE_NAME`), then `db:generate` → `db:migrate` → `db:seed`.

Since `typecheck`/`build` are not run automatically during dev, run both after non-trivial changes to catch type errors before considering work done — the codebase has previously shipped without this having been verified.

## Architecture

**Data flow / layering:** `pages/*.vue` → `composables/use*.ts` (client-side state + `$fetch` calls, each holds its own `useState` slice, e.g. `useCars`, `useEntries`, `useCategories`) → `server/api/**/*.ts` (Nitro event handlers) → `server/database/index.ts` (single shared `db` + `schema` export, drizzle over better-sqlite3) → SQLite file at `DB_FILE_NAME`.

**Shared validation/types (`shared/`):** Zod schemas in `shared/schemas/*.ts` are imported by both server API handlers (`readValidatedBody(event, xSchema.parse)`) and client forms/composables — this is the single source of truth for input shape, enums (e.g. entry `type`, `entryTypeLabels` for Russian display strings), and defaults. `shared/types.ts` holds the TS interfaces for entities as returned by the API (joined/denormalized shapes like `CarDetail` with `members`, `Entry` with nested `category`). When adding a field, update the Drizzle table in `server/database/schema.ts`, the matching Zod schema, and the type in `shared/types.ts` together. Note the `~~/shared/...` import alias (Nuxt srcDir-relative root), used from both `server/` and app code.

**Auth & access control:** `nuxt-auth-utils` handles cookie sessions (`useUserSession()` client-side, `requireUserSession(event)` / `getUserSession(event)` server-side). Every non-auth API route must resolve the car in question and call `requireCarAccess(carId, userId)` from `server/utils/access.ts`, which throws 404 (car not found) or 403 (not owner/member) and returns `{ car, role }`. This is the only access-control gate — there's no per-route middleware doing it, so new routes must call it explicitly. Client-side route protection is per-page: pages call `definePageMeta({ middleware: 'auth' })` individually (see `middleware/auth.ts`) rather than a global middleware; new protected pages need this line added.

**Database:** `server/database/schema.ts` defines all tables and their `relations()` (users, cars, carMembers, categories, entries, reminders) — read this file first to understand entity relationships (e.g. `entries.categoryId` is nullable, `reminders.lastEntryId` links back to the entry a reminder's next-due calc is based on). `server/database/index.ts` opens the SQLite connection once per process (WAL mode, foreign keys on) and exports `db`/`schema` for reuse everywhere. `migrate.ts` and `seed.ts` open their *own* separate connections and are meant to be run as standalone scripts (`tsx`), not imported into the app.

**Push notifications:** browser subscribes via `composables/usePush.ts` (UI: `components/PushSettings.vue` on `/cars`) → `POST /api/push/subscribe` → `push_subscriptions` table. `server/utils/push.ts` has `sendPushToUser` (deletes subscriptions on 404/410) and `notifyDueReminders({ carId? })`, which uses `getReminderStatus` and dedupes via the `reminder_notifications` table (unique on reminder+user+status+dueKey). It runs from the Nitro scheduled task `server/tasks/reminders/notify.ts` (daily 06:00 UTC, `nitro.scheduledTasks`) and fire-and-forget after `POST /api/cars/[id]/entries` raises the car's mileage. Needs `NUXT_PUBLIC_VAPID_PUBLIC_KEY`/`NUXT_VAPID_PRIVATE_KEY`/`NUXT_VAPID_SUBJECT`; without them push is silently disabled. iOS only supports it in the installed PWA (16.4+).

**Reminders/analytics status:** per `TZ.md`/`README.md`, sections 3.1–3.2 (cars, entries journal) are implemented; reminders (3.3) and analytics dashboard (3.4) are not yet built — their planned API routes (`/api/cars/[id]/reminders`, `/api/reminders/[id]`, `/api/cars/[id]/analytics`) don't exist yet even though the `reminders` table is already in the schema. Don't assume routes from the TZ's "Основные API-роуты" section exist without checking `server/api/`.
