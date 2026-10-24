<script setup lang="ts">
/**
 * «Настройки машины» (З2, #66). Владелец правит данные, видит участников и может удалить
 * машину (И2). Участнику — вид З4 (`CarMemberCarView`): данные для чтения, пробег, категории и
 * «Покинуть машину…». Пробег меняется только через шторку Б5 (`CarMileageSheet`), поэтому она стоит и здесь.
 */
import { Gauge, Tags, Trash2, TriangleAlert, UserMinus } from 'lucide-vue-next'
import type { CarUpdateInput } from '@garage/shared/schemas/car'
import type { CarMember } from '@garage/shared/types'
import { formatMileage } from '@garage/shared/utils/format'

definePageMeta({ middleware: 'auth', layout: 'plain' })

const SETTINGS_FORM_ID = 'car-settings-form'

const route = useRoute()
const carId = Number(route.params.id)
const { user } = useAuth()
const { car, loadCurrentCar } = useCurrentCar()
const { updateCar, deleteCar, leaveCar, saving, deletingId, leavingId } = useCars()
const { categories, fetchCategories } = useCategories(carId)
const { getLastCarId, forgetLastCar } = useLastCar()
const { isCarUnavailable, showCarError } = useCarUnavailable()
const { open: openMileageSheet, savedCount } = useMileageSheet()
const toast = useToast()

const loadFailed = ref(false)
const saveError = ref('')
const deleteDialogOpen = ref(false)
const leaveDialogOpen = ref(false)
const addMemberOpen = ref(false)
const memberToRemove = ref<CarMember | null>(null)
const removeDialogOpen = ref(false)
const removingUserId = ref<number | null>(null)

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
    if (isCarUnavailable(error)) {
      showCarError(error, carId)
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

async function onMemberAdded() {
  toast.show({ message: 'Участник добавлен' })
  await loadCurrentCar(carId).catch(() => {})
}

function askRemoveMember(member: CarMember) {
  memberToRemove.value = member
  removeDialogOpen.value = true
}

async function onRemoveMember() {
  const member = memberToRemove.value
  if (!member) return
  removingUserId.value = member.user.id
  try {
    await $fetch(`/api/cars/${carId}/members/${member.user.id}`, { method: 'DELETE' })
  } catch {
    removeDialogOpen.value = false
    toast.show({ message: 'Не удалось убрать участника', icon: null })
    return
  } finally {
    removingUserId.value = null
  }
  removeDialogOpen.value = false
  toast.show({ message: `${member.user.name} больше не участник` })
  await loadCurrentCar(carId).catch(() => {})
}

async function onLeave() {
  const carName = car.value ? `${car.value.brand} ${car.value.model}` : 'машину'
  try {
    await leaveCar(carId)
  } catch {
    leaveDialogOpen.value = false
    toast.show({ message: 'Не удалось покинуть машину', icon: null })
    return
  }
  leaveDialogOpen.value = false
  if (getLastCarId() === carId) forgetLastCar()
  toast.show({ message: `Вы покинули ${carName}` })
  await navigateTo('/cars')
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
      <CarMemberCarView
        v-if="!isOwner"
        v-model:leave-open="leaveDialogOpen"
        :car="car"
        :categories-count="categories.length"
        :leaving="leavingId === carId"
        @update-mileage="openMileageSheet()"
        @confirm="onLeave"
      />
      <CarSettingsForm
        v-if="isOwner"
        :car="car"
        :form-id="SETTINGS_FORM_ID"
        :server-error="saveError"
        @submit="onSave"
      />

      <UiCard v-if="isOwner">
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
          :owner-name="car.ownerName"
          :owner-email="user?.email"
          is-owner-you
          :members="car.members"
          can-manage
          :removing-user-id="removingUserId"
          @add="addMemberOpen = true"
          @remove="askRemoveMember"
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
    <CarAddMemberSheet
      v-if="car && isReady && isOwner"
      v-model:open="addMemberOpen"
      :car-id="carId"
      :owner-name="car.ownerName"
      :owner-email="user?.email"
      :members="car.members"
      @added="onMemberAdded"
    />
    <UiDialog
      v-model:open="removeDialogOpen"
      :title="`Убрать ${memberToRemove?.user.name ?? 'участника'}?`"
      message="Участник потеряет доступ к машине, записи и напоминания останутся."
      confirm-text="Убрать"
      :icon="UserMinus"
      :loading="removingUserId !== null"
      @confirm="onRemoveMember"
    />
    <CarDeleteCarDialog
      v-if="car && isReady"
      v-model:open="deleteDialogOpen"
      :car="car"
      :loading="deletingId === carId"
      @confirm="onDelete"
    />
  </div>
</template>
