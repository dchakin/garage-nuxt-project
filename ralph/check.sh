#!/usr/bin/env bash
# Обратное давление Ralph loop: задача не принимается, пока всё это не зелёное.
# Можно запускать и вручную: bash ralph/check.sh
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

run() {
  echo "::: $*"
  local started=$SECONDS
  if ! "$@"; then
    echo "::: FAILED: $* ($((SECONDS - started)) с)"
    exit 1
  fi
  echo "::: OK: $* ($((SECONDS - started)) с)"
}

if ! node -e 'process.exit(require("./package.json").scripts?.test ? 0 : 1)'; then
  echo '::: FAILED: в package.json нет скрипта "test" (тестовая инфраструктура — issue #26)'
  exit 1
fi

has_script() { node -e "process.exit(require('./package.json').scripts?.['$1'] ? 0 : 1)"; }

export CI=true # vitest, playwright — без watch-режима и интерактива
run npm test --silent
run npm run typecheck --silent
run npm run build --silent

# E2E на собранном приложении (Playwright, tests/e2e). Скриншоты — в test-results/screens/ для ревью.
rm -rf test-results/screens
if ! has_script test:e2e; then
  echo '::: FAILED: в package.json нет скрипта "test:e2e"'
  exit 1
fi
run npm run test:e2e --silent
echo "::: ALL GREEN"
