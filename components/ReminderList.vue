<script setup lang="ts">
import type { Reminder } from '~~/shared/types'
import { getReminderStatus, reminderStatusLabels } from '~~/shared/utils/reminderStatus'
import { reminderTriggerTypeLabels } from '~~/shared/schemas/reminder'

const props = defineProps<{ carId: number; currentMileage: number }>()

const { reminders, loading, deletingId, fetchReminders, deleteReminder } = useReminders(props.carId)
const { confirm } = useConfirmDialog()

await fetchReminders()

const statusStyles: Record<string, string> = {
  overdue: 'bg-red-100 text-red-700',
  soon: 'bg-amber-100 text-amber-700',
  ok: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-slate-100 text-slate-500'
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
    danger: true
  })
  if (!ok) return
  await deleteReminder(reminder.id)
}

function dueText(reminder: Reminder) {
  const parts: string[] = []
  if (reminder.nextDueDate) parts.push(reminder.nextDueDate)
  if (reminder.nextDueMileage != null) parts.push(`${reminder.nextDueMileage.toLocaleString('ru-RU')} км`)
  return parts.length ? parts.join(' · ') : 'Не задано'
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-slate-800">Напоминания</h2>
      <NuxtLink :to="`/cars/${carId}/reminders/new`" class="btn-primary px-3 py-1.5 text-sm">
        + Добавить напоминание
      </NuxtLink>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-8 text-slate-500">
      <Spinner size="md" />
    </div>
    <div v-else-if="!reminders.length" class="card p-8 text-center">
      <div class="text-3xl mb-2">⏰</div>
      <p class="text-slate-500 text-sm">Напоминаний пока нет.</p>
    </div>

    <div v-else class="space-y-2">
      <div v-for="reminder in sortedReminders" :key="reminder.id" class="card p-4">
        <div class="flex items-start gap-2.5">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-start gap-x-2 gap-y-1">
              <p class="font-medium text-slate-800 leading-snug flex-1 min-w-[140px]">
                {{ reminder.title }}
                <span class="ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" :class="statusStyles[status(reminder)]">
                  {{ reminderStatusLabels[status(reminder)] }}
                </span>
              </p>
              <div class="flex items-center gap-1 shrink-0 ml-auto">
                <NuxtLink
                  :to="`/cars/${carId}/reminders/${reminder.id}`"
                  class="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
                  :class="{ 'pointer-events-none opacity-50': deletingId === reminder.id }"
                  title="Изменить"
                  aria-label="Изменить"
                >
                  <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M13.5 3.5a1.5 1.5 0 0 1 2 2l-9 9-3 1 1-3 9-9Z" />
                  </svg>
                </NuxtLink>
                <button
                  :disabled="deletingId === reminder.id"
                  class="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 disabled:opacity-50 transition-colors"
                  title="Удалить"
                  aria-label="Удалить"
                  @click="onDelete(reminder)"
                >
                  <Spinner v-if="deletingId === reminder.id" />
                  <svg v-else class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6m2 0-.6 9.4a1.5 1.5 0 0 1-1.5 1.4H8.1a1.5 1.5 0 0 1-1.5-1.4L6 6" />
                  </svg>
                </button>
              </div>
            </div>
            <p v-if="reminder.category" class="text-sm text-slate-400 mt-0.5">{{ reminder.category.name }}</p>
            <p class="text-sm text-slate-500 mt-0.5">
              {{ reminderTriggerTypeLabels[reminder.triggerType] }} · {{ dueText(reminder) }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
