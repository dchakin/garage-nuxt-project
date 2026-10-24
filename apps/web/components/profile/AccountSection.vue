<script setup lang="ts">
/**
 * Блок «Аккаунт» профиля (З1): имя (правка), email (только чтение), «Сменить пароль» и
 * «Удалить аккаунт…» (диалог И10 со списком машин). После удаления — вход (`/login`).
 */
import { computed, ref, watch } from 'vue'
import { KeyRound, Trash2 } from 'lucide-vue-next'
import { profileSchema } from '@garage/shared/schemas/auth'

const { user, updateName, deleteAccount } = useAuth()
const { cars, fetchCars } = useCars()
const { forgetLastCar } = useLastCar()
const toast = useToast()

const name = ref(user.value?.name ?? '')
const nameError = ref('')
const savingName = ref(false)

const passwordSheetOpen = ref(false)
const deleteDialogOpen = ref(false)
const deleting = ref(false)

// Имя в состоянии появляется после загрузки сессии; правки пользователя не затираем
watch(
  () => user.value?.name,
  (current) => {
    if (!savingName.value) name.value = current ?? ''
  },
)

const nameChanged = computed(() => name.value.trim() !== (user.value?.name ?? ''))

async function saveName() {
  const parsed = profileSchema.safeParse({ name: name.value })
  if (!parsed.success) {
    nameError.value = parsed.error.issues[0]?.message ?? 'Укажите имя'
    return
  }
  nameError.value = ''
  savingName.value = true
  try {
    const updated = await updateName(parsed.data.name)
    name.value = updated.name
    toast.show({ message: 'Имя сохранено' })
  } catch {
    nameError.value = 'Не удалось сохранить имя'
  } finally {
    savingName.value = false
  }
}

function openDeleteDialog() {
  deleteDialogOpen.value = true
  // Список в диалоге должен быть свежим; без сети остаётся прежний
  fetchCars().catch(() => {})
}

async function confirmDelete() {
  deleting.value = true
  try {
    await deleteAccount()
  } catch {
    deleting.value = false
    deleteDialogOpen.value = false
    toast.show({ message: 'Не удалось удалить аккаунт', icon: null })
    return
  }
  forgetLastCar()
  cars.value = []
  deleteDialogOpen.value = false
  deleting.value = false
  await navigateTo('/login')
}
</script>

<template>
  <section class="flex flex-col gap-sp-2" aria-labelledby="profile-account">
    <h2 id="profile-account" class="text-xs font-semibold uppercase text-text-2">Аккаунт</h2>
    <UiCard>
      <form class="flex flex-col gap-sp-3 bg-surface p-sp-4" novalidate @submit.prevent="saveName">
        <UiField
          v-model="name"
          label="Имя"
          autocomplete="name"
          :error="nameError || undefined"
          @update:model-value="nameError = ''"
        />
        <UiButton
          v-if="nameChanged"
          type="submit"
          size="sm"
          class="self-start"
          :loading="savingName"
        >
          {{ savingName ? 'Сохраняем…' : 'Сохранить имя' }}
        </UiButton>
      </form>
      <UiRowKeyValue label="Email" :value="user?.email" data-testid="account-email" />
      <UiRowSetting :icon="KeyRound" label="Сменить пароль" @click="passwordSheetOpen = true" />
    </UiCard>
    <UiButton variant="danger-text" :icon="Trash2" class="w-full" @click="openDeleteDialog">
      Удалить аккаунт…
    </UiButton>

    <ProfileChangePasswordSheet v-model:open="passwordSheetOpen" />
    <ProfileDeleteAccountDialog
      v-model:open="deleteDialogOpen"
      :cars="cars"
      :user-id="user?.id ?? 0"
      :loading="deleting"
      @confirm="confirmDelete"
    />
  </section>
</template>
