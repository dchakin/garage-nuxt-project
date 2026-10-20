import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Reminder } from '@garage/shared/types'

const reminder = { id: 5, carId: 7 } as Reminder

/** Свежий модуль на каждый тест: состояние шторки модульное. */
async function loadSheet() {
  vi.resetModules()
  const { useReminderEditSheet } = await import('~/composables/useReminderEditSheet')
  return useReminderEditSheet()
}

describe('useReminderEditSheet', () => {
  beforeEach(() => vi.resetModules())

  it('open кладёт напоминание и открывает шторку, close закрывает', async () => {
    const sheet = await loadSheet()
    sheet.open(reminder)
    expect(sheet.isOpen.value).toBe(true)
    expect(sheet.reminder.value?.id).toBe(5)

    sheet.close()
    expect(sheet.isOpen.value).toBe(false)
  })

  it('hide прячет напоминание один раз, restore возвращает', async () => {
    const sheet = await loadSheet()
    sheet.hide(5)
    sheet.hide(5)
    expect(sheet.hiddenIds.value).toEqual([5])

    sheet.restore(5)
    expect(sheet.hiddenIds.value).toEqual([])
  })

  it('notifyChanged увеличивает счётчик изменений', async () => {
    const sheet = await loadSheet()
    sheet.notifyChanged()
    sheet.notifyChanged()
    expect(sheet.changedCount.value).toBe(2)
  })
})
