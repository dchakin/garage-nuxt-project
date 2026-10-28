<script setup lang="ts">
/**
 * Шторка обновления пробега (Б5–Б7): поле, быстрые «+100 / +500 / +1 000» (прибавляют к «Было»,
 * а не к введённому), блок «Изменится N напоминаний» — только если у кого-то меняется остаток
 * или статус (`diffReminderStatuses`). Пробег меньше прежнего (Б7) — ошибка, «Исправить на X км»
 * (`confirmDecrease: true`) и «Вернуть Y». Состояние открытия — `useMileageSheet()`, компонент
 * стоит в `layouts/car.vue`. Пробег сохраняется без создания записи.
 */
import { computed, ref, watch } from 'vue'
import { MAX_MILEAGE_KM } from '@garage/shared/schemas/car'
import { formatMileage, formatNumber, pluralize, todayIso } from '@garage/shared/utils/format'
import { describeMileageChange, diffReminderStatuses } from '@garage/shared/utils/mileageImpact'
import { Bell, Gauge } from 'lucide-vue-next'
import { formatMileageAgePhrase } from '~/utils/mileageAge'

const FORM_ID = 'mileage-sheet-form'
/** Быстрые кнопки: на сколько км прибавить к прежнему пробегу */
const QUICK_STEPS_KM = [100, 500, 1_000]
const REMINDER_FORMS = ['напоминание', 'напоминания', 'напоминаний'] as const

const { isOpen, close, notifySaved } = useMileageSheet()
const { car, refreshCurrentCar } = useCurrentCar()
const carId = computed(() => car.value?.id ?? 0)
const { reminders, fetchReminders } = useReminders(carId)
const { updateMileage, saving } = useCars()
const toast = useToast()

/** Пробег на момент открытия шторки — «Было» */
const was = ref(0)
const wasUpdatedAt = ref<string | null>(null)
const value = ref<number | null>(null)
const serverError = ref('')
const today = ref(todayIso())
const remindersLoaded = ref(false)

const wasText = computed(() => {
  const age = formatMileageAgePhrase(wasUpdatedAt.value, today.value)
  return `Было ${formatMileage(was.value)}${age ? ` · обновлено ${age}` : ''}. Кнопки ниже прибавляют к этому числу.`
})
const decreaseKm = computed(() =>
  value.value != null && value.value < was.value ? was.value - value.value : 0,
)
const tooBig = computed(() => value.value != null && value.value > MAX_MILEAGE_KM)
/** Один изменившийся срок пишем одной строкой: «Замена масла: …. Новых push не будет — …» */
const impactNote = computed(() => {
  if (impact.value.willPush) return 'Пришлём push о напоминаниях, чей срок подошёл.'
  if (staysOverdue.value) return 'Новых push не будет — об этом сроке уже напоминали.'
  return ''
})
const singleChangeText = computed(() => {
  const [change] = impact.value.changes
  return impact.value.changes.length === 1
    ? `${describeMileageChange(change)}. ${impactNote.value}`.trim()
    : ''
})
const canSubmit = computed(
  () => value.value != null && value.value !== was.value && !tooBig.value && !saving.value,
)
const impact = computed(() =>
  value.value == null || decreaseKm.value || tooBig.value || !remindersLoaded.value
    ? { changes: [], willPush: false }
    : diffReminderStatuses(reminders.value, was.value, value.value, today.value),
)
/** Кто-то из изменившихся уже просрочен и остаётся просроченным: о нём уже напоминали */
const staysOverdue = computed(() =>
  impact.value.changes.some((change) => change.statusAfter === 'overdue' && !change.willPush),
)
const impactTitle = computed(
  () =>
    `Изменится ${impact.value.changes.length} ${pluralize(impact.value.changes.length, REMINDER_FORMS)}`,
)
const submitLabel = computed(() => {
  if (saving.value) return 'Сохраняем…'
  if (decreaseKm.value && value.value != null) return `Исправить на ${formatMileage(value.value)}`
  return 'Сохранить пробег'
})

function addQuickStep(stepKm: number) {
  value.value = Math.min(was.value + stepKm, MAX_MILEAGE_KM)
}

function restoreWas() {
  value.value = was.value
}

watch(isOpen, (opened) => {
  if (!opened || !car.value) return
  was.value = car.value.currentMileage
  wasUpdatedAt.value = car.value.mileageUpdatedAt
  value.value = car.value.currentMileage
  serverError.value = ''
  today.value = todayIso()
  remindersLoaded.value = false
  fetchReminders({ isActive: true })
    .then(() => (remindersLoaded.value = true))
    .catch(() => {})
})

async function submit() {
  if (!canSubmit.value || value.value == null) return
  serverError.value = ''
  const mileage = value.value
  try {
    await updateMileage(carId.value, {
      mileage,
      ...(decreaseKm.value ? { confirmDecrease: true } : {}),
    })
  } catch (error: any) {
    serverError.value = error?.data?.statusMessage || 'Не удалось сохранить пробег'
    return
  }
  close()
  notifySaved()
  toast.show({ message: `Пробег обновлён: ${formatMileage(mileage)}` })
  refreshCurrentCar().catch(() => {})
}
</script>

<template>
  <UiSheet v-model:open="isOpen" title="Обновить пробег">
    <form :id="FORM_ID" class="flex flex-col gap-sp-4 pb-sp-2" novalidate @submit.prevent="submit">
      <UiAlert
        v-if="serverError"
        variant="error"
        title="Не удалось сохранить"
        :message="serverError"
      />
      <p class="flex items-start gap-sp-2 text-sm text-text-2" data-testid="mileage-was">
        <Gauge class="mt-px h-5 w-5 shrink-0" aria-hidden="true" />
        <span>{{ wasText }}</span>
      </p>
      <UiAmountField
        v-model="value"
        label="Сейчас на одометре"
        suffix="км"
        :decimals="0"
        autofocus
        :invalid="Boolean(decreaseKm) || tooBig"
      />
      <div class="flex flex-wrap gap-sp-2">
        <UiChip v-for="stepKm in QUICK_STEPS_KM" :key="stepKm" @click="addQuickStep(stepKm)">
          +{{ formatMileage(stepKm) }}
        </UiChip>
      </div>
      <UiAlert
        v-if="decreaseKm"
        variant="error"
        :title="`Меньше прежнего на ${formatMileage(decreaseKm)}`"
        message="Пробег не может уменьшаться. Если раньше ввели с опечаткой — исправьте: напоминания пересчитаем от нового числа."
      />
      <UiAlert
        v-else-if="tooBig"
        variant="error"
        :title="`Не больше ${formatMileage(MAX_MILEAGE_KM)}`"
      />
      <UiAlert
        v-else-if="impact.changes.length"
        variant="warning"
        :icon="Bell"
        :title="impactTitle"
        data-testid="mileage-impact"
      >
        <p v-if="singleChangeText">{{ singleChangeText }}</p>
        <template v-else>
          <ul class="flex flex-col gap-sp-1">
            <li v-for="change in impact.changes" :key="change.reminder.id">
              {{ describeMileageChange(change) }}
            </li>
          </ul>
          <p v-if="impactNote" class="mt-sp-2">{{ impactNote }}</p>
        </template>
      </UiAlert>
      <UiButton v-if="decreaseKm" variant="text" class="w-full" @click="restoreWas">
        Вернуть {{ formatNumber(was) }}
      </UiButton>
    </form>
    <template #footer>
      <UiButton
        type="submit"
        :form="FORM_ID"
        class="w-full"
        :loading="saving"
        :disabled="!canSubmit"
      >
        {{ submitLabel }}
      </UiButton>
    </template>
  </UiSheet>
</template>
