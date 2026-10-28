import { describe, expect, it } from 'vitest'
import { describeJournalSummary } from '~/utils/journalSummary'

const NBSP = ' '

describe('describeJournalSummary', () => {
  const entries = [
    { date: '2026-10-07', cost: 1200 },
    { date: '2026-02-14', cost: 87300 },
  ]

  it('без фильтра — год, число записей и сумма', () => {
    expect(describeJournalSummary(entries, false)).toBe(
      `2026 год · 2 записи · 88${NBSP}500${NBSP}₽`,
    )
  })

  it('при фильтре — без года', () => {
    expect(describeJournalSummary(entries, true)).toBe(`2 записи · 88${NBSP}500${NBSP}₽`)
  })

  it('записи за несколько лет — диапазон; запись без суммы считается нулём', () => {
    expect(
      describeJournalSummary(
        [
          { date: '2025-12-01', cost: null },
          { date: '2026-01-05', cost: 500 },
          { date: '2026-01-06', cost: 500 },
          { date: '2026-01-07', cost: 500 },
          { date: '2026-01-08', cost: 500 },
        ],
        false,
      ),
    ).toBe(`2025–2026 · 5 записей · 2${NBSP}000${NBSP}₽`)
  })
})
