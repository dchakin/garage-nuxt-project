# Общие договорённости

Долговременная память проекта между задачами. `TZ.md` — что строим и зачем, GitHub issues — отдельные задачи (решения по конкретной фиче — в тексте issue), `design/garage.pen` — как выглядит UI, а этот файл — общие правила, ловушки и контракты, которые одна задача создаёт, а следующие используют.

Правила ведения:

- Разделы **«Решения»** и **«Контракты»** обновляются в том же коммите, где решение принято или контракт создан. Формат строки: `- (#N) что решили / что создали — путь, сигнатура`.
- Только то, что понадобится следующим задачам. Пересказ сделанного — в коммитах и PR, не здесь.
- Если решение меняется — исправить строку, а не дописывать противоречащую.
- Файл держать коротким: его целиком читает каждая итерация Ralph loop.

## Критерии завершения задачи

Задача завершена, только если реализация соответствует issue и `TZ.md`, на новое/изменённое поведение написаны тесты, а `npm test`, `npm run typecheck`, `npm run build` и `npm run test:e2e` проходят. Задача с UI дополнительно имеет e2e-сценарий на Playwright со скриншотами затронутых экранов.

## Тесты

- Корневой `vitest.config.ts` собирает три проекта, у каждого свой `vitest.config.ts`: `apps/api` (node: `tests/unit`, `tests/server`, `tests/integration`), `apps/web` (happy-dom: `tests/**`, клиентские утилиты вроде `apiClient`) и `packages/shared` (node: Zod-схемы и чистые утилиты).
- `apps/api/tests/server/` — прямой импорт `server/utils/*.ts` (`access.ts`, `push.ts`) на временной SQLite (`tests/helpers/testDb.ts`: файл в `os.tmpdir()`, миграции из `server/database/migrations`, сид одной категории). Старые утилиты написаны в расчёте на авто-импорты Nitro (`createError` и т.п.), поэтому `tests/setup/node-globals.ts` кладёт `createError` из `h3` в `globalThis`. Новые утилиты писать с явными импортами и конфигом в аргументах (как `tokens.ts`) — их проще тестировать. `server/database/index.ts` открывает соединение по `DB_FILE_NAME` в момент импорта — в тестах сначала выставить `process.env.DB_FILE_NAME`, затем `await import('../../server/database')` (динамически, не статическим import).
- `apps/api/tests/integration/` — API-роуты (`server/api/**`) нельзя импортировать напрямую: они используют авто-импорты Nitro и `useRuntimeConfig`. Поэтому тестируются по HTTP на реальном `nitropack dev`, который поднимает `tests/helpers/apiServer.ts` (`startApiServer(env)` → свой порт и окружение; `createHttpClient(baseUrl)` → `fetch`/`$fetch`). Ловушки: сервер слушает `127.0.0.1` (Node на этой машине получает EACCES при подключении к `::1`); из окружения потомка вырезаны `NODE_ENV` и `VITEST*` (с ними `nitropack dev` молча не слушает порт); `fileParallelism: false` в проекте api, потому что параллельные dev-серверы конфликтуют за каталог `.nitro`.
- Сессия — стейтлес подписанная кука без серверного хранилища: старая кука остаётся валидной, даже если ей уже прислали logout. Тест на logout должен переслать именно ту (уже просроченную) куку, которую вернул сам ответ `/api/auth/logout`. Bearer-режим, наоборот, проверяется на сервере: refresh-токены лежат в `refresh_tokens` и отзываются.
- Web-push мокается через `vi.mock('web-push', ...)` + `globalThis.useRuntimeConfig = () => ({...})` (единственный авто-импорт, которым пользуется `server/utils/push.ts`); `db`/`schema` — обычные импорты, стабить не нужно.
- `computeNextDue` (`server/utils/reminderDue.ts`) строит даты через `new Date(...).toISOString()` в локальном часовом поясе машины — тесты дат должны фиксировать `TZ=UTC` (сделано в каждом `vitest.config.ts` и в `env` запускаемого сервера), иначе результат зависит от TZ CI/машины разработчика.

## E2E

- (#29) Запуск: `npm run build && npm run test:e2e` (`playwright test`, конфиг `playwright.config.ts` в корне, сценарии `tests/e2e/*.spec.ts`). Сам `test:e2e` ничего не собирает: гоняется по собранному приложению. Первый раз — `npx playwright install chromium`.
- (#29) Сервер — `tests/e2e/server.mjs` (его запускает `webServer` Playwright): создаёт временную SQLite в `os.tmpdir()/garage-e2e-*` (каталоги прошлых прогонов удаляет при старте — на Windows сервер гасится без exit-хуков), применяет миграции и сид категорий (`apps/api/server/database/{migrate,seed}.ts`), затем в том же процессе импортирует `apps/api/.output/server/index.mjs` с `NUXT_WEB_DIST_DIR=apps/web/.output/public` на `127.0.0.1:${E2E_PORT:-3100}` — один origin, как на проде. БД общая на весь прогон: пользователи — с уникальным email (`createTestUser()`), один воркер. VAPID не задан — push выключен. Service worker заблокирован (`serviceWorkers: 'block'`).
- (#29) Окружение браузера: Chromium, viewport 390×844, `locale: ru-RU`, `timezoneId: Europe/Moscow`. Тесты импортируют `test`/`expect` из `tests/e2e/helpers/test.ts`, а не из `@playwright/test`: там `page.clock.setFixedTime(FIXED_NOW)`, `FIXED_NOW = '2026-10-10T09:41:00+03:00'` (таймеры идут, `Date.now()` стоит).
- (#29) `snap(page, name)` (`tests/e2e/helpers/snap.ts`) → `test-results/screens/<name>-<theme>.png`, full page, анимации выключены. Снимаются обе темы (`light`, `dark`): `emulateMedia({ colorScheme })` + класс `dark` на `<html>`, после съёмки возвращается светлая. Прочие артефакты Playwright — `test-results/artifacts/` (трейс при падении).
- (#29) Авторизация — `tests/e2e/helpers/auth.ts`: `registerViaUi`/`loginViaUi` (форма, итог — `/cars`), `registerViaApi` (быстро, кука в контексте страницы), `logout`. Поля форм ищутся по `type`, т.к. `<label>` не связаны с `input`; после редизайна форм — `getByLabel`.

## UI

- Приоритет — телефон (PWA), ширина от 360px. Десктоп не должен ломаться, но проектируем под палец.
- Пользовательские тексты — на русском, языком водителя, без терминов модели данных.
- (#31) Цвет — только токены макета («01 · Цвет»): значения в `apps/web/assets/css/tokens.css` (`:root` — светлая, `:root.dark` — тёмная), класс Tailwind = имя токена (`bg-surface`, `text-text-2`, `border-border`, `bg-accent text-on-accent`, `bg-status-overdue-soft text-status-overdue-text`, `bg-type-repair-soft`…). `tailwind.config.ts` заменяет палитру целиком — `slate-*`, `indigo-*`, `white` не генерируются. Hex/rgba вне `tokens.css` запрещены; проверка — `grep -rnE "slate-|indigo-|#[0-9a-f]{3,6}"` по `apps/web` без `node_modules`, `.nuxt`, `.output`, `tests`. Модификатор прозрачности (`bg-accent/20`) не работает (в `var()` лежит hex) — для мягких фонов есть `*-soft`. В data-URI токен не подставить: иконку рисовать маской с `background: var(--…)` (календарь в `main.css`) или компонентом Lucide.
- (#31) Цветовые токены: `bg`, `surface`, `surface-2`, `surface-3`, `border`, `border-strong`; `text`, `text-2`, `text-3`; `inverse`, `on-inverse`, `inverse-accent`, `inverse-success`; `accent`, `accent-pressed`, `accent-soft`, `accent-text`, `on-accent`, `focus-ring`; `danger|warning|success|info` + `-soft`/`-text` (у danger ещё `-pressed`, `on-danger`); статусы напоминаний `status-{overdue|soon|ok|inactive}` + `-soft`/`-text`; типы записей `type-{service|repair|replace|purchase|other}` + `-soft`; `chart-bar`, `chart-bar-muted`; `scrim`, `shadow`.
- (#31) Прочие токены («03 · Пространство и движение»): радиусы `rounded-{xs|sm|md|lg|xl|full}` = `r-*` 6/10/14/20/28/999 (шкала Tailwind заменена: поле и кнопка — `md`, карточка — `lg`, шторка/диалог — `xl`); тени `shadow-{sm|md|lg}`; отступы `p-sp-4`, `gap-sp-2`… (обычная шкала Tailwind тоже есть), `h-tap-min`, `h-control-h`; движение `duration-{fast|base|slow}`, `ease-{standard|enter|exit}`. Шрифтовая шкала `fs-*` — задача шрифтов (#33).
- (#32) Тема: `useTheme()` (`composables/useTheme.ts`) → `{ mode, resolved, setMode }`, `mode`: `'system' | 'light' | 'dark'` (типы, `themeModeLabels`, `resolveTheme` — `apps/web/theme/constants.ts`). Хранение — `localStorage['garage:theme']`, `system` = ключа нет. До загрузки бандла класс `dark` на `<html>` и `<meta name="theme-color">` ставит inline-скрипт (`theme/initScript.ts` → `app.head.script` в `nuxt.config.ts`); статической meta theme-color в конфиге нет — её создаёт скрипт. theme-color и цвета манифеста — из `--bg` в `tokens.css` (`readThemeBackgrounds`), не дублировать. `plugins/theme.client.ts` запускает `useTheme()` на старте (слежение за `prefers-color-scheme`). Переключатель — `components/profile/ThemeSetting.vue` (`radiogroup` «Тема»); до экрана «Профиль» (#54) стоит на `/cars`.

## Ловушки

- (#32) `nuxt generate` не запускается при работающем `nuxt dev` (лок в `.nuxt`). `NUXT_IGNORE_LOCK=1` лок обходит, но перезаписывает общий `.nuxt` — dev-сервер после этого теряет CSS (404), его нужно перезапустить.

- `new Date().toISOString().slice(0, 10)` даёт дату в UTC — в первые часы суток по МСК это вчера. Использовать локальную дату.

## Решения

- Мобильные сторы — через Capacitor, без переписывания на RN/Flutter. Клиент держим совместимым с SPA-сборкой: без SSR-зависимостей, API — чистый REST. Правила и этапы — `docs/plans/mobile-stores.md`.

## Контракты

- (#этап 1) Монорепа npm workspaces: `apps/web` (Nuxt SPA, `ssr: false`, `nuxt generate`), `apps/api` (standalone Nitro, `srcDir: 'server'`), `packages/shared` (`@garage/shared`, TS-исходники без сборки). Общий код импортируется как `@garage/shared/schemas/<name>`, `@garage/shared/types`, `@garage/shared/utils/<name>`; `~~/shared/...` больше нет.
- (#этап 1) Одна авторизация, два транспорта: `requireAuth(event)` (`apps/api/server/utils/auth.ts`) принимает cookie-сессию (веб) или `Authorization: Bearer <access JWT>` (мобильный); вместо `requireUserSession`. `login`/`register` принимают `authMode: 'cookie' | 'token'`, в token-режиме отдают `tokens` и не ставят куку. Refresh-токен одноразовый (`refresh_tokens`, хранится SHA-256), `POST /api/auth/refresh` выдаёт новую пару.
- (#этап 1) Клиент (`apps/web`) обращается к API только через глобальный `$fetch` с путями `/api/...`: `plugins/api.ts` подменяет его на `createApiClient` (`utils/apiClient.ts`) — baseURL из `runtimeConfig.public.apiBase`, Bearer в `authMode: 'token'`, один refresh+retry на 401. Состояние пользователя — `useAuth()`; токены — `localTokenStore` (`utils/authTokens.ts`, интерфейс `TokenStore` — на этапе Capacitor заменить на нативное хранилище). `apiBase` и `authMode` запекаются при `nuxt generate`.
- (#этап 1) Публичный VAPID-ключ клиенту отдаёт API (`GET /api/push/config`), а не `runtimeConfig.public`: статическая сборка не знает серверных ключей.
- (#этап 1) Прод — один контейнер: API раздаёт собранный клиент из `NUXT_WEB_DIST_DIR` (`routes/[...path].get.ts`, SPA-фолбэк на `200.html`). Переменные API сохранили префикс `NUXT_` (`runtimeConfig.nitro.envPrefix`), чтобы серверный `.env` и `docker-compose.yml` не менялись.
- (#этап 1) CORS (`server/middleware/cors.ts`): всегда разрешены `capacitor://localhost`, `https://localhost`, `http://localhost` + `NUXT_CORS_ORIGINS`.
