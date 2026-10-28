import { MIN_PASSWORD_LENGTH } from '@garage/shared/schemas/auth'

/** Срок жизни ссылки сброса в тексте экранов (на сервере — `PASSWORD_RESET_TOKEN_TTL_MS`, 1 час). */
export const PASSWORD_RESET_TTL_LABEL = '1 час'

const SECONDS_IN_MINUTE = 60

/** Отсчёт до повторной отправки: `45` → `0:45`, `60` → `1:00`. */
export function formatCountdown(totalSeconds: number): string {
  const seconds = Math.max(0, Math.ceil(totalSeconds))
  const rest = String(seconds % SECONDS_IN_MINUTE).padStart(2, '0')
  return `${Math.floor(seconds / SECONDS_IN_MINUTE)}:${rest}`
}

export interface PasswordLengthHint {
  text: string
  /** Пароль уже начали вводить, но он короче минимума — подсказка показывается как ошибка */
  isError: boolean
}

/**
 * Живая подсказка длины пароля (А3): пока поле пусто — обычная «Минимум 6 символов», при вводе
 * короче минимума — ошибка «Минимум 6 символов — осталось 3», с достаточной длины — снова подсказка.
 */
export function describePasswordLength(length: number): PasswordLengthHint {
  const base = `Минимум ${MIN_PASSWORD_LENGTH} символов`
  const left = MIN_PASSWORD_LENGTH - length
  if (length > 0 && left > 0) return { text: `${base} — осталось ${left}`, isError: true }
  return { text: base, isError: false }
}
