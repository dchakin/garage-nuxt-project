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

`master` is production; day-to-day work happens on `dev`, merged into `master` when ready to ship. CI (`.github/workflows/ci.yml`: format:check, typecheck, `npm test`, build + `test:e2e`) runs on `dev` pushes and PRs and is reused by the deploy. Pushing to `master` deploys: CI → GitHub Actions builds one Docker image (API + generated web client, one origin, port 3000) → GHCR → `deploy.sh` on the server backs up the DB, pulls, restarts and health-checks it. Read `docs/deploy.md` before touching `Dockerfile`, `docker-compose.yml`, `deploy.sh` or `.github/workflows/deploy.yml`.

## Plans & autonomous work

`docs/plans/conventions.md` is the durable memory between tasks: shared rules, pitfalls, and decisions/contracts (components, utils, routes, API shapes) that later issues rely on. Per-feature scope lives in the GitHub issue text, UI in `design/garage.pen`. When a task makes such a decision or creates such a contract, update `conventions.md` in the same commit (format in its header). `docs/plans/design-audit.md` — the latest app-vs-mockup comparison (accepted deviations + per-screen differences). `docs/plans/` may also hold roadmaps for larger directions: `mobile-stores.md` — publishing to App Store/Google Play via Capacitor; its stage-0 rules apply to current work (keep the client SPA-compatible, no SSR dependencies). A task is done only when it matches its issue and `TZ.md`, has tests for new/changed behavior, and `npm test` + `typecheck` + `build` + `test:e2e` pass; UI tasks also need a Playwright e2e scenario with screenshots of affected screens (390px). After UI changes in an interactive session, also check the running app via Playwright MCP. `ralph/` is an autonomous loop that implements GitHub issues one at a time — see `ralph/README.md`.

**Design fixes:** «приступи к пункту №X» (without other context) means item X of `docs/plans/design-ux-fixes.md` — read its «Общие правила» and only item X, edit `design/garage.pen` via Pencil MCP (no code changes, no tests/build needed), then mark the item ✅ in the file's status table. These are design-only tasks; the code-task definition of done above does not apply.

## Commands

```bash
npm install                # install deps for all workspaces (postinstall runs `nuxt prepare` / `nitropack prepare`)
npm run dev                # api (http://localhost:3001) + web (http://localhost:3000, proxies /api to the api)
npm run dev:api            # only the API
npm run dev:web            # only the client
npm run build              # build both in parallel (concurrently): apps/api/.output (Nitro) and apps/web/.output/public (pwa-assets-generator regenerates icons from public/logo.svg, then nuxt generate)
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
- deploy flow changes (`Dockerfile`, `docker-compose.yml`, `deploy.sh`, workflow) → update `docs/deploy.md`.

## Architecture

**Data flow / layering:** `apps/web/pages/*.vue` → `composables/use*.ts` (client-side state + `$fetch` calls, each holds its own `useState` slice, e.g. `useCars`, `useEntries`, `useCategories`, `useAuth`) → HTTP `/api/**` → `apps/api/server/api/**/*.ts` (Nitro event handlers) → `server/database/index.ts` (single shared `db` + `schema` export, drizzle over better-sqlite3) → SQLite file at `DB_FILE_NAME`. Car screens (`/cars/[id]` «Обзор», `journal`, `reminders`, `expenses`) use `layouts/car.vue` (AppBar + TabBar with the reminders badge + car switcher sheet `components/car/CarSwitcherSheet.vue`); the open car and badge live in `useCurrentCar()`, the last opened car in `useLastCar()` (`localStorage['garage:lastCarId']`, `/` redirects to it) — routes and contracts in `docs/plans/conventions.md` «Маршруты и навигация». In dev the Nuxt dev server proxies `/api` to the API (`nitro.devProxy`); in prod the API process serves the generated client itself (`server/routes/[...path].get.ts`, `NUXT_WEB_DIST_DIR`), so the browser always sees one origin. Mobile builds set `NUXT_PUBLIC_API_BASE` to the prod URL instead.

**Shared validation/types (`packages/shared`):** Zod schemas in `schemas/*.ts` are imported by both server API handlers (`readValidatedBody(event, xSchema.parse)`) and client forms/composables — this is the single source of truth for input shape, enums (e.g. entry `type`, `entryTypeLabels` for Russian display strings), and defaults. `types.ts` holds the TS interfaces for entities as returned by the API (joined/denormalized shapes like `CarDetail` with `members`, `Entry` with nested `category`, plus `AuthUser`/`AuthTokens`/`AuthResponse`). When adding a field, update the Drizzle table in `apps/api/server/database/schema.ts`, the matching Zod schema, and the type in `types.ts` together. Import via the package name: `@garage/shared/schemas/...`, `@garage/shared/types`, `@garage/shared/utils/...`.

**Auth & access control:** two interchangeable credentials, both resolved by `requireAuth(event)` (`apps/api/server/utils/auth.ts`): the signed httpOnly cookie session (h3 `useSession`; cookie name `nuxt-session` kept from nuxt-auth-utils so old sessions stay valid; web) or `Authorization: Bearer <access JWT>` (mobile). `login`/`register` take `authMode: 'cookie' | 'token'`; in `token` mode the response carries `tokens` (access 15 min + one-time refresh stored SHA-256-hashed in `refresh_tokens`) and no cookie. `POST /api/auth/refresh` rotates the pair; `logout` revokes a posted refresh token. `GET /api/auth/session` answers 401 for a present-but-invalid Bearer (so the client refreshes) and `null` for no credentials. Passwords: scrypt via `@adonisjs/hash` (same format as before the split). Every non-auth API route must resolve the car in question and call `requireCarAccess(carId, userId)` from `server/utils/access.ts`, which throws 404 (car not found) or 403 (not owner/member) and returns `{ car, role }`. This is the only access-control gate — there's no per-route middleware doing it, so new routes must call it explicitly. CORS (`server/middleware/cors.ts`) allows the Capacitor origins plus `NUXT_CORS_ORIGINS`. Client side: `useAuth()` (user, loggedIn, login/register/logout/clear) replaces nuxt-auth-utils' `useUserSession`; `plugins/api.ts` builds the API client (`utils/apiClient.ts`: baseURL, Bearer, one refresh+retry on 401) and loads the session before the first navigation; route protection is per-page: pages call `definePageMeta({ middleware: 'auth' })` individually (see `middleware/auth.ts`), new protected pages need this line.

**Database:** `apps/api/server/database/schema.ts` defines all tables and their `relations()` (users, cars, carMembers, categories, entries, reminders, pushSubscriptions, reminderNotifications, refreshTokens) — read this file first to understand entity relationships (e.g. `entries.categoryId` is nullable, `categories.carId` is null for the seeded standard categories and set for a car's own ones, `reminders.lastEntryId` links back to the entry a reminder's next-due calc is based on). `server/database/index.ts` opens the SQLite connection once per process (WAL mode, foreign keys on) and exports `db`/`schema` for reuse everywhere. `migrate.ts` and `seed.ts` open their _own_ separate connections and are meant to be run as standalone scripts (`tsx`), not imported into the app.

**Design tokens & theme:** all colors come from `apps/web/assets/css/tokens.css` (values from `design/garage.pen`, `:root` = light, `:root.dark` = dark); `apps/web/tailwind.config.ts` replaces Tailwind's palette and font-size scale with the mockup's (`bg-surface`, `text-text-2`, `text-h1`…), so `slate-*`/`indigo-*`/hex are unavailable by design. Theme is `useTheme()` (`localStorage['garage:theme']`, inline `<head>` script from `theme/initScript.ts` prevents a flash). UI kit — `apps/web/components/ui/` (`<UiButton>`, `<UiField>`…), showcased at `/dev/ui` (dev/e2e builds only). Icons are `lucide-vue-next` only — emoji in `apps/web` fail `tests/noEmoji.test.ts`. Component contracts, fonts, formatting rules — `docs/plans/conventions.md` «UI».

**Push notifications:** `composables/usePush.ts` → `POST /api/push/subscribe` → `push_subscriptions`. `server/utils/push.ts` `notifyDueReminders({ carId? })` dedupes via `reminder_notifications`; runs from the scheduled task `server/tasks/reminders/notify.ts` (daily 06:00 UTC) and fire-and-forget after `POST /api/cars/[id]/entries` raises mileage. Without `NUXT_PUBLIC_VAPID_PUBLIC_KEY`/`NUXT_VAPID_PRIVATE_KEY`/`NUXT_VAPID_SUBJECT` push is silently disabled. iOS — installed PWA only (16.4+).

**Testing:** root `vitest.config.ts` → three projects: `apps/api` (node; `tests/unit`, `tests/server` — utils on a throwaway SQLite, `tests/integration` — routes over HTTP against a server built (and cached) by `tests/setup/buildApi.ts`), `apps/web` (happy-dom; UI kit in `tests/ui/`), `packages/shared` (node). E2E — Playwright against the _built_ app (`tests/e2e/`, port 3100 / `E2E_PORT`, fixed clock, `snap()` → `test-results/screens/`). Before writing API or e2e tests read `docs/plans/conventions.md` «Тесты» and «E2E»: dynamic `import` of the db after setting `DB_FILE_NAME`, `TZ=UTC`, the logout-cookie and test-server gotchas are described there.

**Feature status:** the redesign from `design/garage.pen` (stages 1–11 of `docs/plans/redesign.md`) is implemented: every screen А1–И10 exists with its loading/empty/error/offline states, both themes. Car tabs `/cars/[id]` (Обзор), `journal`, `reminders`, `expenses`; `/cars/[id]/settings`, `/cars/[id]/categories`, `/profile`, `/onboarding`, `/forgot-password`, `/reset-password`. Entries, reminders and mileage are edited in sheets mounted once in `layouts/car.vue` (`useEntrySheet`, `useEntryDetailSheet`, `useReminderSheet`, `useReminderEditSheet`, `useMileageSheet`), not on pages. API beyond CRUD: `PATCH /api/cars/[id]/mileage`, `members/[userId]`/`members/me` DELETE, `reminders/bulk`, `analytics`, car categories, `auth/me`, `auth/password`, `auth/account`, `auth/config`, `auth/password-reset(/confirm)` — contracts in `docs/plans/conventions.md` «БД и API». Remaining layout/text differences from the mockup are listed per screen in `docs/plans/design-audit.md` (stage 12 issues) — read the screen's section before touching its UI. Don't assume a route from the TZ's "Основные API-роуты" exists — check `apps/api/server/api/`.
