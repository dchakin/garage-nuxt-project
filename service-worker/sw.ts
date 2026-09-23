/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import type { PushPayload } from '../shared/schemas/push'

declare const self: ServiceWorkerGlobalScope

// registerType: 'autoUpdate' — новая версия воркера активируется сразу
self.skipWaiting()
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('push', (event) => {
  let payload: PushPayload = { title: 'Гараж', body: '' }
  try {
    payload = { ...payload, ...event.data?.json() }
  } catch {
    payload.body = event.data?.text() ?? ''
  }

  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    tag: payload.tag,
    icon: '/pwa-192x192.png',
    badge: '/pwa-64x64.png',
    lang: 'ru',
    data: { url: payload.url ?? '/' }
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url ?? '/', self.location.origin).href

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    // Если приложение уже открыто — переиспользуем вкладку, иначе открываем новую
    const client = windows.find((w) => new URL(w.url).origin === self.location.origin)
    if (client) {
      await client.focus()
      await client.navigate(url)
    } else {
      await self.clients.openWindow(url)
    }
  })())
})
