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
import { formatMileageAge } from '~/utils/mileageAge'

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
  const age = formatMileageAge(wasUpdatedAt.value, today.value)
  return `Было ${formatMileage(was.value)}${age ? ` · ${age}` : ''}. Кнопки ниже прибавляют к этому числу.`
})
const decreaseKm = computed(() =>
  value.value != null && value.value < was.value ? was.value - value.value : 0,
)
const tooBig = computed(() => value.value != null && value.value > MAX_MILEAGE_KM)
const fieldError = computed(() => {
  if (decreaseKm.value) return 'Меньше прежнего'
  if (tooBig.value) return `Не больше ${formatMileage(MAX_MILEAGE_KM)}`
  return undefined
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
  return 'Сохранить'
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
      <UiField
        v-model="value"
        type="number"
        label="Новый пробег"
        suffix="км"
        autofocus
        :error="fieldError"
      />
      <p class="-mt-sp-2 text-sm text-text-2" data-testid="mileage-was">{{ wasText }}</p>
      <div class="grid grid-cols-3 gap-sp-2">
        <UiButton
          v-for="stepKm in QUICK_STEPS_KM"
          :key="stepKm"
          variant="tonal"
          size="sm"
          @click="addQuickStep(stepKm)"
        >
          +{{ formatMileage(stepKm) }}
        </UiButton>
      </div>
      <UiAlert
        v-if="decreaseKm"
        variant="error"
        :title="`Меньше прежнего на ${formatMileage(decreaseKm)}`"
        message="Пробег не может уменьшаться. Если раньше ввели с опечаткой — исправьте: напоминания пересчитаем от нового числа."
      />
      <UiAlert
        v-else-if="impact.changes.length"
        variant="warning"
        :title="impactTitle"
        data-testid="mileage-impact"
      >
        <ul class="flex flex-col gap-sp-1">
          <li v-for="change in impact.changes" :key="change.reminder.id">
            {{ describeMileageChange(change) }}
          </li>
        </ul>
        <p v-if="impact.willPush" class="mt-sp-2">Пришлём push о напоминаниях, чей срок подошёл.</p>
        <p v-else-if="staysOverdue" class="mt-sp-2">
          Новых push не будет — об этом сроке уже напоминали.
        </p>
      </UiAlert>
    </form>
    <template #footer>
      <div class="flex flex-col gap-sp-2">
        <UiButton
          type="submit"
          :form="FORM_ID"
          class="w-full"
          :loading="saving"
          :disabled="!canSubmit"
        >
          {{ submitLabel }}
        </UiButton>
        <UiButton v-if="decreaseKm" variant="text" class="w-full" @click="restoreWas">
          Вернуть {{ formatNumber(was) }}
        </UiButton>
      </div>
    </template>
  </UiSheet>
</template>
