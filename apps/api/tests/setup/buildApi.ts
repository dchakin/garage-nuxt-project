import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build, copyPublicAssets, createNitro, prepare, prerender } from 'nitropack'
import type { TestProject } from 'vitest/node'

const apiRoot = fileURLToPath(new URL('../..', import.meta.url))
const sharedRoot = path.join(apiRoot, '../../packages/shared')

/** Всё, из чего собирается сервер: изменение любого файла отсюда — повод пересобрать. */
const BUILD_INPUTS = [
  path.join(apiRoot, 'server'),
  path.join(apiRoot, 'nitro.config.ts'),
  path.join(apiRoot, 'package.json'),
  sharedRoot,
]
const IGNORED_DIRS = new Set(['node_modules', 'tests'])

declare module 'vitest' {
  interface ProvidedContext {
    apiServerEntry: string
  }
}

function listFiles(entry: string): string[] {
  if (!fs.statSync(entry).isDirectory()) return [entry]
  return fs
    .readdirSync(entry, { withFileTypes: true })
    .filter((dirent) => !IGNORED_DIRS.has(dirent.name))
    .flatMap((dirent) => listFiles(path.join(entry, dirent.name)))
}

function hashBuildInputs(): string {
  const hash = createHash('sha256')
  for (const file of BUILD_INPUTS.flatMap(listFiles).sort()) {
    hash.update(path.relative(apiRoot, file)).update(fs.readFileSync(file))
  }
  return hash.digest('hex')
}

async function buildApi(workDir: string) {
  const nitro = await createNitro({
    rootDir: apiRoot,
    dev: false,
    buildDir: path.join(workDir, '.nitro'),
    output: { dir: path.join(workDir, 'output') },
  })
  await prepare(nitro)
  await copyPublicAssets(nitro)
  await prerender(nitro)
  await build(nitro)
  await nitro.close()
}

/**
 * Nitro оставляет внешние зависимости (drizzle-orm, better-sqlite3…) в `import` и не всегда
 * копирует их в `output/server/node_modules`. На проде сборка лежит внутри репозитория и находит
 * корневой `node_modules`, а во временном каталоге — нет, поэтому подставляем ссылку на него.
 */
function linkDependencies(serverDir: string) {
  const dependenciesDir = path.join(serverDir, 'node_modules')
  const rootDependenciesDir = path.join(apiRoot, '../../node_modules')
  // Сборка может оставить каталог только с package.json-заглушками — файлов пакетов в нём нет
  if (fs.existsSync(path.join(dependenciesDir, 'drizzle-orm', 'index.js'))) return
  fs.rmSync(dependenciesDir, { recursive: true, force: true })
  // junction не требует прав администратора на Windows
  fs.symlinkSync(rootDependenciesDir, dependenciesDir, 'junction')
}

/**
 * Собирает apps/api (как `nitropack build`) для интеграционных тестов. Каждый тест-файл затем
 * запускает готовый `server/index.mjs` за доли секунды, а не компилирует сервер заново, как это
 * делал `nitropack dev`. Сборка лежит во временном каталоге (свой на каждый worktree), чтобы не
 * затирать `.output` для e2e и `.nitro` локального `npm run dev:api`, и переиспользуется, пока не
 * изменились исходники сервера и `packages/shared`.
 */
export default async function buildApiForTests(project: TestProject) {
  const worktreeHash = createHash('sha256').update(apiRoot).digest('hex').slice(0, 8)
  const workDir = path.join(os.tmpdir(), `garage-api-test-${worktreeHash}`)
  const serverEntry = path.join(workDir, 'output', 'server', 'index.mjs')
  const hashFile = path.join(workDir, 'inputs.sha256')

  const inputsHash = hashBuildInputs()
  const cachedHash = fs.existsSync(hashFile) ? fs.readFileSync(hashFile, 'utf8') : null
  if (cachedHash !== inputsHash || !fs.existsSync(serverEntry)) {
    fs.rmSync(hashFile, { force: true })
    await buildApi(workDir)
    fs.writeFileSync(hashFile, inputsHash)
  }
  linkDependencies(path.join(workDir, 'output', 'server'))

  project.provide('apiServerEntry', serverEntry)
}
