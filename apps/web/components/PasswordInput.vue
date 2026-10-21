<script setup lang="ts">
/**
 * Поле пароля: `UiField` с кнопкой «Показать пароль» / «Скрыть пароль». Остальные атрибуты
 * (`autocomplete`, `minlength`, `name`…) уходят на сам input.
 */
defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    label?: string
    hint?: string
    error?: string
    required?: boolean
  }>(),
  { label: 'Пароль', hint: undefined, error: undefined, required: true },
)

const model = defineModel<string>({ required: true })
</script>

<template>
  <UiField
    v-model="model"
    v-bind="$attrs"
    type="password"
    :label="label"
    :hint="hint"
    :error="error"
    :required="required"
  />
</template>
