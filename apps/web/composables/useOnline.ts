import { readonly, ref } from 'vue'

/**
 * Есть ли сеть: `navigator.onLine` + события `online`/`offline`. Состояние модульное (SPA),
 * слушатели вешаются один раз при первом вызове. `lastOnlineAt` — момент, до которого данные
 * на экране были свежими: потеря сети (или запуск, если сеть так и не появлялась).
 */
const online = ref(true)
const lastOnlineAt = ref(new Date())
let listening = false

function handleOnline() {
  online.value = true
  lastOnlineAt.value = new Date()
}

function handleOffline() {
  // Данные актуальны на момент потери сети
  if (online.value) lastOnlineAt.value = new Date()
  online.value = false
}

function startListening() {
  if (listening || typeof window === 'undefined') return
  listening = true
  online.value = navigator.onLine
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
}

export function useOnline() {
  startListening()
  return { online: readonly(online), lastOnlineAt: readonly(lastOnlineAt) }
}
