import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { createHttpClient, startApiServer } from '../helpers/apiServer'
import { createTestDbFile, cleanupTestDbFile } from '../helpers/testDb'

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'garage-web-'))
const webDist = path.join(tmpRoot, 'dist')
fs.mkdirSync(path.join(webDist, '_nuxt'), { recursive: true })
fs.writeFileSync(path.join(webDist, '200.html'), '<html>spa-shell</html>')
fs.writeFileSync(path.join(webDist, 'sw.js'), 'self.skipWaiting()')
fs.writeFileSync(path.join(webDist, '_nuxt', 'entry.abc123.js'), 'console.log(1)')
// лежит рядом с корнем раздачи — недостижим при корректной защите от path traversal
fs.writeFileSync(path.join(tmpRoot, 'secret.txt'), 'secret')

const dbFile = createTestDbFile()
const server = await startApiServer({
  DB_FILE_NAME: dbFile,
  NUXT_SESSION_PASSWORD: 'a'.repeat(32),
  NUXT_WEB_DIST_DIR: webDist,
})
const { fetch } = createHttpClient(server.baseUrl)

afterAll(() => {
  server.stop()
  cleanupTestDbFile(dbFile)
  fs.rmSync(tmpRoot, { recursive: true, force: true })
})

describe('раздача статики apps/web (NUXT_WEB_DIST_DIR)', () => {
  it('SPA-маршруты отдают оболочку приложения', async () => {
    for (const route of ['/', '/cars', '/cars/5/entries/new']) {
      const res = await fetch(route)
      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toContain('text/html')
      expect(await res.text()).toBe('<html>spa-shell</html>')
    }
  })

  it('файлы отдаются с типом и кэшированием: хэшированные — навсегда, sw.js — нет', async () => {
    const asset = await fetch('/_nuxt/entry.abc123.js')
    expect(asset.headers.get('content-type')).toContain('text/javascript')
    expect(asset.headers.get('cache-control')).toContain('immutable')

    const sw = await fetch('/sw.js')
    expect(sw.headers.get('cache-control')).toBe('no-cache')
  })

  it('несуществующий файл — 404, а не оболочка', async () => {
    expect((await fetch('/missing.js')).status).toBe(404)
  })

  it('неизвестный /api/** остаётся 404, API-роуты работают', async () => {
    expect((await fetch('/api/nope')).status).toBe(404)
    expect(await (await fetch('/api/health')).json()).toEqual({ ok: true })
  })

  it('не отдаёт файлы за пределами корня (path traversal)', async () => {
    for (const url of ['/..%2Fsecret.txt', '/%2e%2e/secret.txt', '/_nuxt/../../secret.txt']) {
      const res = await fetch(url)
      expect(await res.text()).not.toBe('secret')
    }
  })
})
