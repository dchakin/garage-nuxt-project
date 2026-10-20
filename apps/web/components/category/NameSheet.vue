<script setup lang="ts">
/**
 * Шторка «Новая категория» / «Переименовать» (З3): одно поле с названием. Запрос выполняет
 * родитель (событие `submit` с обрезанным названием) и закрывает шторку сам; ошибку сервера
 * (например, 409 «имя занято») передаёт в `error`.
 */
import { computed, ref, watch } from 'vue'
import { categorySchema, MAX_CATEGORY_NAME_LENGTH } from '@garage/shared/schemas/category'

const FORM_ID = 'category-name-form'

const props = defineProps<{
  /** Переименовываемая категория; `null` — создание новой */
  category: { name: string } | null
  saving?: boolean
  error?: string
}>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ submit: [name: string] }>()

const name = ref('')
const validationError = ref('')

const title = computed(() => (props.category ? 'Переименовать категорию' : 'Новая категория'))
const submitText = computed(() => (props.category ? 'Сохранить' : 'Добавить'))
const fieldError = computed(() => validationError.value || props.error || undefined)

watch(open, (opened) => {
  if (!opened) return
  name.value = props.category?.name ?? ''
  validationError.value = ''
})

watch(name, () => (validationError.value = ''))

function submit() {
  const parsed = categorySchema.safeParse({ name: name.value })
  if (!parsed.success) {
    validationError.value = parsed.error.issues[0]?.message ?? 'Укажите название категории'
    return
  }
  emit('submit', parsed.data.name)
}
</script>

<template>
  <UiSheet v-model:open="open" :title="title">
    <form :id="FORM_ID" class="pb-sp-2" novalidate @submit.prevent="submit">
      <UiField
        v-model="name"
        label="Название"
        placeholder="Например, Кузов"
        autocomplete="off"
        :maxlength="MAX_CATEGORY_NAME_LENGTH"
        autofocus
        :error="fieldError"
      />
    </form>
    <template #footer>
      <UiButton type="submit" :form="FORM_ID" class="w-full" :loading="saving">
        {{ saving ? 'Сохраняем…' : submitText }}
      </UiButton>
    </template>
  </UiSheet>
</template>
