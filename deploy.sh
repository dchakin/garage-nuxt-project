#!/bin/sh
set -e

# Тело в функции: git reset ниже перезаписывает этот файл, а sh может дочитывать скрипт
# с диска по ходу выполнения. Функция разбирается целиком до запуска
main() {
  cd /opt/garage

  BACKUP_DIR=data/backups
  BACKUPS_TO_KEEP=10
  HEALTH_ATTEMPTS=30

  git fetch origin
  git checkout master
  git reset --hard origin/master

  # Бэкап БД до pull: новая версия при старте применяет миграции (docker-entrypoint.sh).
  # Копия через SQLite backup API в работающем контейнере — консистентна с учётом WAL
  if [ -f data/garage.db ] && [ -n "$(docker compose ps -q --status running garage)" ]; then
    mkdir -p "$BACKUP_DIR"
    backup_name="garage-$(date -u +%Y%m%d-%H%M%S).db"
    docker compose exec -T -w /app garage node -e '
      const Database = require("better-sqlite3")
      const db = new Database(process.argv[1], { fileMustExist: true })
      db.backup(process.argv[2]).then(() => db.close())
    ' /app/data/garage.db "/app/$BACKUP_DIR/$backup_name"
    echo "backup: $BACKUP_DIR/$backup_name"
    ls -1t "$BACKUP_DIR"/garage-*.db | tail -n +$((BACKUPS_TO_KEEP + 1)) | xargs -r rm -f
  fi

  docker compose pull
  docker compose up -d

  # Smoke-check: контейнер поднялся, миграции прошли, API отвечает
  attempt=1
  until docker compose exec -T garage node -e '
    fetch("http://127.0.0.1:3000/api/health").then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))
  ' 2>/dev/null; do
    if [ "$attempt" -ge "$HEALTH_ATTEMPTS" ]; then
      echo "health check failed after $HEALTH_ATTEMPTS attempts" >&2
      docker compose logs --tail 50 garage >&2
      exit 1
    fi
    attempt=$((attempt + 1))
    sleep 2
  done
  echo "health check ok"

  docker image prune -f
}

main "$@"
