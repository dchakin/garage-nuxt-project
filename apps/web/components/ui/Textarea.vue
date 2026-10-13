<script setup lang="ts">
import { computed } from 'vue'
import { useFieldControl } from '~/composables/useFieldControl'
import FieldFrame from './FieldFrame.vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    label?: string
    hint?: string
    error?: string
    placeholder?: string
    /** Лимит символов — под полем появляется счётчик «0 / 500» */
    maxlength?: number
    rows?: number
    disabled?: boolean
    id?: string
  }>(),
  { rows: 3, maxlength: undefined, id: undefined },
)

const model = defineModel<string | null>()

const { inputId, helperId, rootAttrs, inputAttrs, invalid, describedBy } = useFieldControl(props)

const counter = computed(() =>
  props.maxlength ? `${(model.value ?? '').length} / ${props.maxlength}` : undefined,
)
</script>

<template>
  <FieldFrame
    v-bind="rootAttrs"
    :label="label"
    :input-id="inputId"
    :helper-id="helperId"
    :hint="hint"
    :error="error"
    :counter="counter"
  >
    <textarea
      :id="inputId"
      v-bind="inputAttrs"
      :value="model ?? ''"
      :rows="rows"
      :maxlength="maxlength"
      :placeholder="placeholder"
      :disabled="disabled"
      :aria-invalid="invalid || undefined"
      :aria-describedby="describedBy"
      class="min-h-[104px] w-full resize-y rounded-md border px-4 py-[14px] text-body text-text outline-none transition-shadow duration-fast placeholder:text-text-3 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:opacity-50"
      :class="
        invalid
          ? 'border-danger bg-surface ring-1 ring-inset ring-danger'
          : 'border-border-strong bg-surface focus:border-accent focus:ring-1 focus:ring-inset focus:ring-accent'
      "
      @input="model = ($event.target as HTMLTextAreaElement).value"
    />
  </FieldFrame>
</template>
