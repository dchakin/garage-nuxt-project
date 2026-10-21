import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { RESEND_DELAY_SECONDS, useResendTimer } from '~/composables/useResendTimer'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useResendTimer', () => {
  it('до запуска не активен', () => {
    const timer = useResendTimer()
    expect(timer.isActive.value).toBe(false)
    expect(timer.remaining.value).toBe(0)
  })

  it('после start отсчитывает 60 секунд и отпускает кнопку', () => {
    const timer = useResendTimer()
    timer.start()
    expect(timer.remaining.value).toBe(RESEND_DELAY_SECONDS)
    expect(timer.isActive.value).toBe(true)

    vi.advanceTimersByTime(10_000)
    expect(timer.remaining.value).toBe(RESEND_DELAY_SECONDS - 10)

    vi.advanceTimersByTime((RESEND_DELAY_SECONDS - 10) * 1000)
    expect(timer.remaining.value).toBe(0)
    expect(timer.isActive.value).toBe(false)

    vi.advanceTimersByTime(5_000)
    expect(timer.remaining.value).toBe(0)
  })

  it('повторный start начинает с полной паузы', () => {
    const timer = useResendTimer(5)
    timer.start()
    vi.advanceTimersByTime(3_000)
    timer.start()
    expect(timer.remaining.value).toBe(5)
    vi.advanceTimersByTime(1_000)
    expect(timer.remaining.value).toBe(4)
  })

  it('останавливается вместе со scope', () => {
    const scope = effectScope()
    const timer = scope.run(() => useResendTimer(5))!
    timer.start()
    scope.stop()
    vi.advanceTimersByTime(3_000)
    expect(timer.remaining.value).toBe(5)
  })
})
