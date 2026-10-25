import { readonly, ref } from 'vue'

/**
 * Публичные настройки сервера для экранов входа (`GET /api/auth/config`). `passwordReset` —
 * включена ли почта: без неё ссылка «Забыли пароль?» не показывается. Состояние модульное (SPA);
 * пока ответа нет или он не удался, считаем, что восстановления нет. Запрос делается один раз.
 */
const passwordReset = ref(false)
let request: Promise<void> | null = null

async function loadAuthConfig() {
  try {
    const config = await $fetch<{ passwordReset: boolean }>('/api/auth/config')
    passwordReset.value = config.passwordReset === true
  } catch {
    request = null
  }
}

export function useAuthConfig() {
  /** Грузит конфиг (повторные вызовы переиспользуют запрос); не бросает при сбое. */
  function fetchAuthConfig() {
    request ??= loadAuthConfig()
    return request
  }

  return { passwordReset: readonly(passwordReset), fetchAuthConfig }
}

/** Только для тестов: сбрасывает кэш между сценариями. */
export function resetAuthConfig() {
  passwordReset.value = false
  request = null
}
