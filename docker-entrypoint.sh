#!/bin/sh
set -e

npx tsx server/database/migrate.ts
npx tsx server/database/seed.ts

exec node .output/server/index.mjs
