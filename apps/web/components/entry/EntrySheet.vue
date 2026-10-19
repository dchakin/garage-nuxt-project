<script setup lang="ts">
/**
 * Шторка новой записи (Д1/Д3): тип → «что сделали» → сумма → пробег и дата → свёрнутые
 * категория и место. Состояние открытия — `useEntrySheet()`, компонент стоит в `layouts/car.vue`.
 * Обязательны тип и дата; пробег проверяет `checkEntryMileage` (при `error` сохранить нельзя).
 */
import type { CarDetail, Entry } from '@garage/shared/types'
import type { EntryType } from '@garage/shared/schemas/entry'
import { checkEntryMileage } from '@garage/shared/utils/entryMileageCheck'
import { todayIso } from '@garage/shared/utils/format'

const FORM_ID = 'entry-sheet-form'

const { isOpen, options, close, notifySaved } = useEntrySheet()
const { categories, fetchCategories } = useCategories()
const { car, refreshCurrentCar } = useCurrentCar()
const { createEntry, saving } = useEntries(() => options.value?.carId ?? 0)
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
const moreOpen = ref(false)
const submitted = ref(false)
const serverError = ref('')
const today = ref(todayIso())
const currentMileage = ref(0)
const pastEntries = ref<Entry[]>([])
const contextLoaded = ref(false)
let openToken = 0

const typeError = computed(() =>
  submitted.value && !form.type ? 'Выберите тип записи' : undefined,
)
const dateError = computed(() => (submitted.value && !form.date ? 'Укажите дату' : undefined))

const mileageCheck = computed(() =>
  contextLoaded.value && form.date
    ? checkEntryMileage({
        mileage: form.mileage,
        date: form.date,
        today: today.value,
        currentMileage: currentMileage.value,
        entries: pastEntries.value,
      })
    : ({ level: 'ok' } as const),
)
const mileageError = computed(() =>
  mileageCheck.value.level === 'error' ? mileageCheck.value.message : undefined,
)
const mileageWarning = computed(() =>
  mileageCheck.value.level === 'warning' ? mileageCheck.value.message : undefined,
)

/** Пустая форма: сегодня и текущий пробег (если машина уже загружена в layout) */
function resetForm(carId: number) {
  const knownCar = car.value?.id === carId ? car.value : null
  today.value = todayIso()
  currentMileage.value = knownCar?.currentMileage ?? 0
  Object.assign(form, {
    type: null,
    description: '',
    cost: null,
    mileage: knownCar?.currentMileage ?? null,
    date: today.value,
    categoryId: null,
    place: '',
  })
  moreOpen.value = false
  submitted.value = false
  serverError.value = ''
  pastEntries.value = []
  contextLoaded.value = false
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
    if (form.mileage === null) form.mileage = loadedCar.currentMileage
    currentMileage.value = loadedCar.currentMileage
    pastEntries.value = entries
    contextLoaded.value = true
  } catch {
    // Форма работает и без подсказок: сервер всё равно проверит данные
  }
}

watch(isOpen, (opened) => {
  const carId = options.value?.carId
  if (!opened || !carId) return
  openToken += 1
  resetForm(carId)
  loadContext(carId, openToken)
})

async function submit() {
  submitted.value = true
  serverError.value = ''
  if (!form.type || !form.date || mileageCheck.value.level === 'error') return
  try {
    await createEntry({
      type: form.type,
      date: form.date,
      description: form.description.trim(),
      cost: form.cost,
      mileage: form.mileage,
      currency: 'RUB',
      categoryId: form.categoryId,
      place: form.place.trim() || null,
    })
  } catch (error: any) {
    serverError.value = error?.data?.statusMessage || 'Не удалось сохранить запись'
    return
  }
  close()
  notifySaved()
  toast.show({ message: 'Запись добавлена' })
  // Пробег мог вырасти, а напоминания — стать просроченными: пересчитать бейдж вкладки
  refreshCurrentCar().catch(() => {})
}

onBeforeUnmount(close)
</script>

<template>
  <UiSheet v-model:open="isOpen" title="Новая запись">
    <form :id="FORM_ID" class="flex flex-col gap-sp-4 pb-sp-2" novalidate @submit.prevent="submit">
      <UiAlert
        v-if="serverError"
        variant="error"
        title="Не удалось сохранить"
        :message="serverError"
      />
      <EntryTypePicker v-model="form.type" :error="typeError" />
      <EntryTitleField v-model="form.description" :entries="pastEntries" :type="form.type" />
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
    </form>
    <template #footer>
      <UiButton
        type="submit"
        :form="FORM_ID"
        class="w-full"
        :loading="saving"
        :disabled="mileageCheck.level === 'error'"
      >
        {{ saving ? 'Сохраняем…' : 'Сохранить' }}
      </UiButton>
    </template>
  </UiSheet>
</template>
