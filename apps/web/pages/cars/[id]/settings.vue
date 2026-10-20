<script setup lang="ts">
/**
 * «Настройки машины» (З2, #66). Владелец правит данные, видит участников и может удалить
 * машину (И2). Участнику показывается только пробег и категории — полный вид З4 делает #69.
 * Пробег меняется только через шторку Б5 (`CarMileageSheet`), поэтому она стоит и здесь.
 */
import { Gauge, Tags, Trash2, TriangleAlert } from 'lucide-vue-next'
import type { CarUpdateInput } from '@garage/shared/schemas/car'
import { formatMileage } from '@garage/shared/utils/format'

definePageMeta({ middleware: 'auth', layout: 'plain' })

const SETTINGS_FORM_ID = 'car-settings-form'
const CAR_UNAVAILABLE_STATUSES = [403, 404]

const route = useRoute()
const carId = Number(route.params.id)
const { user } = useAuth()
const { car, loadCurrentCar } = useCurrentCar()
const { updateCar, deleteCar, saving, deletingId } = useCars()
const { categories, fetchCategories } = useCategories(carId)
const { getLastCarId, forgetLastCar } = useLastCar()
const { open: openMileageSheet, savedCount } = useMileageSheet()
const toast = useToast()

const loadFailed = ref(false)
const saveError = ref('')
const deleteDialogOpen = ref(false)
const inviting = ref(false)
const inviteError = ref('')
const membersList = ref<{ reset: () => void } | null>(null)

const isReady = computed(() => car.value?.id === carId)
const isOwner = computed(() => car.value?.role === 'owner')
const categoriesCount = computed(() =>
  categories.value.length ? String(categories.value.length) : undefined,
)

async function load() {
  loadFailed.value = false
  try {
    await loadCurrentCar(carId)
  } catch (error: any) {
    if (CAR_UNAVAILABLE_STATUSES.includes(error?.statusCode)) {
      if (getLastCarId() === carId) forgetLastCar()
      await navigateTo('/cars', { replace: true })
      return
    }
    loadFailed.value = true
  }
}

onMounted(() => {
  load()
  // Счётчик категорий — украшение: без сети строка остаётся без числа
  fetchCategories().catch(() => {})
})

// Пробег обновили в шторке — она сама перечитала машину, остаётся только счётчик категорий
watch(savedCount, () => fetchCategories().catch(() => {}))

async function onSave(input: CarUpdateInput) {
  saveError.value = ''
  try {
    await updateCar(carId, input)
    await loadCurrentCar(carId)
    toast.show({ message: 'Изменения сохранены' })
    await navigateTo(`/cars/${carId}`)
  } catch (error: any) {
    saveError.value = error?.data?.statusMessage || 'Не удалось сохранить'
  }
}

const INVITE_ERRORS: Record<string, string> = {
  user_not_found: 'Пользователь с таким email не найден',
  already_member: 'Этот пользователь уже участник машины',
}

async function onInvite(email: string) {
  inviteError.value = ''
  inviting.value = true
  try {
    await $fetch(`/api/cars/${carId}/invite`, { method: 'POST', body: { email } })
    membersList.value?.reset()
    await loadCurrentCar(carId)
    toast.show({ message: 'Участник добавлен' })
  } catch (error: any) {
    const code = error?.data?.statusMessage
    inviteError.value = INVITE_ERRORS[code] ?? 'Не удалось добавить участника'
  } finally {
    inviting.value = false
  }
}

async function onDelete() {
  try {
    await deleteCar(carId)
  } catch {
    deleteDialogOpen.value = false
    toast.show({ message: 'Не удалось удалить машину', icon: null })
    return
  }
  deleteDialogOpen.value = false
  if (getLastCarId() === carId) forgetLastCar()
  toast.show({ message: 'Машина удалена' })
  await navigateTo('/cars')
}
</script>

<template>
  <div>
    <UiAppBar
      variant="back"
      title="Настройки"
      :back-to="`/cars/${carId}`"
      class="sticky top-0 z-10"
    >
      <template v-if="isReady && isOwner" #action>
        <UiButton type="submit" variant="text" size="sm" :form="SETTINGS_FORM_ID" :loading="saving">
          Готово
        </UiButton>
      </template>
    </UiAppBar>

    <div v-if="loadFailed" class="px-sp-4">
      <UiCard>
        <UiEmptyState
          :icon="TriangleAlert"
          title="Не удалось загрузить машину"
          message="Проверьте соединение и попробуйте ещё раз."
          tone="danger"
        >
          <template #action>
            <UiButton variant="tonal" @click="load">Повторить</UiButton>
          </template>
        </UiEmptyState>
      </UiCard>
    </div>

    <div v-else-if="car && isReady" class="flex flex-col gap-sp-5 px-sp-4 pb-sp-6">
      <UiAlert
        v-if="!isOwner"
        variant="info"
        :title="`Данные машины меняет владелец — ${car.ownerName}`"
      />
      <CarSettingsForm
        v-if="isOwner"
        :car="car"
        :form-id="SETTINGS_FORM_ID"
        :server-error="saveError"
        @submit="onSave"
      />

      <UiCard>
        <UiRowSetting
          :icon="Gauge"
          label="Пробег"
          :value="formatMileage(car.currentMileage)"
          @click="openMileageSheet()"
        />
        <UiRowSetting
          :icon="Tags"
          label="Категории"
          :value="categoriesCount"
          :to="`/cars/${carId}/categories`"
        />
      </UiCard>

      <section v-if="isOwner" class="flex flex-col gap-sp-2" aria-labelledby="car-settings-members">
        <h2 id="car-settings-members" class="text-xs font-semibold uppercase text-text-2">
          Участники
        </h2>
        <CarMembersList
          ref="membersList"
          :owner-name="car.ownerName"
          :owner-email="user?.email"
          is-owner-you
          :members="car.members"
          can-invite
          :inviting="inviting"
          :invite-error="inviteError"
          @invite="onInvite"
        />
      </section>

      <UiButton
        v-if="isOwner"
        variant="danger-text"
        :icon="Trash2"
        :loading="deletingId === carId"
        @click="deleteDialogOpen = true"
      >
        Удалить машину
      </UiButton>
    </div>

    <div v-else class="flex flex-col gap-sp-4 px-sp-4" aria-busy="true">
      <UiSkeleton variant="card" class="h-[320px]" />
      <UiSkeleton variant="card" class="h-[112px]" />
    </div>

    <CarMileageSheet />
    <CarDeleteCarDialog
      v-if="car && isReady"
      v-model:open="deleteDialogOpen"
      :car="car"
      :loading="deletingId === carId"
      @confirm="onDelete"
    />
  </div>
</template>
