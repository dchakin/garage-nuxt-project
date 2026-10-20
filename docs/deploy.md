# Деплой

`master` — прод, повседневная работа идёт в `dev` и мёржится в `master`, когда готово к выкладке.

## Проверки (CI)

`.github/workflows/ci.yml` запускается на push в `dev`, на каждый PR и вызывается из деплоя (`workflow_call`), поэтому набор проверок один:

- **test** — `format:check`, `typecheck`, `npm test`.
- **e2e** — `npm run build` (без `GARAGE_EXCLUDE_DEV_PAGES`: e2e проверяют `/dev/ui`), Chromium для Playwright (кэш `~/.cache/ms-playwright` по версии `@playwright/test`), `npm run test:e2e`. Если тесты упали, `test-results/` (скриншоты, трейсы) прикладывается к прогону как artifact `e2e-results` и хранится 7 дней.

Новый push в ветку отменяет её прошлый прогон CI; прогоны деплоя (`master`) не отменяются.

## Как устроено

Push в `master` запускает `.github/workflows/deploy.yml`, job'ы идут по порядку:

- **ci** — `ci.yml` целиком (см. выше). Если проверки не прошли, образ не собирается.
- **build** — GitHub runner собирает Docker-образ (один образ с обоими приложениями: API отдаёт сгенерированный web-клиент из `NUXT_WEB_DIST_DIR`, поэтому прод — один контейнер, один origin, порт 3000) и пушит его в `ghcr.io/dchakin/garage-nuxt-project:latest` + тег `:<sha>`, кэш слоёв buildx — `type=gha`. Образ собирается с `GARAGE_EXCLUDE_DEV_PAGES=1`: витрина `/dev/ui` выпадает из сборки (`ignore` в `apps/web/nuxt.config.ts`).
- **deploy** — SSH на прод-сервер (root@195.19.209.224), запуск `/opt/garage/deploy.sh`:
  1. `git reset --hard origin/master` — обновляет `docker-compose.yml` и сам `deploy.sh`;
  2. бэкап БД, если контейнер запущен: SQLite backup API внутри работающего контейнера (консистентно с WAL) → `data/backups/garage-<UTC-время>.db`, хранятся 10 последних;
  3. `docker compose pull` + `docker compose up -d` (миграции и сид применяются при старте контейнера, `docker-entrypoint.sh`);
  4. smoke-check: до 30 попыток раз в 2 с запросить `/api/health` изнутри контейнера; не ответил — в лог job'а выводятся последние 50 строк логов контейнера и job падает;
  5. `docker image prune -f`.

## Откат

На сервере в `/opt/garage`:

```sh
GARAGE_TAG=<sha рабочего коммита> docker compose up -d
```

`docker-compose.yml` берёт тег из `GARAGE_TAG` (по умолчанию `latest`). Переменную задавайте только в команде, не в `.env`: иначе следующий деплой останется на старом теге. Следующий деплой из `master` снова поставит `latest`.

Если новая миграция испортила данные — остановить контейнер, заменить `data/garage.db` нужной копией из `data/backups/` (и удалить `garage.db-wal`/`garage.db-shm`), затем поднять образ, совместимый с этой схемой (откат выше).

## Ограничения

- Образ никогда не собирается на прод-сервере: `deploy.sh` только скачивает готовый образ и перезапускает контейнер, поэтому SSH-сессия длится секунды.
- `docker-compose.yml` ссылается на образ GHCR по тегу и не имеет секции `build:` — локальный `docker compose build` в деплое не участвует.
- Сервер один раз логинится в GHCR (`docker login ghcr.io` с PAT с правом `read:packages`), если пакет не публичный.
- Deploy-ключ в `authorized_keys` сервера ограничен одним скриптом (`command="/opt/garage/deploy.sh"`), хранится в секретах GitHub `DEPLOY_HOST`/`DEPLOY_SSH_KEY`.
- `deploy.sh` лежит в репозитории и обновляет сам себя (перечитывается вместе с остальным checkout), поэтому изменения деплоя — просто коммит в `master`.
- Бэкапы лежат на том же сервере (`data/backups/`) — от потери самого сервера они не спасают.
- Защита ветки `master` (мердж только через PR с зелёным CI) настраивается в GitHub (Settings → Branches), не в репозитории.

Меняешь `Dockerfile`, `docker-compose.yml`, `deploy.sh` или workflow — обнови этот файл в том же коммите.
