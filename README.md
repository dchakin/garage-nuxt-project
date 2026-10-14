# Гараж — учёт обслуживания и трат на автомобиль

Монорепа (npm workspaces): клиент — Nuxt 3 SPA (`apps/web`), API — Nitro + Drizzle (SQLite) (`apps/api`), общие Zod-схемы и типы — `packages/shared`. TypeScript и Tailwind везде, где есть UI; шрифты Onest и JetBrains Mono — из бандла (`@fontsource`), иконки — `lucide-vue-next`.

Реализовано в этой версии (v1, по этапам 1–3 из ТЗ):

- Авторизация (регистрация/логин/логаут): сессии на куках для веба, access + refresh токены (`Authorization: Bearer`) для будущего мобильного клиента.
- CRUD автомобилей, список, карточка авто, приглашение участников по email.
- Журнал записей: создание/просмотр/редактирование/удаление, фильтры по типу/категории/датам, сортировка по дате/пробегу.
- Категории (сидятся по умолчанию).
- Напоминания: создание/редактирование/удаление, привязка к последней записи журнала (авто-расчёт следующей даты/пробега по интервалу), статусы «скоро/просрочено/ок», бейдж-уведомление на карточке авто.
- PWA: манифест и свой service worker (`@vite-pwa/nuxt`, `apps/web/service-worker/sw.ts`), браузер предлагает установить приложение на главный экран; иконки сгенерированы из `apps/web/public/logo.svg`.
- Push-уведомления о напоминаниях (Web Push, VAPID): включаются кнопкой на странице «Мои автомобили». Проверка идёт раз в день в 09:00 МСК (Nitro scheduled task) и сразу после записи с новым пробегом. Одно уведомление на каждый статус «скоро»/«просрочено» по каждому сроку.

Пока не реализовано (следующие этапы): аналитика/графики, вложения к записям.

## Запуск локально

1. Установить зависимости (одна команда на всю монорепу):

   ```bash
   npm install
   ```

2. Скопировать `apps/api/.env.example` в `apps/api/.env` и задать `NUXT_SESSION_PASSWORD` (любая случайная строка от 32 символов). Из него же выводится ключ подписи access-токенов:

   ```bash
   cp apps/api/.env.example apps/api/.env
   ```

   Для push-уведомлений сгенерировать VAPID-ключи и вписать их в `NUXT_PUBLIC_VAPID_PUBLIC_KEY` / `NUXT_VAPID_PRIVATE_KEY` (без них push просто отключён):

   ```bash
   npx web-push generate-vapid-keys
   ```

   `apps/web/.env.example` копировать не обязательно: значения по умолчанию подходят для локальной разработки.

3. Применить миграции БД и засеять дефолтные категории (из корня; `db:generate` нужен только после изменения `schema.ts`):

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. Прогнать тесты (Vitest — юнит-тесты логики, Zod-схем и клиента API + интеграционные тесты API через реальный dev-сервер Nitro):

   ```bash
   npm test
   ```

5. Запустить API и клиент одной командой:

   ```bash
   npm run dev
   ```

   Клиент — http://localhost:3000, API — http://localhost:3001. Браузер ходит только на клиент: dev-сервер Nuxt проксирует `/api/**` на API (`nitro.devProxy`), так что cookie-сессия работает без CORS. По отдельности: `npm run dev:api`, `npm run dev:web`.

Первый экран — регистрация, после неё сразу открывается список автомобилей.

## Сборка и запуск как в проде

```bash
npm run build   # apps/api → .output (Nitro), apps/web → .output/public (nuxt generate)
NUXT_WEB_DIST_DIR=apps/web/.output/public node apps/api/.output/server/index.mjs
```

API раздаёт собранный клиент (SPA-фолбэк на `200.html`), поэтому в проде один контейнер и один origin — именно так собирает `Dockerfile`. Клиент можно раздавать и отдельно любым веб-сервером: тогда задайте `NUXT_PUBLIC_API_BASE` при сборке и `NUXT_CORS_ORIGINS` на API.

### Переменные окружения

| Приложение | Переменная                                                                     | Назначение                                                                                                                                         |
| ---------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| api        | `NUXT_SESSION_PASSWORD`                                                        | секрет сессии и ключ access-токенов, 32+ символов                                                                                                  |
| api        | `DB_FILE_NAME`                                                                 | путь к файлу SQLite                                                                                                                                |
| api        | `NUXT_PUBLIC_VAPID_PUBLIC_KEY`, `NUXT_VAPID_PRIVATE_KEY`, `NUXT_VAPID_SUBJECT` | Web Push; публичный ключ клиент получает от `GET /api/push/config`                                                                                 |
| api        | `NUXT_SMTP_URL`, `NUXT_MAIL_FROM`, `NUXT_APP_URL`, `NUXT_MAIL_OUTBOX_DIR`      | почта: SMTP-строка, отправитель, база ссылок в письмах; outbox — писать письма JSON-файлами вместо SMTP (тесты). Без SMTP и outbox почта выключена |
| api        | `NUXT_CORS_ORIGINS`                                                            | доп. origin'ы для CORS через запятую (origin'ы Capacitor разрешены всегда)                                                                         |
| api        | `NUXT_WEB_DIST_DIR`                                                            | каталог со сборкой клиента; если задан, API раздаёт и статику                                                                                      |
| web        | `NUXT_API_PROXY_TARGET`                                                        | куда `nuxt dev` проксирует `/api` (по умолчанию `http://127.0.0.1:3001/api`)                                                                       |
| web        | `NUXT_PUBLIC_API_BASE`                                                         | базовый URL API; пусто — тот же origin (веб), абсолютный адрес — мобильная сборка. Запекается при сборке                                           |
| web        | `NUXT_PUBLIC_AUTH_MODE`                                                        | `cookie` (веб, по умолчанию) или `token` (мобильный клиент). Запекается при сборке                                                                 |

## Форматирование

Код форматируется Prettier (`npm run format`, проверка — `npm run format:check`). Husky при коммите запускает `lint-staged` и форматирует staged-файлы автоматически; хуки устанавливаются при `npm install` (скрипт `prepare`).

## Структура

```
apps/
  api/                    — @garage/api: Nitro без Nuxt
    server/
      api/                — API-роуты (auth, cars, entries, reminders, categories, push, health)
      database/           — схема Drizzle, миграции, seed
      middleware/         — cors.ts — CORS для origin'ов Capacitor и NUXT_CORS_ORIGINS
      routes/             — [...path].get.ts — раздача собранного клиента (NUXT_WEB_DIST_DIR)
      tasks/              — reminders/notify.ts — ежедневная рассылка push о напоминаниях
      utils/              — auth.ts (cookie + Bearer), tokens.ts (JWT/refresh), password.ts, access.ts
                            (доступ к авто), reminderDue.ts, push.ts, webStatic.ts
    tests/                — unit, server (на временной SQLite), integration (реальный dev-сервер)
  web/                    — @garage/web: Nuxt SPA (ssr: false)
    pages/ components/ composables/ middleware/ plugins/ layouts/
    utils/                — apiClient.ts (baseURL, Bearer, refresh), authTokens.ts (хранилище токенов)
    service-worker/       — sw.ts — service worker (прекэш + push)
    tests/                — клиентские юнит-тесты (happy-dom)
packages/
  shared/                 — @garage/shared: schemas/ (Zod), types.ts, utils/ (reminderStatus.ts)
```

Импорт общего кода: `@garage/shared/schemas/car`, `@garage/shared/types`, `@garage/shared/utils/reminderStatus`.

## Тесты

`npm test` (Vitest, три проекта: `api`, `web`, `shared`) — юнит-тесты чистой логики (`computeNextDue`, `getReminderStatus`, токены, раздача статики, клиент API, Zod-схемы), тесты `requireCarAccess`/`notifyDueReminders` на временной SQLite-БД и интеграционные тесты API (`apps/api/tests/integration`) через реальный dev-сервер Nitro (`tests/helpers/apiServer.ts`). `npm run typecheck` гоняется отдельно (см. `CLAUDE.md`). E2E в браузере — Playwright по собранному приложению на временной SQLite (`tests/e2e`, первый раз нужен `npx playwright install chromium`):

```bash
npm run build && npm run test:e2e   # скриншоты экранов — в test-results/screens/
```

Компоненты UI-кита (`apps/web/components/ui/`) собраны на витрине `/dev/ui` (в `npm run dev` и e2e; в Docker-образ не попадает — сборка с `GARAGE_EXCLUDE_DEV_PAGES=1`).

## Известные ограничения этой версии

- Вложения (фото чеков) и аналитика — не реализованы, это следующие этапы по ТЗ.
- Push на iPhone работает только в установленном на экран «Домой» приложении (iOS 16.4+), в обычной вкладке Safari — нет. Нужен HTTPS (локально — `localhost`).
- Push о просроченном напоминании приходит один раз; повторных «напоминаний о напоминании» нет, пока срок не продлят.
- Мультивалютность не поддерживается (валюта хранится в записи, но конвертации нет — как и заявлено в ТЗ).
