# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Гараж" — an npm-workspaces monorepo (Nuxt SPA + Nitro API) for tracking car maintenance/expenses (repairs, part replacements, purchases, scheduled maintenance) with reminders and spending analytics. Personal/pet project, Russian-language UI. Full spec is in `TZ.md` — read it for feature scope, data model rationale, and what's explicitly out of scope (multi-currency, email notifications, attachments, etc.). `README.md` has setup/run instructions and a running "known limitations" note — keep both in sync when scope changes.

Monorepo (stage 1 of `docs/plans/mobile-stores.md`), three workspaces:

- `apps/web` (`@garage/web`) — Nuxt 3 SPA (`ssr: false`, built with `nuxt generate`): Vue 3 Composition API + TypeScript (strict) + Tailwind + Onest/JetBrains Mono (`@fontsource`) + `lucide-vue-next` icons + chart.js/vue-chartjs + `@vite-pwa/nuxt` (installable PWA — manifest/icons generated from `public/logo.svg` via `pwa-assets.config.ts`, no offline API caching; custom service worker in `service-worker/sw.ts` via `injectManifest`, handles Web Push).
- `apps/api` (`@garage/api`) — standalone Nitro (no Nuxt; `nitro.config.ts`, `srcDir: 'server'`) + Drizzle ORM over SQLite (`better-sqlite3`) + h3 cookie session and `jose` JWT access tokens for auth + `web-push` (VAPID) for reminder notifications. Why Nitro and not Hono/Fastify: the existing routes keep `defineEventHandler`, auto-imports, file-based routing and scheduled tasks unchanged.
- `packages/shared` (`@garage/shared`) — Zod schemas, entity types, pure utils; TS sources consumed directly (no build step), imported as `@garage/shared/schemas/car`, `@garage/shared/types`, `@garage/shared/utils/reminderStatus`.

Root `package.json` only holds workspace config, shared dev tooling (vitest, prettier, husky) and script proxies.

## Branching & deploy

`master` is production; day-to-day work happens on `dev`, merged into `master` when ready to ship. Pushing to `master` triggers `.github/workflows/deploy.yml`, which runs two jobs: **build** (GitHub runner builds the Docker image — one image with both apps; the API serves the generated web client from `NUXT_WEB_DIST_DIR`, so prod stays one container / one origin / port 3000 — and pushes it to `ghcr.io/dchakin/garage-nuxt-project:latest` + a `:<sha>` tag, with buildx layer caching via `type=gha`) and **deploy** (SSHes into the prod server, root@195.19.209.224, triggering `/opt/garage/deploy.sh`). The image is built with `GARAGE_EXCLUDE_DEV_PAGES=1`, which drops the `/dev/ui` component showcase (`apps/web/nuxt.config.ts` `ignore`). The image is never built on the prod server — `deploy.sh` only does `git reset --hard origin/master` + `docker compose pull` + `docker compose up -d`, so the SSH session lasts seconds instead of minutes. `docker-compose.yml` references the GHCR image by tag and has no `build:` section; a local `docker compose build` is therefore not part of the deploy path. The server must be logged in to GHCR once (`docker login ghcr.io` with a PAT that has `read:packages`) unless the package is public. The deploy SSH key is scoped in the server's `authorized_keys` to only run that one script (`command="/opt/garage/deploy.sh"`), stored as GitHub secrets `DEPLOY_HOST`/`DEPLOY_SSH_KEY`. `deploy.sh` is versioned in the repo and self-updates (it re-fetches itself along with the rest of the checkout), so changes to the deploy flow just need a commit to `master`.

## Plans & autonomous work

`docs/plans/conventions.md` is the durable memory between tasks: shared rules, pitfalls, and decisions/contracts (components, utils, routes, API shapes) that later issues rely on. Per-feature scope lives in the GitHub issue text, UI in `design/garage.pen`. When a task makes such a decision or creates such a contract, update `conventions.md` in the same commit (format in its header). `docs/plans/` may also hold roadmaps for larger directions: `mobile-stores.md` — publishing to App Store/Google Play via Capacitor; its stage-0 rules apply to current work (keep the client SPA-compatible, no SSR dependencies). A task is done only when it matches its issue and `TZ.md`, has tests for new/changed behavior, and `npm test` + `typecheck` + `build` + `test:e2e` pass; UI tasks also need a Playwright e2e scenario with screenshots of affected screens (390px). After UI changes in an interactive session, also check the running app via Playwright MCP. `ralph/` is an autonomous loop that implements GitHub issues one at a time — see `ralph/README.md`.

**Design fixes:** «приступи к пункту №X» (without other context) means item X of `docs/plans/design-ux-fixes.md` — read its «Общие правила» and only item X, edit `design/garage.pen` via Pencil MCP (no code changes, no tests/build needed), then mark the item ✅ in the file's status table. These are design-only tasks; the code-task definition of done above does not apply.

## Commands

```bash
npm install                # install deps for all workspaces (postinstall runs `nuxt prepare` / `nitropack prepare`)
npm run dev                # api (http://localhost:3001) + web (http://localhost:3000, proxies /api to the api)
npm run dev:api            # only the API
npm run dev:web            # only the client
npm run build              # build both: apps/api/.output (Nitro) and apps/web/.output/public (nuxt generate)
npm run typecheck          # every workspace: tsc (api, shared) and nuxt typecheck (web) — web has typeCheck: false in nuxt.config.ts, so run manually
npm run db:generate        # drizzle-kit generate — create a migration from schema.ts changes (runs in apps/api)
npm run db:migrate         # apply migrations (tsx server/database/migrate.ts)
npm run db:seed            # seed default categories (tsx server/database/seed.ts)
npm run format               # prettier --write . (форматирует весь репозиторий)
npm run format:check         # prettier --check . (проверка без записи)
npm test                     # vitest run — projects api, web, shared (see Testing below)
npm run test:watch           # vitest in watch mode
npm run test:e2e             # playwright test — e2e по собранному приложению (сначала npm run build; первый раз npx playwright install chromium)
```

There is no lint script configured in `package.json` as of this writing — don't assume `npm run lint` exists; check `package.json` before relying on it.

Setup from scratch: copy `apps/api/.env.example` to `apps/api/.env` (needs `NUXT_SESSION_PASSWORD`, 32+ random chars, and `DB_FILE_NAME`), then `db:migrate` → `db:seed` (`db:generate` only after `schema.ts` changes). `apps/web/.env.example` is optional (API proxy target, `NUXT_PUBLIC_API_BASE`, `NUXT_PUBLIC_AUTH_MODE`).

Since `typecheck`/`build` are not run automatically during dev, run both after non-trivial changes to catch type errors before considering work done — the codebase has previously shipped without this having been verified.

## Conventions

- **Do not edit by hand** generated files: `**/.nuxt/**`, `**/.nitro/**`, `**/.output/**`, `apps/web/public/` icons generated from `public/logo.svg` (change the source/`pwa-assets.config.ts` instead), and applied Drizzle migrations (add a new one via `npm run db:generate`).
- Node >= 22, npm >= 11 (`engines` in `package.json`).
- Schema changes go through all layers together: `apps/api/server/database/schema.ts` → Zod schema in `packages/shared/schemas/` → `packages/shared/types.ts` → migration.
- **The client must stay SPA/Capacitor-compatible** (`docs/plans/mobile-stores.md`, stage 0): no SSR-only APIs (`useFetch`/`useAsyncData` with SSR, `useRequestFetch`, `import.meta.server`, `useRequestHeaders`) in `apps/web`. Data comes from composables + `$fetch`, which `plugins/api.ts` swaps for the API client (base URL, Bearer, 401/refresh).
- API env vars keep the `NUXT_` prefix (`runtimeConfig.nitro.envPrefix` in `nitro.config.ts`), so the server `.env` and docker-compose did not change when the apps were split.
- Prefer `<script setup lang="ts">` with the Composition API; no Options API.
- **Prettier** (`.prettierrc.json`: без `;`, одинарные кавычки, trailing comma, printWidth 100; исключения в `.prettierignore`) — единый форматтер. **Husky** + **lint-staged**: pre-commit hook (`.husky/pre-commit`) запускает `prettier --write` на staged-файлах, поэтому вручную форматировать не нужно; не обходи хук (`--no-verify`). Хуки ставятся скриптом `prepare` при `npm install`. Линтера нет — run `typecheck` before committing.

### Naming

- Files follow Nuxt conventions: components `PascalCase.vue`, composables `useXxx.ts`, pages kebab-case, API routes `name.method.ts` under `apps/api/server/api/`, utils `camelCase.ts`.
- Functions describe an action (`createEntryWithReminders`); variables are meaningful (`carId`, not `id`/`x`/`data`).
- Use Zod enums / union types instead of bare strings (`EntryType`, not `'repair'` scattered around); extract magic numbers into named constants (`MAX_MILEAGE_KM`).

### Size & refactoring

- File > 250 lines → decompose before adding code (split large pages into components/composables).
- Function > 40 lines → extract private helpers.
- Nesting > 3 levels → refactor.
- Before adding code to a large file, decompose it first; keep tests green at every refactoring step.

## Token economy

- `git diff` always with `--unified=0`
- `git log` always with `--oneline -10`
- `gh issue list` always with `--json number,title`
- `npm test` always with `--silent` (when the script exists)
- `npm run typecheck 2>&1 | tail -20`

## Keeping documentation up to date

Documentation must not fall behind the code: a discrepancy is a bug. In the same change:

- stack, framework or major version change → update this file and `README.md`;
- new/changed commands, scripts, ports or env variables → update `package.json` (`scripts`), `.env.example`, `README.md` and the Commands section here;
- new/renamed API routes, composables, components or tables → update the Architecture section here and `TZ.md` if scope changed;
- decisions and contracts that later tasks rely on → `docs/plans/conventions.md`;
- deploy flow changes (`Dockerfile`, `docker-compose.yml`, `deploy.sh`, workflow) → update "Branching & deploy" here.

## Architecture

**Data flow / layering:** `apps/web/pages/*.vue` → `composables/use*.ts` (client-side state + `$fetch` calls, each holds its own `useState` slice, e.g. `useCars`, `useEntries`, `useCategories`, `useAuth`) → HTTP `/api/**` → `apps/api/server/api/**/*.ts` (Nitro event handlers) → `server/database/index.ts` (single shared `db` + `schema` export, drizzle over better-sqlite3) → SQLite file at `DB_FILE_NAME`. Car screens (`/cars/[id]` «Обзор», `journal`, `reminders`, `expenses`) use `layouts/car.vue` (AppBar + TabBar with the reminders badge + car switcher sheet `components/car/CarSwitcherSheet.vue`); the open car and badge live in `useCurrentCar()`, the last opened car in `useLastCar()` (`localStorage['garage:lastCarId']`, `/` redirects to it) — routes and contracts in `docs/plans/conventions.md` «Маршруты и навигация». In dev the Nuxt dev server proxies `/api` to the API (`nitro.devProxy`); in prod the API process serves the generated client itself (`server/routes/[...path].get.ts`, `NUXT_WEB_DIST_DIR`), so the browser always sees one origin. Mobile builds set `NUXT_PUBLIC_API_BASE` to the prod URL instead.

**Shared validation/types (`packages/shared`):** Zod schemas in `schemas/*.ts` are imported by both server API handlers (`readValidatedBody(event, xSchema.parse)`) and client forms/composables — this is the single source of truth for input shape, enums (e.g. entry `type`, `entryTypeLabels` for Russian display strings), and defaults. `types.ts` holds the TS interfaces for entities as returned by the API (joined/denormalized shapes like `CarDetail` with `members`, `Entry` with nested `category`, plus `AuthUser`/`AuthTokens`/`AuthResponse`). When adding a field, update the Drizzle table in `apps/api/server/database/schema.ts`, the matching Zod schema, and the type in `types.ts` together. Import via the package name: `@garage/shared/schemas/...`, `@garage/shared/types`, `@garage/shared/utils/...`.

**Auth & access control:** two interchangeable credentials, both resolved by `requireAuth(event)` (`apps/api/server/utils/auth.ts`): the signed httpOnly cookie session (h3 `useSession`; cookie name `nuxt-session` kept from nuxt-auth-utils so old sessions stay valid; web) or `Authorization: Bearer <access JWT>` (mobile). `login`/`register` take `authMode: 'cookie' | 'token'`; in `token` mode the response carries `tokens` (access 15 min + one-time refresh stored SHA-256-hashed in `refresh_tokens`) and no cookie. `POST /api/auth/refresh` rotates the pair; `logout` revokes a posted refresh token. `GET /api/auth/session` answers 401 for a present-but-invalid Bearer (so the client refreshes) and `null` for no credentials. Passwords: scrypt via `@adonisjs/hash` (same format as before the split). Every non-auth API route must resolve the car in question and call `requireCarAccess(carId, userId)` from `server/utils/access.ts`, which throws 404 (car not found) or 403 (not owner/member) and returns `{ car, role }`. This is the only access-control gate — there's no per-route middleware doing it, so new routes must call it explicitly. CORS (`server/middleware/cors.ts`) allows the Capacitor origins plus `NUXT_CORS_ORIGINS`. Client side: `useAuth()` (user, loggedIn, login/register/logout/clear) replaces nuxt-auth-utils' `useUserSession`; `plugins/api.ts` builds the API client (`utils/apiClient.ts`: baseURL, Bearer, one refresh+retry on 401) and loads the session before the first navigation; route protection is per-page: pages call `definePageMeta({ middleware: 'auth' })` individually (see `middleware/auth.ts`), new protected pages need this line.

**Database:** `apps/api/server/database/schema.ts` defines all tables and their `relations()` (users, cars, carMembers, categories, entries, reminders, pushSubscriptions, reminderNotifications, refreshTokens) — read this file first to understand entity relationships (e.g. `entries.categoryId` is nullable, `categories.carId` is null for the seeded standard categories and set for a car's own ones, `reminders.lastEntryId` links back to the entry a reminder's next-due calc is based on). `server/database/index.ts` opens the SQLite connection once per process (WAL mode, foreign keys on) and exports `db`/`schema` for reuse everywhere. `migrate.ts` and `seed.ts` open their _own_ separate connections and are meant to be run as standalone scripts (`tsx`), not imported into the app.

**Design tokens & theme:** all colors come from `apps/web/assets/css/tokens.css` (values from `design/garage.pen`, `:root` = light, `:root.dark` = dark); `apps/web/tailwind.config.ts` replaces Tailwind's palette with those tokens (`bg-surface`, `text-text-2`, `bg-accent`…), so `slate-*`/`indigo-*`/hex are unavailable by design. Theme (`system`/`light`/`dark`) is `useTheme()` (`composables/useTheme.ts`, stored in `localStorage['garage:theme']`); an inline `<head>` script built by `theme/initScript.ts` sets the `dark` class and `theme-color` before the bundle loads (no flash). Fonts (Onest Variable / JetBrains Mono for plate & VIN) are bundled via `@fontsource` — no CDN; Tailwind's font-size scale is replaced by the mockup's (`text-h1`, `text-body`, …). UI kit components live in `apps/web/components/ui/` (`<UiButton>`, `<UiField>`…; contracts in `docs/plans/conventions.md` «UI»), showcased at `/dev/ui` (dev/e2e builds only) and unit-tested in `apps/web/tests/ui/`. Icons are `lucide-vue-next` components only — emoji in `apps/web` fail `tests/noEmoji.test.ts`. Details — `docs/plans/conventions.md` «UI».

**Push notifications:** browser subscribes via `apps/web/composables/usePush.ts` (VAPID public key from `GET /api/push/config`; UI: `components/PushSettings.vue` on `/cars`) → `POST /api/push/subscribe` → `push_subscriptions` table. `server/utils/push.ts` has `sendPushToUser` (deletes subscriptions on 404/410) and `notifyDueReminders({ carId? })`, which uses `getReminderStatus` and dedupes via the `reminder_notifications` table (unique on reminder+user+status+dueKey). It runs from the Nitro scheduled task `server/tasks/reminders/notify.ts` (daily 06:00 UTC, `nitro.scheduledTasks`) and fire-and-forget after `POST /api/cars/[id]/entries` raises the car's mileage. Needs `NUXT_PUBLIC_VAPID_PUBLIC_KEY`/`NUXT_VAPID_PRIVATE_KEY`/`NUXT_VAPID_SUBJECT`; without them push is silently disabled. iOS only supports it in the installed PWA (16.4+).

**Testing:** root `vitest.config.ts` lists three projects, each with its own config: `apps/api` (node; `tests/unit`, `tests/server`, `tests/integration`), `apps/web` (happy-dom + `@vitejs/plugin-vue`; `tests/**` — client utils such as `apiClient`/`authTokens`, UI-kit components in `tests/ui/`) and `packages/shared` (node; Zod schemas and pure utils). `apps/api/tests/setup/node-globals.ts` puts h3's `createError` on `globalThis` so `server/utils/*.ts` files (written assuming Nitro's auto-imports) can be imported directly in tests; new utils should prefer explicit imports (`h3`, `drizzle-orm`) and take config as arguments (see `tokens.ts`). `tests/helpers/testDb.ts` creates a throwaway SQLite file per test file (migrated + seeded), since `server/database/index.ts` opens its connection from `DB_FILE_NAME` at import time — set that env var and dynamically `import('../../server/database')` _after_ setting it, don't use a static top-level import. API route handlers (`server/api/**`) rely on Nitro auto-imports and `useRuntimeConfig` that can't be stubbed directly, so those are tested over HTTP against a real `nitropack dev` process started by `tests/helpers/apiServer.ts` (`startApiServer(env)` → own port + env, `createHttpClient(baseUrl)`); gotchas there: it listens on `127.0.0.1` (Node on this machine gets EACCES connecting to `::1`), `NODE_ENV`/`VITEST*` are stripped from the child env (with them `nitropack dev` silently does not listen), and `fileParallelism: false` in the api project because parallel dev servers fight over `.nitro`. Session cookies are stateless (signed, no server-side store), so "logged out" must be tested by resending the _expired_ cookie the logout response set, not the original login cookie. `computeNextDue` builds dates via local `Date`/`toISOString()`, so date-related tests must pin `TZ=UTC` (set in each project's `vitest.config.ts` and in the spawned server's env) or results shift by a day depending on the machine's timezone. E2E: Playwright (`playwright.config.ts` at the root, `tests/e2e/`) runs against the _built_ app — `tests/e2e/server.mjs` migrates+seeds a temp SQLite and imports `apps/api/.output/server/index.mjs` with `NUXT_WEB_DIST_DIR` on port 3100 (`E2E_PORT`); specs import `test` from `tests/e2e/helpers/test.ts` (fixed clock `2026-10-10T09:41+03:00`) and take screenshots with `snap()` into `test-results/screens/`. Details in `docs/plans/conventions.md` «E2E».

**Reminders/analytics status:** per `TZ.md`/`README.md`, sections 3.1–3.2 (cars, entries journal) are implemented; reminders (3.3) and analytics dashboard (3.4) are not yet built — their planned API routes (`/api/cars/[id]/reminders`, `/api/reminders/[id]`, `/api/cars/[id]/analytics`) don't exist yet even though the `reminders` table is already in the schema. Don't assume routes from the TZ's "Основные API-роуты" section exist without checking `server/api/`.
