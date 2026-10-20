<script setup lang="ts">
/**
 * Шторка правки напоминания (Е4): поля как в Е1, переключатель «Напоминать» (`isActive`) и
 * «Удалить напоминание» без диалога — через `useDeferredDelete` (И3). Состояние открытия —
 * `useReminderEditSheet()`, компонент стоит в `layouts/car.vue`; шторка же подхватывает запрос
 * «Открыть «…»» из Е3 (`useReminderSheet().openExistingRequest`). Срок при сохранении считает
 * `planReminderEdit` (те же правила, что у сервера).
 */
import { CircleAlert, Trash2 } from 'lucide-vue-next'
import type { Reminder } from '@garage/shared/types'
import { formatReminderInterval } from '@garage/shared/utils/reminderRemaining'
import { todayIso } from '@garage/shared/utils/format'
import { initialLast, planReminderEdit } from '@garage/shared/utils/reminderEdit'

const FORM_ID = 'reminder-edit-form'
const NO_CATEGORY = ''

const { isOpen, reminder, open, close, hide, restore, notifyChanged } = useReminderEditSheet()
const { openExistingRequest, clearOpenExistingRequest } = useReminderSheet()
const carId = computed(() => reminder.value?.carId ?? 0)
const { categories, fetchCategories } = useCategories(carId)
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
const categoryOptions = computed(() => [
  { value: NO_CATEGORY, label: 'Без категории' },
  ...categories.value.map((category) => ({ value: category.id, label: category.name })),
])
const categoryValue = computed({
  get: () => form.categoryId ?? NO_CATEGORY,
  set: (value) => (form.categoryId = value === NO_CATEGORY ? null : Number(value)),
})
const toggleSubtitle = computed(() =>
  reminder.value
    ? formatReminderInterval({
        intervalKm: form.intervalKm || null,
        intervalMonths: form.intervalMonths || null,
      })
    : undefined,
)

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
  fetchCategories().catch(() => {})
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
  <UiSheet v-model:open="isOpen" title="Изменить напоминание">
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
      <UiCard>
        <UiRowToggle v-model="form.isActive" title="Напоминать" :subtitle="toggleSubtitle" />
      </UiCard>
      <UiField
        v-model="form.title"
        label="Название"
        placeholder="Например, замена тормозной жидкости"
        required
        :error="titleError"
      />
      <div class="grid grid-cols-2 gap-x-sp-3 gap-y-sp-2">
        <UiField v-model="form.intervalKm" type="number" label="Каждые" suffix="км" />
        <UiField v-model="form.intervalMonths" type="number" label="или каждые" suffix="мес" />
        <p
          v-if="intervalError"
          class="col-span-2 flex items-center gap-sp-1 text-sm text-danger-text"
          role="alert"
        >
          <CircleAlert class="h-4 w-4 shrink-0" aria-hidden="true" />
          {{ intervalError }}
        </p>
      </div>
      <UiField v-model="categoryValue" label="Категория" :options="categoryOptions" />
      <div class="flex flex-col gap-sp-2">
        <p class="text-sm font-semibold text-text">Последний раз</p>
        <div class="grid grid-cols-2 gap-x-sp-3">
          <UiField
            v-model="form.lastMileage"
            type="number"
            label="Пробег"
            suffix="км"
            @update:model-value="lastTouched = true"
          />
          <UiField
            v-model="form.lastDate"
            type="date"
            label="Дата"
            @update:model-value="lastTouched = true"
          />
        </div>
      </div>
      <ReminderPreview
        :preview="preview"
        :today="today"
        :label="form.isActive ? 'Следующий раз' : 'Если включить'"
      />
    </form>
    <template #footer>
      <div class="flex flex-col gap-sp-2">
        <UiButton type="submit" :form="FORM_ID" class="w-full" :loading="saving">
          {{ saving ? 'Сохраняем…' : 'Сохранить изменения' }}
        </UiButton>
        <UiButton
          variant="danger-text"
          class="w-full"
          :icon="Trash2"
          :disabled="saving"
          @click="removeReminder"
        >
          Удалить напоминание
        </UiButton>
      </div>
    </template>
  </UiSheet>
</template>
