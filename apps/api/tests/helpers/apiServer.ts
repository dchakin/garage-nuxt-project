import { spawn, spawnSync } from 'node:child_process'
import net from 'node:net'
import { fileURLToPath } from 'node:url'
import { ofetch } from 'ofetch'
import { inject } from 'vitest'

const apiRoot = fileURLToPath(new URL('../..', import.meta.url))
const SERVER_START_TIMEOUT_MS = 30_000
const POLL_INTERVAL_MS = 300

export interface ApiServer {
  baseUrl: string
  stop(): void
}

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = net.createServer()
    probe.once('error', reject)
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address() as net.AddressInfo
      probe.close(() => resolve(port))
    })
  })
}

async function waitForHealth(baseUrl: string, getExitInfo: () => string | null) {
  const deadline = Date.now() + SERVER_START_TIMEOUT_MS
  while (Date.now() < deadline) {
    const exited = getExitInfo()
    if (exited) throw new Error(`API-сервер завершился до старта: ${exited}`)
    try {
      const res = await fetch(`${baseUrl}/api/health`)
      if (res.ok) return
    } catch {
      // сервер ещё поднимается
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  }
  throw new Error('API-сервер не ответил на /api/health за отведённое время')
}

function killTree(pid: number) {
  if (process.platform === 'win32') {
    // /T — вместе с возможными дочерними процессами, иначе они держат порт и файл БД
    spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'])
  } else {
    try {
      process.kill(-pid, 'SIGTERM')
    } catch {
      // процесс уже завершён
    }
  }
}

/**
 * Поднимает реальный сервер apps/api на свободном порту с заданным окружением — сборку, которую
 * один раз делает `tests/setup/buildApi.ts` (globalSetup). Роуты нельзя импортировать напрямую:
 * они опираются на авто-импорты Nitro и runtime config, поэтому интеграционные тесты ходят в них
 * по HTTP. Runtime config (`NUXT_*`) собранный сервер читает из env при старте.
 */
export async function startApiServer(env: Record<string, string>): Promise<ApiServer> {
  const port = await findFreePort()
  const baseUrl = `http://127.0.0.1:${port}`

  // Окружение теста (NODE_ENV=test, VITEST*) серверу не нужно
  const inheritedEnv = Object.fromEntries(
    Object.entries(process.env).filter(
      ([name]) => name !== 'NODE_ENV' && !name.startsWith('VITEST'),
    ),
  )

  const child = spawn(process.execPath, [inject('apiServerEntry')], {
    cwd: apiRoot,
    env: {
      ...inheritedEnv,
      NITRO_HOST: '127.0.0.1',
      NITRO_PORT: String(port),
      // сабпроцесс не наследует env теста; про TZ см. комментарий в vitest.config.ts
      TZ: 'UTC',
      // свой порт и БД — не конфликтует с локальным `npm run dev:api` и другими тест-файлами
      ...env,
    },
    stdio: process.env.API_SERVER_DEBUG ? 'inherit' : 'ignore',
    detached: process.platform !== 'win32',
  })

  let exitInfo: string | null = null
  child.once('exit', (code, signal) => {
    exitInfo = `code=${code} signal=${signal}`
  })

  try {
    await waitForHealth(baseUrl, () => exitInfo)
  } catch (error) {
    if (child.pid) killTree(child.pid)
    throw error
  }

  return {
    baseUrl,
    stop() {
      if (child.pid) killTree(child.pid)
    },
  }
}

/** Тонкая обёртка над fetch/ofetch с базовым URL запущенного сервера. */
export function createHttpClient(baseUrl: string) {
  return {
    fetch: (url: string, init?: RequestInit) => fetch(`${baseUrl}${url}`, init),
    $fetch: ofetch.create({ baseURL: baseUrl }),
  }
}
