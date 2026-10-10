import { spawn, spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ofetch } from 'ofetch'

const apiRoot = fileURLToPath(new URL('../..', import.meta.url))
const SERVER_START_TIMEOUT_MS = 120_000
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
    // dev-режим Nitro порождает дочерний воркер — без /T он остаётся жить и держит порт и БД
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
 * Поднимает реальный dev-сервер apps/api (`nitropack dev`) на свободном порту с заданным окружением.
 * Роуты нельзя импортировать напрямую: они опираются на авто-импорты Nitro и runtime config,
 * поэтому интеграционные тесты ходят в них по HTTP.
 */
export async function startApiServer(env: Record<string, string>): Promise<ApiServer> {
  const port = await findFreePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const nitropackCli = path.join(
    path.dirname(createRequire(import.meta.url).resolve('nitropack/package.json')),
    'dist/cli/index.mjs',
  )

  // Под vitest в окружении есть NODE_ENV=test и VITEST*: с ними `nitropack dev` молча не слушает порт
  const inheritedEnv = Object.fromEntries(
    Object.entries(process.env).filter(
      ([name]) => name !== 'NODE_ENV' && !name.startsWith('VITEST'),
    ),
  )

  const child = spawn(
    process.execPath,
    [nitropackCli, 'dev', '--host', '127.0.0.1', '--port', String(port)],
    {
      cwd: apiRoot,
      env: {
        ...inheritedEnv,
        // сабпроцесс не наследует env теста; про TZ см. комментарий в vitest.config.ts
        TZ: 'UTC',
        // отдельный dev-сервер на своём порту и БД не конфликтует с локальным `npm run dev:api`
        ...env,
      },
      stdio: process.env.API_SERVER_DEBUG ? 'inherit' : 'ignore',
      detached: process.platform !== 'win32',
    },
  )

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
