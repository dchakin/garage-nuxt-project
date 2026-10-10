#!/bin/sh
set -e

# Пути миграций и БД в скриптах относительные от корня apps/api
cd /app/apps/api

npx tsx server/database/migrate.ts
npx tsx server/database/seed.ts

exec node .output/server/index.mjs
