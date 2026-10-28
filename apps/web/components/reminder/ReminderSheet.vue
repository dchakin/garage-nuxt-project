<script setup lang="ts">
/**
 * Шторка нового напоминания (Е1 шаблоны, Е2 своё, Е3 «такое уже есть»). Состояние открытия —
 * `useReminderSheet()`, компонент стоит в `layouts/car.vue`. «Последний раз» подставляется из
 * последней записи журнала с той же категорией, срок считает `previewReminderDue` — те же
 * правила, что у `POST /api/cars/[id]/reminders/bulk`, который и создаёт напоминание.
 */
import { todayIso } from '@garage/shared/utils/format'
import { describeLastSource } from '@garage/shared/utils/reminderNextDue'
import { describeExistingReminder } from '@garage/shared/utils/reminderRemaining'
import { previewReminderDue } from '@garage/shared/utils/reminderPreview'
import {
  findLastEntryInCategory,
  findReminderByTitle,
  reminderTemplates,
  type ReminderTemplateChoice,
} from '@garage/shared/utils/reminderTemplates'

const FORM_ID = 'reminder-sheet-form'

const { isOpen, options, close, notifySaved, requestOpenExisting } = useReminderSheet()
const carId = computed(() => options.value?.carId ?? 0)
const { categories, fetchCategories } = useCategories(carId)
const { reminders, fetchReminders, createRemindersFromLast, saving } = useReminders(carId)
const { entries, fetchEntries } = useEntries(carId)
const { car, refreshCurrentCar } = useCurrentCar()
const toast = useToast()

const choice = ref<ReminderTemplateChoice | null>(null)
const form = reactive({
  title: '',
  intervalKm: null as number | null,
  intervalMonths: null as number | null,
  categoryId: null as number | null,
  lastDate: '',
  lastMileage: null as number | null,
})
/** «Последний раз» правили руками — смена категории его больше не перезаписывает */
const lastTouched = ref(false)
const duplicateAcknowledged = ref(false)
const submitted = ref(false)
const serverError = ref('')
const contextReady = ref(false)
const today = ref(todayIso())
let openToken = 0

const selectedTemplate = computed(() =>
  reminderTemplates.find((template) => template.id === choice.value),
)
const duplicate = computed(() =>
  selectedTemplate.value && !duplicateAcknowledged.value
    ? findReminderByTitle(reminders.value, selectedTemplate.value.title)
    : undefined,
)
const createdIds = computed(() =>
  reminderTemplates
    .filter((template) => findReminderByTitle(reminders.value, template.title))
    .map((template) => template.id),
)
const lastEntry = computed(() => findLastEntryInCategory(entries.value, form.categoryId))
const currentMileage = computed(() =>
  car.value?.id === carId.value ? car.value.currentMileage : 0,
)
const preview = computed(() =>
  previewReminderDue({
    intervalKm: form.intervalKm || null,
    intervalMonths: form.intervalMonths || null,
    last: { date: form.lastDate || null, mileage: form.lastMileage },
    currentMileage: currentMileage.value,
    today: today.value,
  }),
)

const titleError = computed(() =>
  submitted.value && !form.title.trim() ? 'Укажите название' : undefined,
)
const intervalError = computed(() =>
  submitted.value && !form.intervalKm && !form.intervalMonths
    ? 'Укажите, как часто напоминать: по пробегу или по времени'
    : undefined,
)
const lastText = computed(() =>
  describeLastSource(
    { date: form.lastDate || null, mileage: form.lastMileage },
    { fromJournal: !!lastEntry.value && !lastTouched.value, today: today.value },
  ),
)
const duplicateText = computed(() =>
  duplicate.value
    ? describeExistingReminder(duplicate.value, {
        currentMileage: currentMileage.value,
        today: today.value,
      })
    : '',
)

/** Подставляет «Последний раз» из последней записи категории (нет записи — пусто) */
function applyLastEntry() {
  form.lastDate = lastEntry.value?.date ?? ''
  form.lastMileage = lastEntry.value?.mileage ?? null
}

function applyChoice(next: ReminderTemplateChoice | null) {
  if (!next) return
  duplicateAcknowledged.value = false
  lastTouched.value = false
  const template = reminderTemplates.find((item) => item.id === next)
  Object.assign(form, {
    title: template?.title ?? '',
    intervalKm: template?.intervalKm ?? null,
    intervalMonths: template?.intervalMonths ?? null,
    categoryId: template?.categoryName
      ? (categories.value.find((category) => category.name === template.categoryName)?.id ?? null)
      : null,
  })
  applyLastEntry()
}

watch(choice, applyChoice)
watch(
  () => form.categoryId,
  () => !lastTouched.value && applyLastEntry(),
)

function resetForm() {
  today.value = todayIso()
  choice.value = null
  Object.assign(form, {
    title: '',
    intervalKm: null,
    intervalMonths: null,
    categoryId: null,
    lastDate: '',
    lastMileage: null,
  })
  lastTouched.value = false
  duplicateAcknowledged.value = false
  submitted.value = false
  serverError.value = ''
  contextReady.value = false
}

/** Напоминания (для «уже есть»), категории и записи (для «Последний раз»); без сети — просто без подсказок */
async function loadContext(token: number) {
  try {
    await Promise.all([fetchReminders(), fetchCategories(), fetchEntries()])
  } catch {
    // Форма работает и без подсказок: сервер всё равно проверит данные
  } finally {
    if (token === openToken) {
      contextReady.value = true
      if (options.value?.choice) choice.value = options.value.choice
    }
  }
}

watch(isOpen, (opened) => {
  if (!opened || !carId.value) return
  openToken += 1
  resetForm()
  loadContext(openToken)
})

async function submit() {
  submitted.value = true
  serverError.value = ''
  if (!form.title.trim() || (!form.intervalKm && !form.intervalMonths)) return
  try {
    await createRemindersFromLast([
      {
        title: form.title.trim(),
        intervalKm: form.intervalKm || null,
        intervalMonths: form.intervalMonths || null,
        categoryId: form.categoryId,
        last: { date: form.lastDate || null, mileage: form.lastMileage },
      },
    ])
  } catch (error: any) {
    serverError.value = error?.data?.statusMessage || 'Не удалось создать напоминание'
    return
  }
  close()
  notifySaved()
  toast.show({ message: 'Напоминание создано' })
  refreshCurrentCar().catch(() => {})
}

onBeforeUnmount(close)
</script>

<template>
  <UiSheet v-model:open="isOpen" title="Новое напоминание">
    <form :id="FORM_ID" class="flex flex-col gap-sp-4 pb-sp-2" novalidate @submit.prevent="submit">
      <UiAlert
        v-if="serverError"
        variant="error"
        title="Не удалось создать"
        :message="serverError"
      />
      <ReminderTemplates v-model="choice" :created-ids="createdIds" :disabled="!contextReady" />
      <p v-if="!choice" class="text-sm text-text-2">
        Выберите шаблон или создайте своё напоминание: подскажем срок по интервалу.
      </p>

      <template v-if="duplicate">
        <UiAlert variant="info" :title="`${duplicate.title} уже есть`" :message="duplicateText" />
        <UiButton variant="text" class="self-center" @click="duplicateAcknowledged = true">
          Всё равно создать ещё одно
        </UiButton>
      </template>

      <template v-else-if="choice">
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
        <ReminderPreview
          :preview="preview"
          :today="today"
          :current-mileage="currentMileage"
          :interval-km="form.intervalKm || null"
          :interval-months="form.intervalMonths || null"
          :last="{ date: form.lastDate || null, mileage: form.lastMileage }"
        />
      </template>
    </form>
    <template #footer>
      <UiButton v-if="duplicate" class="w-full" @click="requestOpenExisting(duplicate)">
        Открыть «{{ duplicate.title }}»
      </UiButton>
      <UiButton
        v-else
        type="submit"
        :form="FORM_ID"
        class="w-full"
        :loading="saving"
        :disabled="!choice"
      >
        {{ saving ? 'Создаём…' : 'Создать напоминание' }}
      </UiButton>
    </template>
  </UiSheet>
</template>
