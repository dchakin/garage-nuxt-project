import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Entry } from '@garage/shared/types'

const entry = { id: 12, carId: 7 } as Entry

/** Свежий модуль на каждый тест: состояние шторки модульное. */
async function loadSheet() {
  vi.resetModules()
  const { useEntryDetailSheet } = await import('~/composables/useEntryDetailSheet')
  return useEntryDetailSheet()
}

describe('useEntryDetailSheet', () => {
  beforeEach(() => vi.resetModules())

  it('open кладёт запись и открывает шторку, close закрывает', async () => {
    const sheet = await loadSheet()
    sheet.open(entry)
    expect(sheet.isOpen.value).toBe(true)
    expect(sheet.entry.value?.id).toBe(12)

    sheet.close()
    expect(sheet.isOpen.value).toBe(false)
  })

  it('hide прячет запись один раз, restore возвращает', async () => {
    const sheet = await loadSheet()
    sheet.hide(12)
    sheet.hide(12)
    expect(sheet.hiddenIds.value).toEqual([12])

    sheet.restore(12)
    expect(sheet.hiddenIds.value).toEqual([])
  })

  it('notifyChanged растит счётчик для перечитывания списков', async () => {
    const sheet = await loadSheet()
    sheet.notifyChanged()
    sheet.notifyChanged()
    expect(sheet.changedCount.value).toBe(2)
  })
})
