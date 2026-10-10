export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)

  // Просроченный/битый Bearer — это 401 (клиент обновит токен), а не «гость»: null только без credentials
  if (!user && getRequestHeader(event, 'authorization')) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  return user || null
})
