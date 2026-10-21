import { computed, getCurrentScope, onScopeDispose, readonly, ref } from 'vue'

/** Пауза перед повторной отправкой письма; совпадает с лимитом сервера (`PASSWORD_RESET_MIN_INTERVAL_MS`). */
export const RESEND_DELAY_SECONDS = 60

const TICK_MS = 1000

/**
 * Обратный отсчёт в секундах для кнопки «Отправить ещё раз». Считает тиками `setInterval`, а не
 * разницей `Date.now()`, поэтому не зависит от замороженных часов в e2e.
 */
export function useResendTimer(delaySeconds = RESEND_DELAY_SECONDS) {
  const remaining = ref(0)
  const isActive = computed(() => remaining.value > 0)
  let timer: ReturnType<typeof setInterval> | null = null

  function stop() {
    if (timer !== null) clearInterval(timer)
    timer = null
  }

  /** Запускает отсчёт заново с полной паузы. */
  function start() {
    stop()
    remaining.value = delaySeconds
    timer = setInterval(() => {
      remaining.value -= 1
      if (remaining.value <= 0) stop()
    }, TICK_MS)
  }

  if (getCurrentScope()) onScopeDispose(stop)

  return { remaining: readonly(remaining), isActive, start, stop }
}
