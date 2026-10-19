<script setup lang="ts">
/**
 * Шторка записи (Д4): все поля записи, правка и удаление. Состояние открытия —
 * `useEntryDetailSheet()`, компонент стоит в `layouts/car.vue`. «Удалить запись» не спрашивает
 * подтверждения: запись пропадает из списков, а DELETE уходит через 5 с, если не нажали «Отменить»
 * (`useDeferredDelete`).
 */
import type { CarDetail, Entry } from '@garage/shared/types'
import type { EntryType } from '@garage/shared/schemas/entry'
import { checkEntryMileage } from '@garage/shared/utils/entryMileageCheck'
import { formatDate, todayIso } from '@garage/shared/utils/format'
import { Trash2 } from 'lucide-vue-next'

const FORM_ID = 'entry-detail-form'

const { isOpen, entry, close, hide, restore, notifyChanged } = useEntryDetailSheet()
const { categories, fetchCategories } = useCategories()
const { car, refreshCurrentCar } = useCurrentCar()
const { updateEntry, saving } = useEntries(() => entry.value?.carId ?? 0)
const { scheduleDelete } = useDeferredDelete()
const toast = useToast()

const form = reactive({
  type: null as EntryType | null,
  description: '',
  cost: null as number | null,
  mileage: null as number | null,
  date: '',
  categoryId: null as number | null,
  place: '',
})
/** Категория и место раскрыты сразу: шторка показывает все поля записи */
const moreOpen = ref(true)
const submitted = ref(false)
const serverError = ref('')
const today = ref(todayIso())
const currentMileage = ref(0)
const carEntries = ref<Entry[]>([])
const contextLoaded = ref(false)
let openToken = 0

const typeError = computed(() =>
  submitted.value && !form.type ? 'Выберите тип записи' : undefined,
)
const dateError = computed(() => (submitted.value && !form.date ? 'Укажите дату' : undefined))

const mileageCheck = computed(() =>
  contextLoaded.value && form.date && entry.value
    ? checkEntryMileage({
        mileage: form.mileage,
        date: form.date,
        today: today.value,
        currentMileage: currentMileage.value,
        entries: carEntries.value,
        editingEntryId: entry.value.id,
      })
    : ({ level: 'ok' } as const),
)
const mileageError = computed(() =>
  mileageCheck.value.level === 'error' ? mileageCheck.value.message : undefined,
)
const mileageWarning = computed(() =>
  mileageCheck.value.level === 'warning' ? mileageCheck.value.message : undefined,
)
const authorLine = computed(() =>
  entry.value
    ? `Добавил ${entry.value.author.name} · ${formatDate(entry.value.createdAt.slice(0, 10), today.value)}`
    : '',
)

function fillForm(source: Entry) {
  today.value = todayIso()
  Object.assign(form, {
    type: source.type,
    description: source.description,
    cost: source.cost,
    mileage: source.mileage,
    date: source.date,
    categoryId: source.categoryId,
    place: source.place ?? '',
  })
  moreOpen.value = true
  submitted.value = false
  serverError.value = ''
  carEntries.value = []
  contextLoaded.value = false
  currentMileage.value = car.value?.id === source.carId ? car.value.currentMileage : 0
}

/** Записи и пробег машины — для подсказок и проверки пробега; без сети проверка просто молчит */
async function loadContext(carId: number, token: number) {
  try {
    const [loadedCar, entries] = await Promise.all([
      $fetch<CarDetail>(`/api/cars/${carId}`),
      $fetch<Entry[]>(`/api/cars/${carId}/entries`),
      fetchCategories(),
    ])
    if (token !== openToken) return
    currentMileage.value = loadedCar.currentMileage
    carEntries.value = entries
    contextLoaded.value = true
  } catch {
    // Правка работает и без подсказок: сервер всё равно проверит данные
  }
}

watch(isOpen, (opened) => {
  if (!opened || !entry.value) return
  openToken += 1
  fillForm(entry.value)
  loadContext(entry.value.carId, openToken)
})

async function submit() {
  submitted.value = true
  serverError.value = ''
  if (!entry.value || !form.type || !form.date || mileageCheck.value.level === 'error') return
  try {
    await updateEntry(entry.value.id, {
      type: form.type,
      date: form.date,
      description: form.description.trim(),
      cost: form.cost,
      mileage: form.mileage,
      categoryId: form.categoryId,
      place: form.place.trim() || null,
    })
  } catch (error: any) {
    serverError.value = error?.data?.statusMessage || 'Не удалось сохранить запись'
    return
  }
  close()
  notifyChanged()
  toast.show({ message: 'Изменения сохранены' })
}

function removeEntry() {
  const target = entry.value
  if (!target) return
  hide(target.id)
  close()
  scheduleDelete({
    key: `entry:${target.id}`,
    message: 'Запись удалена',
    run: async ({ keepalive }) => {
      await $fetch(`/api/entries/${target.id}`, { method: 'DELETE', keepalive })
      notifyChanged()
      refreshCurrentCar().catch(() => {})
    },
    onUndo: () => restore(target.id),
  })
}
</script>

<template>
  <UiSheet v-model:open="isOpen" title="Запись">
    <form
      v-if="entry"
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
      <EntryTypePicker v-model="form.type" :error="typeError" />
      <EntryTitleField v-model="form.description" :entries="carEntries" :type="form.type" />
      <UiAmountField v-model="form.cost" label="Сумма" />
      <div class="grid grid-cols-2 gap-x-sp-3 gap-y-sp-4">
        <UiField
          v-model="form.mileage"
          type="number"
          label="Пробег"
          suffix="км"
          :error="mileageError"
          :class="mileageError ? 'col-span-2' : ''"
        />
        <UiField v-model="form.date" type="date" label="Дата" required :error="dateError" />
      </div>
      <UiAlert
        v-if="mileageWarning"
        variant="warning"
        title="Проверьте пробег"
        :message="mileageWarning"
      />
      <EntryMoreFields
        v-model:open="moreOpen"
        v-model:category-id="form.categoryId"
        v-model:place="form.place"
        :categories="categories"
      />
      <p class="text-sm text-text-2" data-testid="entry-author">{{ authorLine }}</p>
    </form>
    <template #footer>
      <div class="flex flex-col gap-sp-2">
        <UiButton
          type="submit"
          :form="FORM_ID"
          class="w-full"
          :loading="saving"
          :disabled="mileageCheck.level === 'error'"
        >
          {{ saving ? 'Сохраняем…' : 'Сохранить изменения' }}
        </UiButton>
        <UiButton
          variant="danger-text"
          class="w-full"
          :icon="Trash2"
          :disabled="saving"
          @click="removeEntry"
        >
          Удалить запись
        </UiButton>
      </div>
    </template>
  </UiSheet>
</template>
