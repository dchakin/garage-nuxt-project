<script setup lang="ts">
/**
 * Шторка правки напоминания (Е4): поля как в Е1, переключатель «Напоминать» (`isActive`) и
 * «Удалить напоминание» без диалога — через `useDeferredDelete` (И3). Состояние открытия —
 * `useReminderEditSheet()`, компонент стоит в `layouts/car.vue`; шторка же подхватывает запрос
 * «Открыть «…»» из Е3 (`useReminderSheet().openExistingRequest`). Срок при сохранении считает
 * `planReminderEdit` (те же правила, что у сервера).
 */
import { Trash2 } from 'lucide-vue-next'
import type { Reminder } from '@garage/shared/types'
import { todayIso } from '@garage/shared/utils/format'
import { describeLastSource } from '@garage/shared/utils/reminderNextDue'
import { initialLast, planReminderEdit } from '@garage/shared/utils/reminderEdit'

const FORM_ID = 'reminder-edit-form'

const { isOpen, reminder, open, close, hide, restore, notifyChanged } = useReminderEditSheet()
const { openExistingRequest, clearOpenExistingRequest } = useReminderSheet()
const carId = computed(() => reminder.value?.carId ?? 0)
const { updateReminder, saving } = useReminders(carId)
const { car, refreshCurrentCar } = useCurrentCar()
const { scheduleDelete } = useDeferredDelete()
const toast = useToast()

const form = reactive({
  title: '',
  intervalKm: null as number | null,
  intervalMonths: null as number | null,
  categoryId: null as number | null,
  lastDate: '',
  lastMileage: null as number | null,
  isActive: true,
})
const lastTouched = ref(false)
const submitted = ref(false)
const serverError = ref('')
const today = ref(todayIso())

const currentMileage = computed(() =>
  car.value?.id === carId.value ? car.value.currentMileage : 0,
)
const plan = computed(() =>
  reminder.value
    ? planReminderEdit(
        reminder.value,
        {
          intervalKm: form.intervalKm || null,
          intervalMonths: form.intervalMonths || null,
          lastDate: form.lastDate,
          lastMileage: form.lastMileage,
          lastTouched: lastTouched.value,
        },
        { currentMileage: currentMileage.value, today: today.value },
      )
    : null,
)
/** У выключенного напоминания «Срок уже прошёл» не нужен: оно никого не тревожит */
const preview = computed(() =>
  plan.value?.due
    ? { ...plan.value.due, isOverdue: plan.value.due.isOverdue && form.isActive }
    : null,
)
const titleError = computed(() =>
  submitted.value && !form.title.trim() ? 'Укажите название' : undefined,
)
const intervalError = computed(() =>
  submitted.value && plan.value && !plan.value.valid
    ? 'Укажите, как часто напоминать: по пробегу или по времени'
    : undefined,
)
const toggleSubtitle = computed(() =>
  form.isActive
    ? 'Включено — пришлём push, когда подойдёт срок'
    : 'Выключено — push не приходят, в счётчике не учитывается',
)
const lastText = computed(() => {
  const entry = reminder.value?.lastEntry
  return describeLastSource(
    { date: form.lastDate || null, mileage: form.lastMileage },
    {
      fromJournal: !!entry && !lastTouched.value,
      today: today.value,
      note: entry?.description || entry?.category?.name,
    },
  )
})

function fillForm(source: Reminder) {
  const last = initialLast(source)
  today.value = todayIso()
  Object.assign(form, {
    title: source.title,
    intervalKm: source.intervalKm,
    intervalMonths: source.intervalMonths,
    categoryId: source.categoryId,
    lastDate: last.date,
    lastMileage: last.mileage,
    isActive: source.isActive,
  })
  lastTouched.value = false
  submitted.value = false
  serverError.value = ''
}

watch(isOpen, (opened) => {
  if (!opened || !reminder.value) return
  fillForm(reminder.value)
})

// Е3 «Открыть «…»»: шторка создания закрылась и попросила показать существующее напоминание
watch(
  openExistingRequest,
  (requested) => {
    if (!requested) return
    open(requested)
    clearOpenExistingRequest()
  },
  { immediate: true },
)

async function submit() {
  submitted.value = true
  serverError.value = ''
  const target = reminder.value
  if (!target || !plan.value || !form.title.trim() || !plan.value.valid) return
  try {
    await updateReminder(target.id, {
      title: form.title.trim(),
      categoryId: form.categoryId,
      intervalKm: form.intervalKm || null,
      intervalMonths: form.intervalMonths || null,
      isActive: form.isActive,
      ...plan.value.patch,
    })
  } catch (error: any) {
    serverError.value = error?.data?.statusMessage || 'Не удалось сохранить напоминание'
    return
  }
  close()
  notifyChanged()
  toast.show({ message: 'Изменения сохранены' })
  refreshCurrentCar().catch(() => {})
}

function removeReminder() {
  const target = reminder.value
  if (!target) return
  hide(target.id)
  close()
  scheduleDelete({
    key: `reminder:${target.id}`,
    message: 'Напоминание удалено',
    run: async ({ keepalive }) => {
      await $fetch(`/api/reminders/${target.id}`, { method: 'DELETE', keepalive })
      notifyChanged()
      refreshCurrentCar().catch(() => {})
    },
    onUndo: () => restore(target.id),
  })
}
</script>

<template>
  <UiSheet v-model:open="isOpen" :title="reminder?.title ?? 'Изменить напоминание'">
    <form
      v-if="reminder"
      :id="FORM_ID"
      class="flex flex-col gap-sp-4 pb-sp-2"
      novalidate
      @submit.prevent="submit"
    >
      <UiAlert
        v-if="serverError"
        variant="error"
        title="Не удалось сохранить"
        :message="serverError"
      />
      <UiField
        v-model="form.title"
        label="Название"
        placeholder="Например, замена тормозной жидкости"
        required
        :error="titleError"
      />
      <ReminderIntervalFields
        v-model:km="form.intervalKm"
        v-model:months="form.intervalMonths"
        :error="intervalError"
      />
      <ReminderLastRow
        v-model:mileage="form.lastMileage"
        v-model:date="form.lastDate"
        :text="lastText"
        @touched="lastTouched = true"
      />
      <div class="border-t border-border">
        <UiRowToggle v-model="form.isActive" title="Напоминать" :subtitle="toggleSubtitle" />
      </div>
      <ReminderPreview
        :preview="preview"
        :today="today"
        :current-mileage="currentMileage"
        :interval-km="form.intervalKm || null"
        :interval-months="form.intervalMonths || null"
        :last="{ date: form.lastDate || null, mileage: form.lastMileage }"
        :label="form.isActive ? 'Следующее напоминание' : 'Если включить'"
      />
      <UiButton
        variant="danger-text"
        class="self-center"
        :icon="Trash2"
        :disabled="saving"
        @click="removeReminder"
      >
        Удалить напоминание
      </UiButton>
    </form>
    <template #footer>
      <UiButton type="submit" :form="FORM_ID" class="w-full" :loading="saving">
        {{ saving ? 'Сохраняем…' : 'Сохранить' }}
      </UiButton>
    </template>
  </UiSheet>
</template>
