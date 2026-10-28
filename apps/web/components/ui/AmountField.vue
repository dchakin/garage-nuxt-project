<script setup lang="ts">
import { computed } from 'vue'
import { useNumberInput } from '~/composables/useNumberInput'
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
    /** Единица справа: `₽` для сумм, `км` для пробега */
    suffix?: string
    /** Знаков после запятой: 2 для денег, 0 для пробега */
    decimals?: number
    /** Красная рамка без текста ошибки (текст показывает соседний Alert) */
    invalid?: boolean
  }>(),
  { id: undefined, suffix: '₽', decimals: 2, invalid: false },
)

/** Сумма в рублях; null — поле пустое */
const model = defineModel<number | null>()

const {
  inputId,
  helperId,
  rootAttrs,
  inputAttrs,
  invalid: hasError,
  describedBy,
} = useFieldControl(props)
const invalid = computed(() => hasError.value || props.invalid)

// Разряды расставляются и при вводе («680 000»), копейки — через запятую
const { text, onNumberInput } = useNumberInput(model, props.decimals)
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
        :value="text"
        :disabled="disabled"
        :aria-invalid="invalid || undefined"
        :aria-describedby="describedBy"
        class="h-full min-w-0 flex-1 bg-transparent text-amount text-text outline-none placeholder:text-text disabled:cursor-not-allowed"
        @input="onNumberInput"
      />
      <span class="shrink-0 text-[1.75rem] font-semibold text-text-3" aria-hidden="true">{{
        suffix
      }}</span>
    </div>
  </FieldFrame>
</template>
