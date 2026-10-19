import { afterEach, describe, expect, it, vi } from 'vitest'

/** Свежий модуль на каждый тест: состояние модульное, слушатели вешаются один раз. */
async function loadUseOnline(initiallyOnline: boolean) {
  vi.resetModules()
  vi.stubGlobal('navigator', { onLine: initiallyOnline })
  return (await import('~/composables/useOnline')).useOnline
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('useOnline', () => {
  it('берёт начальное состояние из navigator.onLine', async () => {
    expect((await loadUseOnline(false))().online.value).toBe(false)
    expect((await loadUseOnline(true))().online.value).toBe(true)
  })

  it('следит за событиями offline и online', async () => {
    const { online } = (await loadUseOnline(true))()

    window.dispatchEvent(new Event('offline'))
    expect(online.value).toBe(false)

    window.dispatchEvent(new Event('online'))
    expect(online.value).toBe(true)
  })

  it('lastOnlineAt — момент потери сети, повторный offline его не сдвигает', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 10, 9, 12))
    const { lastOnlineAt } = (await loadUseOnline(true))()

    vi.setSystemTime(new Date(2026, 9, 10, 9, 30))
    window.dispatchEvent(new Event('offline'))
    expect(lastOnlineAt.value).toEqual(new Date(2026, 9, 10, 9, 30))

    vi.setSystemTime(new Date(2026, 9, 10, 9, 40))
    window.dispatchEvent(new Event('offline'))
    expect(lastOnlineAt.value).toEqual(new Date(2026, 9, 10, 9, 30))

    window.dispatchEvent(new Event('online'))
    expect(lastOnlineAt.value).toEqual(new Date(2026, 9, 10, 9, 40))
  })

  it('повторный вызов отдаёт то же состояние и не дублирует слушатели', async () => {
    const addListener = vi.spyOn(window, 'addEventListener')
    const useOnline = await loadUseOnline(true)
    useOnline()
    const { online } = useOnline()

    expect(addListener.mock.calls.filter(([type]) => type === 'offline')).toHaveLength(1)
    window.dispatchEvent(new Event('offline'))
    expect(online.value).toBe(false)
    addListener.mockRestore()
  })
})
