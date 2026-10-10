import { refreshSchema } from '@garage/shared/schemas/auth'

export default defineEventHandler(async (event) => {
  const { refreshToken } = await readValidatedBody(event, refreshSchema.parse)
  return { tokens: await rotateRefreshToken(refreshToken) }
})
