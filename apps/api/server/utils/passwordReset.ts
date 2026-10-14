import { createHash, randomBytes } from 'node:crypto'

export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000
export const PASSWORD_RESET_MIN_INTERVAL_MS = 60 * 1000
const PASSWORD_RESET_TOKEN_BYTES = 32

export function generateResetToken(): string {
  return randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString('base64url')
}

export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function buildResetMessage(to: string, link: string) {
  return {
    to,
    subject: 'Сброс пароля — Гараж',
    text: `Чтобы задать новый пароль, перейдите по ссылке (действует 1 час):\n${link}\n\nЕсли вы не запрашивали сброс, просто проигнорируйте письмо.`,
  }
}
