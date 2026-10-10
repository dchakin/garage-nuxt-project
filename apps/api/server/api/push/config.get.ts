// Публичный VAPID-ключ нужен клиенту для подписки. Статический клиент (apps/web) запекает
// runtimeConfig при сборке, а ключ задаётся окружением сервера — поэтому его отдаёт API.
export default defineEventHandler(() => {
  const { public: publicConfig } = useRuntimeConfig()
  return { vapidPublicKey: String(publicConfig.vapidPublicKey || '') }
})
