<script setup lang="ts">
/**
 * «Категории машины» (З3, #68). Стандартные — только чтение, с числом записей; свои можно
 * добавить, переименовать и удалить (записи удалённой уходят в «Прочее»). Доступ — любой
 * участник машины.
 */
import { Plus, Tags, Trash2, TriangleAlert } from 'lucide-vue-next'
import type { CarCategory } from '~/composables/useCategories'

definePageMeta({ middleware: 'auth', layout: 'plain' })

const SKELETON_DELAY_MS = 300
const CAR_UNAVAILABLE_STATUSES = [403, 404]
const NAME_TAKEN_STATUS = 409

const route = useRoute()
const carId = Number(route.params.id)
const { categories, fetchCategories, createCategory, renameCategory, deleteCategory } =
  useCategories(carId)
const toast = useToast()

const loaded = ref(false)
const loadFailed = ref(false)
const skeletonVisible = ref(false)

const sheetOpen = ref(false)
const editing = ref<CarCategory | null>(null)
const saving = ref(false)
const nameError = ref('')

const deleteDialogOpen = ref(false)
const categoryToDelete = ref<CarCategory | null>(null)
const deleting = ref(false)

const standardCategories = computed(() => categories.value.filter((category) => category.isDefault))
const ownCategories = computed(() => categories.value.filter((category) => !category.isDefault))
const showContent = computed(() => loaded.value || categories.value.length > 0)

async function load() {
  loadFailed.value = false
  const timer = setTimeout(() => (skeletonVisible.value = true), SKELETON_DELAY_MS)
  try {
    await fetchCategories(true)
    loaded.value = true
  } catch (error: any) {
    if (CAR_UNAVAILABLE_STATUSES.includes(error?.statusCode)) {
      await navigateTo('/cars', { replace: true })
      return
    }
    loadFailed.value = !categories.value.length
  } finally {
    clearTimeout(timer)
    skeletonVisible.value = false
  }
}

onMounted(load)

function openCreate() {
  editing.value = null
  nameError.value = ''
  sheetOpen.value = true
}

function openRename(category: CarCategory) {
  editing.value = category
  nameError.value = ''
  sheetOpen.value = true
}

async function saveName(name: string) {
  const target = editing.value
  saving.value = true
  nameError.value = ''
  try {
    if (target) await renameCategory(target.id, name)
    else await createCategory(name)
  } catch (error: any) {
    nameError.value =
      error?.statusCode === NAME_TAKEN_STATUS
        ? 'Такая категория уже есть'
        : 'Не удалось сохранить категорию'
    return
  } finally {
    saving.value = false
  }
  sheetOpen.value = false
  toast.show({ message: target ? 'Категория переименована' : 'Категория добавлена' })
}

function askDelete(category: CarCategory) {
  categoryToDelete.value = category
  deleteDialogOpen.value = true
}

async function confirmDelete() {
  const target = categoryToDelete.value
  if (!target) return
  deleting.value = true
  try {
    await deleteCategory(target.id)
  } catch {
    deleteDialogOpen.value = false
    toast.show({ message: 'Не удалось удалить категорию', icon: null })
    return
  } finally {
    deleting.value = false
  }
  deleteDialogOpen.value = false
  toast.show({ message: 'Категория удалена' })
}
</script>

<template>
  <div>
    <UiAppBar
      variant="back"
      title="Категории"
      :back-to="`/cars/${carId}/settings`"
      class="sticky top-0 z-10"
    />

    <div v-if="loadFailed" class="px-sp-4">
      <UiCard>
        <UiEmptyState
          :icon="TriangleAlert"
          title="Не удалось загрузить категории"
          message="Проверьте соединение и попробуйте ещё раз."
          tone="danger"
        >
          <template #action>
            <UiButton variant="tonal" @click="load">Повторить</UiButton>
          </template>
        </UiEmptyState>
      </UiCard>
    </div>

    <div v-else-if="showContent" class="flex flex-col gap-sp-5 px-sp-4">
      <CategoryList
        title="Стандартные"
        test-id="categories-standard"
        :categories="standardCategories"
      />

      <CategoryList
        v-if="ownCategories.length"
        title="Свои"
        test-id="categories-own"
        editable
        :categories="ownCategories"
        @rename="openRename"
        @remove="askDelete"
      />
      <UiCard v-else data-testid="categories-own-empty">
        <UiEmptyState
          :icon="Tags"
          title="Своих категорий пока нет"
          message="Заведите свою, если стандартных не хватает."
        />
      </UiCard>

      <UiButton variant="tonal" :icon="Plus" @click="openCreate">Добавить категорию</UiButton>
    </div>

    <div v-else class="flex flex-col gap-sp-4 px-sp-4" aria-busy="true">
      <template v-if="skeletonVisible">
        <UiSkeleton variant="card" class="h-[320px]" />
        <UiSkeleton variant="card" class="h-[112px]" />
      </template>
    </div>

    <CategoryNameSheet
      v-model:open="sheetOpen"
      :category="editing"
      :saving="saving"
      :error="nameError"
      @submit="saveName"
    />
    <UiDialog
      v-model:open="deleteDialogOpen"
      :title="`Удалить «${categoryToDelete?.name ?? ''}»?`"
      message="Записи перейдут в «Прочее», у напоминаний категория сбросится."
      confirm-text="Удалить"
      :icon="Trash2"
      :loading="deleting"
      @confirm="confirmDelete"
    />
  </div>
</template>
