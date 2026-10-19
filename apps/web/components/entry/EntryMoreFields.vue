<script setup lang="ts">
/** Необязательные поля записи в `UiDisclosure`: категория и место (сервис/магазин). */
import { computed } from 'vue'
import type { Category } from '@garage/shared/types'
import UiDisclosure from '~/components/ui/Disclosure.vue'
import UiField from '~/components/ui/Field.vue'

const props = defineProps<{ categories: Category[] }>()

const categoryId = defineModel<number | null>('categoryId', { default: null })
const place = defineModel<string>('place', { default: '' })
const open = defineModel<boolean>('open', { default: false })

const NO_CATEGORY = ''
const categoryOptions = computed(() => [
  { value: NO_CATEGORY, label: 'Без категории' },
  ...props.categories.map((category) => ({ value: category.id, label: category.name })),
])

const categoryValue = computed({
  get: () => categoryId.value ?? NO_CATEGORY,
  set: (value) => (categoryId.value = value === NO_CATEGORY ? null : Number(value)),
})
</script>

<template>
  <UiDisclosure v-model:open="open" label="Категория и место">
    <div class="flex flex-col gap-sp-4">
      <UiField v-model="categoryValue" label="Категория" :options="categoryOptions" />
      <UiField v-model="place" label="Место" placeholder="Сервис или магазин" />
    </div>
  </UiDisclosure>
</template>
