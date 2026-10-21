import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { expect } from '@playwright/test'

interface OutboxMail {
  from: string
  to: string
  subject: string
  text: string
}

/** Каталог outbox e2e-сервера: рядом с его БД (`tests/e2e/server.mjs`). */
function outboxDir(): string {
  return path.join(path.dirname(process.env.E2E_DB_FILE!), 'mail-outbox')
}

async function readOutbox(): Promise<OutboxMail[]> {
  const files = await readdir(outboxDir()).catch(() => [])
  const mails = await Promise.all(
    files
      .filter((file) => file.endsWith('.json'))
      .sort()
      .map(async (file) => JSON.parse(await readFile(path.join(outboxDir(), file), 'utf8'))),
  )
  return mails as OutboxMail[]
}

/** Ждёт письмо на адрес и возвращает его (последнее, если писем несколько). */
export async function waitForMail(to: string): Promise<OutboxMail> {
  let found: OutboxMail | undefined
  await expect
    .poll(async () => {
      found = (await readOutbox()).filter((mail) => mail.to === to).at(-1)
      return found !== undefined
    })
    .toBe(true)
  return found!
}

/** Ссылка сброса пароля из письма: `…/reset-password?token=…`. */
export async function waitForResetLink(to: string): Promise<string> {
  const mail = await waitForMail(to)
  const link = mail.text.match(/https?:\/\/\S+\/reset-password\?token=\S+/)?.[0]
  expect(link, `ссылка сброса в письме: ${mail.text}`).toBeTruthy()
  return link!
}
