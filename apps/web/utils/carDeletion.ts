import { pluralize } from '@garage/shared/utils/format'

const ENTRY_FORMS = ['запись', 'записи', 'записей'] as const
const REMINDER_FORMS = ['напоминание', 'напоминания', 'напоминаний'] as const

export interface CarDeletionSummary {
  entriesCount: number
  remindersCount: number
  /** Имена участников, которые потеряют доступ (без владельца) */
  memberNames: string[]
}

/** «Анна», «Анна и Сергей», «Анна, Сергей и Олег» */
function joinNames(names: string[]): string {
  if (names.length < 2) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} и ${names[names.length - 1]}`
}

/** Текст диалога «Удалить машину» (И2): что удалится и кто потеряет доступ. */
export function describeCarDeletion(summary: CarDeletionSummary): string {
  const { entriesCount, remindersCount, memberNames } = summary
  const sentences = [
    `Вместе с машиной удалятся ${entriesCount} ${pluralize(entriesCount, ENTRY_FORMS)} и ${remindersCount} ${pluralize(remindersCount, REMINDER_FORMS)}.`,
  ]
  if (memberNames.length) {
    const verb = memberNames.length === 1 ? 'потеряет' : 'потеряют'
    sentences.push(`${joinNames(memberNames)} ${verb} доступ.`)
  }
  sentences.push('Это нельзя отменить.')
  return sentences.join(' ')
}
