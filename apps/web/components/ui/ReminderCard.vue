<script setup lang="ts">
import { computed } from 'vue'
import { Check } from 'lucide-vue-next'
import type { Reminder } from '@garage/shared/types'
import { formatDate, formatMileage } from '@garage/shared/utils/format'
import {
  formatReminderInterval,
  getReminderRemaining,
} from '@garage/shared/utils/reminderRemaining'
import { reminderStatusStyles } from '~/utils/reminderStatusStyles'
import UiButton from './Button.vue'
import UiProgress from './Progress.vue'

/** ОСАГО: подсказка «Продлите полис до …» вместо общего «Срок — …» (шаблон по названию) */
const POLICY_TITLE = /осаго/i

/**
 * Карточка напоминания: список напоминаний и «Требует внимания» на Обзоре. Статус и остаток
 * считает сама (`getReminderRemaining`). Вся карточка открывает напоминание (`open`), кнопка
 * «Сделал» — только у просроченных и «скоро» (`done`). Выключенная — бледная, без подсказки.
 */
const props = withDefaults(
  defineProps<{
    reminder: Pick<
      Reminder,
      'title' | 'isActive' | 'nextDueDate' | 'nextDueMileage' | 'intervalKm' | 'intervalMonths'
    >
    currentMileage: number
    avgKmPerMonth?: number | null
    /** `YYYY-MM-DD`, по умолчанию — сегодня */
    today?: string
  }>(),
  { avgKmPerMonth: null, today: undefined },
)

defineEmits<{ open: []; done: [] }>()

const remaining = computed(() =>
  getReminderRemaining(props.reminder, {
    currentMileage: props.currentMileage,
    today: props.today,
    avgKmPerMonth: props.avgKmPerMonth,
  }),
)
const style = computed(() => reminderStatusStyles[remaining.value.status])
const rule = computed(() => formatReminderInterval(props.reminder))
const needsAction = computed(() => ['overdue', 'soon'].includes(remaining.value.status))

/** «Срок был 87 200 км» / «Срок — 18 окт»: точка срока по тому условию, что в остатке */
const hint = computed(() => {
  const { dimension, status } = remaining.value
  const { nextDueDate, nextDueMileage } = props.reminder
  const due =
    dimension === 'mileage' && nextDueMileage != null
      ? formatMileage(nextDueMileage)
      : dimension === 'date' && nextDueDate
        ? formatDate(nextDueDate, props.today)
        : null
  if (!due) return null
  if (status !== 'overdue' && dimension === 'date' && POLICY_TITLE.test(props.reminder.title)) {
    return `Продлите полис до ${due}`
  }
  return status === 'overdue' ? `Срок был ${due}` : `Срок — ${due}`
})
</script>

<template>
  <article
    class="relative overflow-hidden rounded-lg border border-border bg-surface"
    :class="{ 'opacity-60': remaining.status === 'inactive' }"
  >
    <div
      class="flex flex-col gap-sp-3 border-l-[3px] pb-sp-4 pl-[15px] pr-sp-4 pt-3.5"
      :class="style.stripeClass"
    >
      <!-- Две строки: название | статус, правило | остаток. Строки независимы, поэтому правило
           делит место только с остатком (он уже статуса) и не переносится на 390 px -->
      <div class="flex flex-col gap-[3px]">
        <span class="sr-only">{{ remaining.text }}</span>
        <div class="flex items-center justify-between gap-sp-3">
          <h3 class="min-w-0 text-body font-semibold text-text">
            <button
              type="button"
              class="text-left after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:ring-[3px] focus-visible:after:ring-focus-ring"
              @click="$emit('open')"
            >
              {{ reminder.title }}
            </button>
          </h3>
          <span
            class="inline-flex shrink-0 items-center gap-1 text-body font-semibold"
            :class="style.textClass"
            aria-hidden="true"
          >
            <component :is="style.icon" class="h-4 w-4 shrink-0" />
            {{ remaining.headline }}
          </span>
        </div>
        <div v-if="rule || remaining.detail" class="flex items-start justify-between gap-sp-3">
          <p class="min-w-0 text-sm text-text-2">{{ rule }}</p>
          <span
            v-if="remaining.detail"
            class="shrink-0 whitespace-nowrap text-sm text-text-2"
            aria-hidden="true"
          >
            {{ remaining.detail }}
          </span>
        </div>
      </div>
      <UiProgress
        :value="remaining.progress"
        :tone="remaining.status"
        :label="`Прошло до срока: ${reminder.title}`"
      />
      <div v-if="needsAction" class="flex items-center gap-sp-2">
        <p class="min-w-0 flex-1 text-sm text-text-2">{{ hint }}</p>
        <UiButton
          variant="tonal"
          size="sm"
          :icon="Check"
          class="relative z-10"
          @click="$emit('done')"
        >
          Сделал
        </UiButton>
      </div>
    </div>
  </article>
</template>
