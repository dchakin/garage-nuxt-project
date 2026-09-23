#!/usr/bin/env bash
# Обратное давление Ralph loop: задача не принимается, пока всё это не зелёное.
# Можно запускать и вручную: bash ralph/check.sh
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

run() {
  echo "::: $*"
  if ! "$@"; then
    echo "::: FAILED: $*"
    exit 1
  fi
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

# E2E на собранном приложении (появляются в #27). Скриншоты — в test-results/screens/ для ревью.
rm -rf test-results/screens
if has_script test:e2e; then
  run npm run test:e2e --silent
else
  echo "::: e2e пропущены: скрипта test:e2e ещё нет (issue #27)"
fi
echo "::: ALL GREEN"
