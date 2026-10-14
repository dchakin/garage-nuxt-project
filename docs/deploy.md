# Деплой

`master` — прод, повседневная работа идёт в `dev` и мёржится в `master`, когда готово к выкладке.

## Как устроено

Push в `master` запускает `.github/workflows/deploy.yml`, в нём два job'а:

- **build** — GitHub runner собирает Docker-образ (один образ с обоими приложениями: API отдаёт сгенерированный web-клиент из `NUXT_WEB_DIST_DIR`, поэтому прод — один контейнер, один origin, порт 3000) и пушит его в `ghcr.io/dchakin/garage-nuxt-project:latest` + тег `:<sha>`, кэш слоёв buildx — `type=gha`. Образ собирается с `GARAGE_EXCLUDE_DEV_PAGES=1`: витрина `/dev/ui` выпадает из сборки (`ignore` в `apps/web/nuxt.config.ts`).
- **deploy** — SSH на прод-сервер (root@195.19.209.224), запуск `/opt/garage/deploy.sh`.

## Ограничения

- Образ никогда не собирается на прод-сервере: `deploy.sh` делает только `git reset --hard origin/master` + `docker compose pull` + `docker compose up -d`, поэтому SSH-сессия длится секунды.
- `docker-compose.yml` ссылается на образ GHCR по тегу и не имеет секции `build:` — локальный `docker compose build` в деплое не участвует.
- Сервер один раз логинится в GHCR (`docker login ghcr.io` с PAT с правом `read:packages`), если пакет не публичный.
- Deploy-ключ в `authorized_keys` сервера ограничен одним скриптом (`command="/opt/garage/deploy.sh"`), хранится в секретах GitHub `DEPLOY_HOST`/`DEPLOY_SSH_KEY`.
- `deploy.sh` лежит в репозитории и обновляет сам себя (перечитывается вместе с остальным checkout), поэтому изменения деплоя — просто коммит в `master`.

Меняешь `Dockerfile`, `docker-compose.yml`, `deploy.sh` или workflow — обнови этот файл в том же коммите.
