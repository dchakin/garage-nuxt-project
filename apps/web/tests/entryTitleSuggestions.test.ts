import { describe, expect, it } from 'vitest'
import { suggestEntryTitles } from '../utils/entryTitleSuggestions'

const entries = [
  { description: 'Замена масла', type: 'maintenance' as const, date: '2026-03-01' },
  { description: 'Замена масла', type: 'maintenance' as const, date: '2026-09-01' },
  { description: 'Замена колодок', type: 'replacement' as const, date: '2026-05-01' },
  { description: 'Мойка', type: 'other' as const, date: '2026-08-01' },
  { description: '   ', type: 'other' as const, date: '2026-08-02' },
]

describe('suggestEntryTitles', () => {
  it('без ввода отдаёт самые частые описания', () => {
    expect(suggestEntryTitles(entries, { query: '' })[0]).toBe('Замена масла')
  })

  it('пропускает пустые описания и не дублирует повторы', () => {
    const titles = suggestEntryTitles(entries, { query: '' })
    expect(titles).toEqual(['Замена масла', 'Мойка', 'Замена колодок'])
  })

  it('сначала описания того же типа', () => {
    expect(suggestEntryTitles(entries, { query: '', type: 'other' })[0]).toBe('Мойка')
  })

  it('фильтрует по вхождению без учёта регистра', () => {
    expect(suggestEntryTitles(entries, { query: 'ЗАМЕНА' })).toEqual([
      'Замена масла',
      'Замена колодок',
    ])
  })

  it('не предлагает описание, совпавшее с вводом целиком', () => {
    expect(suggestEntryTitles(entries, { query: 'мойка' })).toEqual([])
  })

  it('уважает limit', () => {
    expect(suggestEntryTitles(entries, { query: '', limit: 1 })).toHaveLength(1)
  })
})
