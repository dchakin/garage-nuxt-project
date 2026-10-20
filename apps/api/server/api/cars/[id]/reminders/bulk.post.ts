import { db, schema } from '../../../../database'
import { reminderBulkSchema } from '@garage/shared/schemas/reminder'
import { deriveTriggerType } from '@garage/shared/utils/reminderTrigger'
import { todayIso } from '@garage/shared/utils/format'
import { computeNextDue } from '@garage/shared/utils/reminderDue'

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event)
  const carId = Number(getRouterParam(event, 'id'))
  const { car } = await requireCarAccess(carId, user.id)

  const body = await readValidatedBody(event, reminderBulkSchema.parse)
  const today = todayIso()

  const rows = body.reminders.map((item) => {
    const triggerType = deriveTriggerType({
      intervalKm: item.intervalKm,
      intervalMonths: item.intervalMonths,
      nextDueDate: item.nextDueDate,
    })
    const { nextDueDate, nextDueMileage } = computeNextDue({
      triggerType,
      // явный срок («Полис действует до») важнее расчёта от интервала
      intervalMonths: item.nextDueDate ? null : item.intervalMonths,
      intervalKm: item.intervalKm,
      lastEntry: {
        date: item.last?.date ?? today,
        mileage: item.last?.mileage ?? car.currentMileage,
      },
      nextDueDateOverride: item.nextDueDate,
    })
    return {
      carId,
      title: item.title,
      categoryId: item.categoryId ?? null,
      triggerType,
      intervalMonths: item.intervalMonths ?? null,
      intervalKm: item.intervalKm ?? null,
      nextDueDate,
      nextDueMileage,
      isActive: true,
    }
  })

  return db.transaction((tx) =>
    rows.map((row) => tx.insert(schema.reminders).values(row).returning().get()),
  )
})
