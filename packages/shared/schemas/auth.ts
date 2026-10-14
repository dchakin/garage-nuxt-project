import { z } from 'zod'

/**
 * Как клиент хранит сессию: `cookie` — веб (httpOnly-кука, по умолчанию),
 * `token` — мобильный клиент (access + refresh в ответе, дальше `Authorization: Bearer`).
 */
export const authModes = ['cookie', 'token'] as const
export type AuthMode = (typeof authModes)[number]

const authModeSchema = z.enum(authModes).default('cookie')

export const registerSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(6, 'Минимум 6 символов'),
  name: z.string().min(1, 'Укажите имя'),
  authMode: authModeSchema,
})
export type RegisterInput = z.input<typeof registerSchema>

export const loginSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(1, 'Введите пароль'),
  authMode: authModeSchema,
})
export type LoginInput = z.input<typeof loginSchema>

export const profileSchema = z.object({
  name: z.string().trim().min(1, 'Укажите имя').max(100, 'Максимум 100 символов'),
})
export type ProfileInput = z.infer<typeof profileSchema>

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Введите текущий пароль'),
  newPassword: z.string().min(6, 'Минимум 6 символов'),
  /** Refresh-токен текущего устройства (мобильный клиент): он остаётся действующим. */
  refreshToken: z.string().min(1).optional(),
})
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})
export type RefreshInput = z.infer<typeof refreshSchema>
