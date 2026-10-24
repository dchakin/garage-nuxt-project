// Сервер для e2e: собранный API (apps/api/.output) раздаёт собранный клиент (apps/web/.output/public)
// на отдельной временной SQLite — как прод (один origin), но без влияния на локальную БД.
// Запускается Playwright'ом (webServer в playwright.config.ts), сам ничего не собирает.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const rootDir = fileURLToPath(new URL('../..', import.meta.url))
const apiDir = path.join(rootDir, 'apps/api')
const apiEntry = path.join(apiDir, '.output/server/index.mjs')
const webDistDir = path.join(rootDir, 'apps/web/.output/public')
const tsxCli = path.join(rootDir, 'node_modules/tsx/dist/cli.mjs')

for (const required of [apiEntry, path.join(webDistDir, '200.html')]) {
  if (!existsSync(required)) {
    console.error(`[e2e] нет сборки: ${required}. Сначала выполните npm run build`)
    process.exit(1)
  }
}

const TMP_PREFIX = 'garage-e2e-'

// Путь задаёт playwright.config.ts (E2E_DB_FILE): фикстура seededCar пишет в ту же БД
const dbFileName =
  process.env.E2E_DB_FILE ||
  path.join(os.tmpdir(), `${TMP_PREFIX}${process.env.E2E_PORT || '3100'}`, 'garage.db')
const tmpDir = path.dirname(dbFileName)

// На Windows Playwright гасит сервер принудительно, обработчик exit не срабатывает — подчищаем
// каталог прошлого прогона на этом порту при старте. Чужие порты не трогаем: там может идти
// параллельный прогон (Ralph в отдельном worktree с другим E2E_PORT).
rmSync(tmpDir, { recursive: true, force: true })
mkdirSync(tmpDir, { recursive: true })

function runDbScript(script) {
  const result = spawnSync(process.execPath, [tsxCli, `server/database/${script}`], {
    cwd: apiDir,
    env: { ...process.env, DB_FILE_NAME: dbFileName },
    stdio: 'inherit',
  })
  if (result.status !== 0) {
    console.error(`[e2e] ${script} завершился с кодом ${result.status}`)
    process.exit(1)
  }
}

runDbScript('migrate.ts')
runDbScript('seed.ts')

function cleanup() {
  // на Windows файл БД ещё может держать открытое соединение — временный каталог тогда остаётся
  rmSync(tmpDir, { recursive: true, force: true, maxRetries: 3 })
}
process.once('exit', () => {
  try {
    cleanup()
  } catch {
    // не мешаем завершению процесса
  }
})
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => process.exit(0))

Object.assign(process.env, {
  TZ: 'UTC',
  HOST: '127.0.0.1',
  PORT: process.env.E2E_PORT || '3100',
  DB_FILE_NAME: dbFileName,
  NUXT_WEB_DIST_DIR: webDistDir,
  NUXT_SESSION_PASSWORD: 'e2e-session-password-at-least-32-characters',
  // Почта включена: письма пишутся файлами в outbox рядом с БД (путь знает и helpers/mailbox.ts),
  // ссылки в них ведут на этот же сервер
  NUXT_MAIL_OUTBOX_DIR: path.join(tmpDir, 'mail-outbox'),
  NUXT_APP_URL: `http://127.0.0.1:${process.env.E2E_PORT || '3100'}`,
})

// Сервер Nitro стартует при импорте; в том же процессе, чтобы Playwright гасил его вместе с нами
await import(pathToFileURL(apiEntry).href)
