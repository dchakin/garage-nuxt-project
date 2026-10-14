import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import nodemailer from 'nodemailer'

export interface MailConfig {
  /** SMTP-строка подключения (smtp://user:pass@host:587); пусто — SMTP не используется */
  smtpUrl: string
  /** Адрес отправителя */
  from: string
  /** Если задан, письма пишутся JSON-файлами в этот каталог вместо отправки (тесты, e2e) */
  outboxDir: string
}

export interface MailMessage {
  to: string
  subject: string
  text: string
  html?: string
}

const DEFAULT_MAIL_FROM = 'Гараж <no-reply@localhost>'

export function isMailEnabled(config: Pick<MailConfig, 'smtpUrl' | 'outboxDir'>): boolean {
  return Boolean(config.smtpUrl || config.outboxDir)
}

/** Конфиг почты из runtimeConfig (авто-импорт Nitro `useRuntimeConfig`). */
export function getMailConfig(): MailConfig {
  const runtime = useRuntimeConfig()
  return {
    smtpUrl: String(runtime.smtpUrl || ''),
    from: String(runtime.mailFrom || DEFAULT_MAIL_FROM),
    outboxDir: String(runtime.mailOutboxDir || ''),
  }
}

/** Полная ссылка на страницу приложения для письма (`NUXT_APP_URL` — база). */
export function buildAppLink(appUrl: string, pathname: string): string {
  return `${appUrl.replace(/\/+$/, '')}${pathname.startsWith('/') ? '' : '/'}${pathname}`
}

/** Отправляет письмо; outbox имеет приоритет над SMTP. Без обоих — ошибка (почта выключена). */
export async function sendMail(message: MailMessage, config: MailConfig): Promise<void> {
  if (config.outboxDir) {
    await mkdir(config.outboxDir, { recursive: true })
    const file = path.join(config.outboxDir, `${Date.now()}-${randomUUID()}.json`)
    await writeFile(file, JSON.stringify({ from: config.from, ...message }, null, 2), 'utf8')
    return
  }
  if (!config.smtpUrl) {
    throw new Error('Mail is disabled: neither NUXT_SMTP_URL nor NUXT_MAIL_OUTBOX_DIR is set')
  }
  const transport = nodemailer.createTransport(config.smtpUrl)
  await transport.sendMail({ from: config.from, ...message })
}
