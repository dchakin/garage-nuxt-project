import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { createHttpClient, startApiServer } from '../helpers/apiServer'
import { cleanupTestDbFile, createTestDbFile } from '../helpers/testDb'

const baseEnv = { NUXT_SESSION_PASSWORD: 'a'.repeat(32) }
const outboxDir = fs.mkdtempSync(path.join(os.tmpdir(), 'garage-config-outbox-'))
const dbWithMail = createTestDbFile()
const dbWithoutMail = createTestDbFile()

const withMail = await startApiServer({
  ...baseEnv,
  DB_FILE_NAME: dbWithMail,
  NUXT_MAIL_OUTBOX_DIR: outboxDir,
})
const withoutMail = await startApiServer({ ...baseEnv, DB_FILE_NAME: dbWithoutMail })

afterAll(() => {
  withMail.stop()
  withoutMail.stop()
  cleanupTestDbFile(dbWithMail)
  cleanupTestDbFile(dbWithoutMail)
  fs.rmSync(outboxDir, { recursive: true, force: true })
})

describe('GET /api/auth/config', () => {
  it('passwordReset: true, когда настроена почта', async () => {
    const res = await createHttpClient(withMail.baseUrl).fetch('/api/auth/config')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ passwordReset: true })
  })

  it('passwordReset: false без SMTP и outbox', async () => {
    const res = await createHttpClient(withoutMail.baseUrl).fetch('/api/auth/config')
    expect(await res.json()).toEqual({ passwordReset: false })
  })
})
