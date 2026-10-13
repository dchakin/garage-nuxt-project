<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatNumber } from '@garage/shared/utils/format'
import { useFieldControl } from '~/composables/useFieldControl'
import FieldFrame from './FieldFrame.vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    label?: string
    hint?: string
    error?: string
    disabled?: boolean
    id?: string
  }>(),
  { id: undefined },
)

/** Сумма в рублях; null — поле пустое */
const model = defineModel<number | null>()

const { inputId, helperId, rootAttrs, inputAttrs, invalid, describedBy } = useFieldControl(props)

// Пока поле в фокусе, показываем то, что набрано; после ухода — с разрядами («6 800»)
const focused = ref(false)
const draft = ref('')

const displayValue = computed(() => {
  if (focused.value) return draft.value
  return model.value == null ? '' : formatNumber(model.value, 2).replace(/,00$/, '')
})

function parseAmount(raw: string): number | null {
  const normalized = raw.replace(/[\s ]/g, '').replace(',', '.')
  if (normalized === '' || Number.isNaN(Number(normalized))) return null
  return Number(normalized)
}

function onFocus() {
  focused.value = true
  draft.value = model.value == null ? '' : String(model.value).replace('.', ',')
}

function onInput(event: Event) {
  // Только цифры и один десятичный разделитель (копейки)
  const raw = (event.target as HTMLInputElement).value.replace(/[^\d.,]/g, '')
  draft.value = raw
  model.value = parseAmount(raw)
}
</script>

<template>
  <FieldFrame
    v-bind="rootAttrs"
    :label="label"
    :input-id="inputId"
    :helper-id="helperId"
    :hint="hint"
    :error="error"
  >
    <div
      class="flex h-[76px] items-center gap-2 rounded-lg border px-[18px] transition-shadow duration-fast"
      :class="[
        invalid
          ? 'border-danger ring-1 ring-inset ring-danger'
          : 'border-border-strong focus-within:border-accent focus-within:ring-1 focus-within:ring-inset focus-within:ring-accent',
        disabled ? 'bg-surface-2 opacity-50' : 'bg-surface',
      ]"
    >
      <input
        :id="inputId"
        v-bind="inputAttrs"
        type="text"
        inputmode="decimal"
        autocomplete="off"
        placeholder="0"
        :value="displayValue"
        :disabled="disabled"
        :aria-invalid="invalid || undefined"
        :aria-describedby="describedBy"
        class="h-full min-w-0 flex-1 bg-transparent text-amount text-text outline-none placeholder:text-text disabled:cursor-not-allowed"
        @focus="onFocus"
        @blur="focused = false"
        @input="onInput"
      />
      <span class="shrink-0 text-[1.75rem] font-semibold text-text-3" aria-hidden="true">₽</span>
    </div>
  </FieldFrame>
</template>
