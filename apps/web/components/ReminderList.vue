<script setup lang="ts">
import type { Reminder } from '@garage/shared/types'
import { getReminderStatus, reminderStatusLabels } from '@garage/shared/utils/reminderStatus'
import { reminderTriggerTypeLabels } from '@garage/shared/schemas/reminder'
import { formatDate, formatMileage } from '@garage/shared/utils/format'
import { BellOff, Pencil, Plus, Trash2 } from 'lucide-vue-next'

const props = defineProps<{ carId: number; currentMileage: number }>()

const { reminders, loading, deletingId, fetchReminders, deleteReminder } = useReminders(props.carId)
const { confirm } = useConfirmDialog()

await fetchReminders()

const statusStyles: Record<string, string> = {
  overdue: 'bg-status-overdue-soft text-status-overdue-text',
  soon: 'bg-status-soon-soft text-status-soon-text',
  ok: 'bg-status-ok-soft text-status-ok-text',
  inactive: 'bg-status-inactive-soft text-status-inactive-text',
}

function status(reminder: Reminder) {
  return getReminderStatus(reminder, props.currentMileage)
}

const sortedReminders = computed(() => {
  const order: Record<string, number> = { overdue: 0, soon: 1, ok: 2, inactive: 3 }
  return [...reminders.value].sort((a, b) => order[status(a)] - order[status(b)])
})

async function onDelete(reminder: Reminder) {
  const ok = await confirm({
    title: 'Удалить напоминание?',
    message: `«${reminder.title}» будет удалено безвозвратно.`,
    confirmText: 'Удалить',
    danger: true,
  })
  if (!ok) return
  await deleteReminder(reminder.id)
}

function dueText(reminder: Reminder) {
  const parts: string[] = []
  if (reminder.nextDueDate) parts.push(formatDate(reminder.nextDueDate))
  if (reminder.nextDueMileage != null) parts.push(formatMileage(reminder.nextDueMileage))
  return parts.length ? parts.join(' · ') : 'Не задано'
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mb-4">
      <h2 class="text-h2 text-text">Напоминания</h2>
      <UiButton :to="`/cars/${carId}/reminders/new`" size="sm" :icon="Plus">
        Добавить напоминание
      </UiButton>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-8 text-text-2">
      <UiSpinner size="md" />
    </div>
    <div v-else-if="!reminders.length" class="card p-8 text-center">
      <BellOff class="mx-auto mb-2 h-7 w-7 text-text-3" aria-hidden="true" />
      <p class="text-text-2 text-sm">Напоминаний пока нет.</p>
    </div>

    <div v-else class="space-y-2">
      <div v-for="reminder in sortedReminders" :key="reminder.id" class="card p-4">
        <div class="flex items-start gap-2.5">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-start gap-x-2 gap-y-1">
              <p class="font-medium text-text leading-snug flex-1 min-w-[140px]">
                {{ reminder.title }}
                <span
                  class="ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="statusStyles[status(reminder)]"
                >
                  {{ reminderStatusLabels[status(reminder)] }}
                </span>
              </p>
              <div class="flex items-center gap-1 shrink-0 ml-auto">
                <NuxtLink
                  :to="`/cars/${carId}/reminders/${reminder.id}`"
                  class="flex h-7 w-7 items-center justify-center rounded-md bg-surface-2 text-text-2 hover:bg-surface-3 hover:text-text transition-colors"
                  :class="{ 'pointer-events-none opacity-50': deletingId === reminder.id }"
                  title="Изменить"
                  aria-label="Изменить"
                >
                  <Pencil class="h-4 w-4" aria-hidden="true" />
                </NuxtLink>
                <button
                  :disabled="deletingId === reminder.id"
                  class="flex h-7 w-7 items-center justify-center rounded-md bg-danger-soft text-danger hover:bg-danger-soft hover:text-danger-text disabled:opacity-50 transition-colors"
                  title="Удалить"
                  aria-label="Удалить"
                  @click="onDelete(reminder)"
                >
                  <UiSpinner v-if="deletingId === reminder.id" />
                  <Trash2 v-else class="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
            <p v-if="reminder.category" class="text-sm text-text-3 mt-0.5">
              {{ reminder.category.name }}
            </p>
            <p class="text-sm text-text-2 mt-0.5">
              {{ reminderTriggerTypeLabels[reminder.triggerType] }} · {{ dueText(reminder) }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
