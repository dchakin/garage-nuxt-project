FROM node:22-bookworm-slim

# python3/make/g++ нужны для сборки нативного модуля better-sqlite3
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# npm ci требует ту же версию npm, что генерировала package-lock.json (npm 11.x, см. package.json engines)
RUN npm install -g npm@11

# Сначала только манифесты воркспейсов — слой с зависимостями кэшируется, пока они не менялись
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

COPY . .
# Собираем оба приложения: apps/api (Nitro, .output/server) и apps/web (nuxt generate, .output/public)
# GARAGE_EXCLUDE_DEV_PAGES — без витрины UI-кита /dev/ui (apps/web/nuxt.config.ts)
RUN GARAGE_EXCLUDE_DEV_PAGES=1 npm run build

# API раздаёт и собранный клиент — один контейнер и один origin (см. apps/api/server/routes/[...path].get.ts)
ENV NUXT_WEB_DIST_DIR=/app/apps/web/.output/public

EXPOSE 3000

COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

ENTRYPOINT ["/app/docker-entrypoint.sh"]
