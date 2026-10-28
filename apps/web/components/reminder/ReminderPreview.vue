<script setup lang="ts">
/**
 * Предпросмотр срока напоминания (Е1/Е2/Е4) одним `UiAlert`: info «Следующее напоминание» /
 * «Если включить» (выключенное, Е4) или warning «Срок уже прошёл» с полным объяснением.
 */
import { computed } from 'vue'
import { CalendarClock } from 'lucide-vue-next'
import { formatDate, formatMileage } from '@garage/shared/utils/format'
import { describeLastPoint, describeUpcomingDue } from '@garage/shared/utils/reminderNextDue'
import type { ReminderPreview } from '@garage/shared/utils/reminderPreview'
import { getReminderRemaining } from '@garage/shared/utils/reminderRemaining'
import UiAlert from '~/components/ui/Alert.vue'

const props = withDefaults(
  defineProps<{
    preview: ReminderPreview | null
    currentMileage: number
    intervalKm: number | null
    intervalMonths: number | null
    /** «Последний раз» из формы: пустые значения — отсчёт с сегодня */
    last: { date: string | null; mileage: number | null }
    today?: string
    /** Заголовок обычного (не просроченного) предпросмотра: у выключенного (Е4) — «Если включить» */
    label?: string
  }>(),
  { today: undefined, label: 'Следующее напоминание' },
)

const EMPTY_TEXT = 'Заполните км или месяцы — покажем, когда сработает.'

const lastPoint = computed(() => describeLastPoint(props.last, props.today))

/** «От 14 фев · 77 200 км срок был на 87 200 км — просрочено на 250 км. …» */
const overdueText = computed(() => {
  if (!props.preview?.isOverdue) return ''
  const { nextDueDate, nextDueMileage } = props.preview
  const remaining = getReminderRemaining(
    { isActive: true, nextDueDate, nextDueMileage, intervalKm: props.intervalKm },
    { currentMileage: props.currentMileage, today: props.today },
  )
  const dueAt =
    remaining.dimension === 'mileage' && nextDueMileage != null
      ? `на ${formatMileage(nextDueMileage)}`
      : nextDueDate
        ? formatDate(nextDueDate, props.today)
        : ''
  const was = lastPoint.value ? `От ${lastPoint.value} срок был` : 'Срок был'
  return `${was} ${dueAt} — просрочено ${remaining.detail}. Напоминание сразу появится в «Требует внимания».`
})

const upcomingText = computed(() =>
  props.preview
    ? describeUpcomingDue(
        {
          nextDue: props.preview,
          intervalKm: props.intervalKm,
          intervalMonths: props.intervalMonths,
          last: props.last,
        },
        props.today,
      )
    : null,
)
</script>

<template>
  <div data-testid="reminder-preview">
    <UiAlert
      v-if="preview?.isOverdue"
      variant="warning"
      title="Срок уже прошёл"
      :message="overdueText"
    />
    <UiAlert
      v-else
      variant="info"
      :icon="CalendarClock"
      :title="label"
      :message="upcomingText ?? EMPTY_TEXT"
    />
  </div>
</template>
