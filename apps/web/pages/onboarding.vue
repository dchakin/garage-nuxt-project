<script setup lang="ts">
/**
 * Мастер первого запуска (А4 «Ваша машина», А5 «Что напоминать?») — сюда ведёт регистрация.
 * Оба шага держат данные здесь, поэтому «Назад» ничего не теряет. Машина и напоминания
 * создаются одним действием на втором шаге; если сохранение напоминаний не удалось, созданная
 * машина запоминается и повторная попытка не плодит дубли. Дальше — «Обзор» (А6) с плашкой.
 */
import { ArrowLeft } from 'lucide-vue-next'
import type { Car } from '@garage/shared/types'
import { todayIso } from '@garage/shared/utils/format'
import { carTabPath } from '~/utils/carTabs'
import { buildCarInput, createCarStepValues } from '~/utils/onboardingCar'
import {
  buildOnboardingReminders,
  countEnabledDrafts,
  createTemplateDrafts,
} from '~/utils/onboardingReminders'

definePageMeta({ middleware: 'auth', layout: 'auth' })

const TOTAL_STEPS = 2

const { createCar } = useCars()
const { showBanner } = useOnboardingBanner()

const step = ref(1)
const carValues = ref(createCarStepValues())
const drafts = ref(createTemplateDrafts())
const createdCar = ref<Car | null>(null)
const saving = ref(false)
const error = ref('')
const today = todayIso()

const carId = computed(() => createdCar.value?.id ?? 0)
const { fetchCategories, categories } = useCategories(carId)
const { createRemindersFromLast } = useReminders(carId)

const title = computed(() => (step.value === 1 ? 'Ваша машина' : 'Что напоминать?'))
const subtitle = computed(() =>
  step.value === 1
    ? 'Год и госномер — по желанию. VIN и фото — потом, в настройках машины.'
    : 'Сроки посчитаем сами и пришлём push. Не помните дату — отсчитаем от сегодня.',
)

function goToStep(next: number) {
  error.value = ''
  step.value = next
}

async function createReminders(): Promise<number> {
  if (!countEnabledDrafts(drafts.value)) return 0
  await fetchCategories()
  const categoryIdByName = new Map(categories.value.map((category) => [category.name, category.id]))
  const created = await createRemindersFromLast(
    buildOnboardingReminders(drafts.value, categoryIdByName, today),
  )
  return created.length
}

/** `withReminders: false` («Пропустить») создаёт только машину, выбранные шаблоны не трогает */
async function finish({ withReminders }: { withReminders: boolean }) {
  error.value = ''
  saving.value = true
  try {
    createdCar.value ??= await createCar(buildCarInput(carValues.value))
    const createdCarId = createdCar.value.id
    const remindersCount = withReminders ? await createReminders() : 0
    if (remindersCount) showBanner(createdCarId, remindersCount)
    await navigateTo(carTabPath(createdCarId, 'overview'), { replace: true })
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Проверьте соединение и попробуйте ещё раз.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="flex flex-1 flex-col">
    <OnboardingStepProgress :step="step" :total="TOTAL_STEPS" />
    <header class="mb-sp-6 mt-sp-3">
      <div class="flex items-center gap-sp-3" :class="step > 1 ? 'h-tap-min' : ''">
        <UiIconButton
          v-if="step > 1"
          :icon="ArrowLeft"
          label="Назад"
          class="-ml-sp-2"
          :disabled="saving"
          @click="goToStep(1)"
        />
        <p class="text-sm font-semibold text-accent-text" data-testid="onboarding-step">
          Шаг {{ step }} из {{ TOTAL_STEPS }}
        </p>
      </div>
      <h1 class="mt-sp-3 text-h1 text-text">{{ title }}</h1>
      <p class="mt-sp-3 text-body text-text-2">{{ subtitle }}</p>
    </header>

    <OnboardingCarStep v-if="step === 1" v-model="carValues" @next="goToStep(2)" />
    <OnboardingRemindersStep
      v-else
      v-model="drafts"
      :today="today"
      :saving="saving"
      :error="error"
      @skip="finish({ withReminders: false })"
      @submit="finish({ withReminders: true })"
    />
  </div>
</template>
