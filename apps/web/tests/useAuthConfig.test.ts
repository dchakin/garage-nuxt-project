import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetAuthConfig, useAuthConfig } from '~/composables/useAuthConfig'

const fetchMock = vi.fn()

beforeEach(() => {
  resetAuthConfig()
  fetchMock.mockReset()
  vi.stubGlobal('$fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useAuthConfig', () => {
  it('до ответа сервера восстановления пароля нет', () => {
    expect(useAuthConfig().passwordReset.value).toBe(false)
  })

  it('берёт passwordReset с GET /api/auth/config', async () => {
    fetchMock.mockResolvedValue({ passwordReset: true })
    const { passwordReset, fetchAuthConfig } = useAuthConfig()

    await fetchAuthConfig()

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/config')
    expect(passwordReset.value).toBe(true)
  })

  it('запрашивает конфиг один раз', async () => {
    fetchMock.mockResolvedValue({ passwordReset: false })
    const { fetchAuthConfig } = useAuthConfig()

    await fetchAuthConfig()
    await fetchAuthConfig()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('при сбое не бросает, ссылка скрыта, следующий вызов пробует снова', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'))
    const { passwordReset, fetchAuthConfig } = useAuthConfig()

    await expect(fetchAuthConfig()).resolves.toBeUndefined()
    expect(passwordReset.value).toBe(false)

    fetchMock.mockResolvedValue({ passwordReset: true })
    await fetchAuthConfig()
    expect(passwordReset.value).toBe(true)
  })
})
