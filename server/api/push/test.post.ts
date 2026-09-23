export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)

  const delivered = await sendPushToUser(user.id, {
    title: 'Гараж',
    body: 'Тестовое уведомление: push работает 👍',
    url: '/cars',
    tag: 'test'
  })
  if (!delivered) {
    throw createError({ statusCode: 400, statusMessage: 'Нет активных подписок на уведомления' })
  }

  return { delivered }
})
