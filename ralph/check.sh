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

export CI=true # vitest и прочие — без watch-режима и интерактива
run npm test --silent
run npm run typecheck --silent
run npm run build --silent
echo "::: ALL GREEN"
