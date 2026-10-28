import { entryTypeLabels, type EntryType } from '@garage/shared/schemas/entry'

/** Текст диалога «Удалить запись?»: описание записи, а если его нет — название типа */
export function describeEntryDeletion(entry: { description: string; type: EntryType }): string {
  const name = entry.description.trim() || entryTypeLabels[entry.type]
  return `Запись «${name}» пропадёт из журнала, а её сумма — из расходов.`
}

/** Текст диалога «Удалить напоминание?» */
export function describeReminderDeletion(reminder: { title: string }): string {
  return `Напоминание «${reminder.title}» исчезнет, push по нему приходить не будут.`
}
