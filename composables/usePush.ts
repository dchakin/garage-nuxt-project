function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

/**
 * Подписка на Web Push в текущем браузере. Работает только на клиенте;
 * на iOS — только в установленном на главный экран PWA (iOS 16.4+).
 */
export function usePush() {
  const config = useRuntimeConfig()
  const supported = ref(false)
  const permission = ref<NotificationPermission>('default')
  const subscribed = ref(false)
  const busy = ref(false)
  // iOS в обычной вкладке Safari не даёт push — надо сначала установить приложение
  const needsInstall = ref(false)

  async function getRegistration() {
    return await navigator.serviceWorker.ready
  }

  async function refresh() {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
    needsInstall.value = ios && !standalone
    supported.value = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
      && !!config.public.vapidPublicKey
    if (!supported.value) return

    permission.value = Notification.permission
    const sub = await (await getRegistration()).pushManager.getSubscription()
    subscribed.value = !!sub && permission.value === 'granted'
    // Синхронизируем с сервером: подписка могла быть создана под другим аккаунтом или удалена на сервере
    if (sub && subscribed.value) {
      await $fetch('/api/push/subscribe', { method: 'POST', body: sub.toJSON() }).catch(() => {})
    }
  }

  async function subscribe() {
    busy.value = true
    try {
      // Запрос разрешения допустим только в обработчике клика пользователя
      permission.value = await Notification.requestPermission()
      if (permission.value !== 'granted') return false

      const registration = await getRegistration()
      const sub = await registration.pushManager.getSubscription()
        ?? await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(String(config.public.vapidPublicKey))
        })
      await $fetch('/api/push/subscribe', { method: 'POST', body: sub.toJSON() })
      subscribed.value = true
      return true
    } finally {
      busy.value = false
    }
  }

  async function unsubscribe() {
    busy.value = true
    try {
      const sub = await (await getRegistration()).pushManager.getSubscription()
      if (sub) {
        await $fetch('/api/push/subscribe', { method: 'DELETE', body: { endpoint: sub.endpoint } }).catch(() => {})
        await sub.unsubscribe()
      }
      subscribed.value = false
    } finally {
      busy.value = false
    }
  }

  async function sendTest() {
    busy.value = true
    try {
      await $fetch('/api/push/test', { method: 'POST' })
    } finally {
      busy.value = false
    }
  }

  onMounted(() => {
    refresh().catch((e) => console.error('[push]', e))
  })

  return { supported, permission, subscribed, busy, needsInstall, subscribe, unsubscribe, sendTest }
}
