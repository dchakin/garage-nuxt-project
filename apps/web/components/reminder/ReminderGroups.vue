<script setup lang="ts">
import { computed } from 'vue'
import type { Reminder, ReminderStatus } from '@garage/shared/types'
import { groupRemindersByStatus } from '@garage/shared/utils/reminderBadge'
import UiReminderCard from '~/components/ui/ReminderCard.vue'
import { reminderStatusLabels } from '@garage/shared/utils/reminderStatus'
import UiStatusBadge from '~/components/ui/StatusBadge.vue'

/**
 * Список напоминаний экрана «Напоминания» (Г1): группы «Просрочено / Скоро / В порядке /
 * Выключено», в каждой — `UiReminderCard` (тот же вид, что в «Требует внимания»). Пустые группы
 * не выводятся. Открытие карточки и «Сделал» поднимаются наверх.
 */
const props = defineProps<{
  reminders: Reminder[]
  currentMileage: number
  avgKmPerMonth: number | null
  today?: string
}>()

defineEmits<{ open: [reminder: Reminder]; done: [reminder: Reminder] }>()

const groups = computed(() =>
  groupRemindersByStatus(props.reminders, props.currentMileage, props.today),
)
</script>

<template>
  <div class="flex flex-col gap-sp-6">
    <section
      v-for="group in groups"
      :key="group.status"
      :data-testid="`reminder-group-${group.status}`"
      :aria-labelledby="`reminder-group-${group.status}`"
    >
      <h2 :id="`reminder-group-${group.status}`" class="flex">
        <UiStatusBadge :status="group.status">
          {{ reminderStatusLabels[group.status] }} · {{ group.reminders.length }}
        </UiStatusBadge>
      </h2>
      <ul class="mt-sp-2 flex flex-col gap-sp-3">
        <li v-for="reminder in group.reminders" :key="reminder.id">
          <UiReminderCard
            :reminder="reminder"
            :current-mileage="currentMileage"
            :avg-km-per-month="avgKmPerMonth"
            :today="today"
            @open="$emit('open', reminder)"
            @done="$emit('done', reminder)"
          />
        </li>
      </ul>
    </section>
  </div>
</template>
