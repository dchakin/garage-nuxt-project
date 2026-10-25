import { describe, expect, it } from 'vitest'
import { disablePinchZoom } from '../utils/disablePinchZoom'

describe('disablePinchZoom', () => {
  it('отменяет gesturestart', () => {
    const stop = disablePinchZoom(document)
    const event = new Event('gesturestart', { cancelable: true })
    document.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    stop()
  })

  it('после снятия обработчика событие не отменяется', () => {
    const stop = disablePinchZoom(document)
    stop()
    const event = new Event('gesturestart', { cancelable: true })
    document.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })
})
