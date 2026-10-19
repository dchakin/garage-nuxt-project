<script setup lang="ts">
import { computed } from 'vue'
import type { Reminder } from '@garage/shared/types'
import { pickAttentionReminders } from '@garage/shared/utils/reminderBadge'
import UiReminderCard from '~/components/ui/ReminderCard.vue'
import UiSectionHeader from '~/components/ui/SectionHeader.vue'

/**
 * «Требует внимания» на Обзоре: до 3 просроченных/скорых напоминаний и ссылка «Все сроки».
 * Если внимания ничего не требует — блок не рендерится. Открытие карточки и «Сделал»
 * подключатся в этапе 8.
 */
const props = defineProps<{
  carId: number
  reminders: Reminder[]
  currentMileage: number
  avgKmPerMonth: number | null
  today?: string
}>()

const attention = computed(() =>
  pickAttentionReminders(props.reminders, props.currentMileage, props.today),
)
</script>

<template>
  <section v-if="attention.length">
    <UiSectionHeader
      title="Требует внимания"
      :to="`/cars/${carId}/reminders`"
      link-label="Все сроки"
    />
    <ul class="mt-sp-2 flex flex-col gap-sp-3">
      <li v-for="reminder in attention" :key="reminder.id">
        <UiReminderCard
          :reminder="reminder"
          :current-mileage="currentMileage"
          :avg-km-per-month="avgKmPerMonth"
          :today="today"
        />
      </li>
    </ul>
  </section>
</template>
