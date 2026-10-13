<script setup lang="ts">
import { computed, ref, type Component } from 'vue'
import { Calendar, ChevronDown, CircleAlert, Eye, EyeOff } from 'lucide-vue-next'
import { formatNumber } from '@garage/shared/utils/format'
import { useFieldControl } from '~/composables/useFieldControl'
import FieldFrame from './FieldFrame.vue'

export interface FieldOption {
  value: string | number
  label: string
}

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    label?: string
    type?: 'text' | 'number' | 'email' | 'password' | 'date' | 'tel' | 'url'
    /** Единица справа в поле («км») */
    suffix?: string
    /** Иконка слева (компонент lucide-vue-next) */
    icon?: Component
    hint?: string
    error?: string
    placeholder?: string
    disabled?: boolean
    required?: boolean
    /** Список вариантов — поле становится выпадающим списком */
    options?: FieldOption[]
    /** Моноширинный шрифт значения (VIN, госномер) */
    mono?: boolean
    id?: string
  }>(),
  { type: 'text', icon: undefined, options: undefined, id: undefined },
)

/** Для type="number" — число или null (пустое поле) */
const model = defineModel<string | number | null>()

const { inputId, helperId, rootAttrs, inputAttrs, invalid, describedBy } = useFieldControl(props)

const passwordVisible = ref(false)
const focused = ref(false)

// Число вне фокуса — с разрядами («87 450»), в фокусе — как набрано
const displayValue = computed(() => {
  if (props.type === 'number' && !focused.value && typeof model.value === 'number') {
    return formatNumber(model.value)
  }
  return model.value ?? ''
})
const inputType = computed(() => {
  if (props.type === 'password') return passwordVisible.value ? 'text' : 'password'
  // number — через text + inputmode: без стрелок и без прокрутки колесом
  return props.type === 'number' ? 'text' : props.type
})
const inputMode = computed(() => (props.type === 'number' ? 'numeric' : undefined))

function onInput(event: Event) {
  const value = (event.target as HTMLInputElement | HTMLSelectElement).value
  if (props.type !== 'number') {
    model.value = value
    return
  }
  const digits = value.replace(/\D/g, '')
  model.value = digits === '' ? null : Number(digits)
}

const boxStateClass = computed(() => {
  if (invalid.value) return 'border-danger ring-1 ring-inset ring-danger'
  return 'border-border-strong focus-within:border-accent focus-within:ring-1 focus-within:ring-inset focus-within:ring-accent'
})

const controlClass =
  'h-full min-w-0 flex-1 appearance-none bg-transparent text-body text-text outline-none placeholder:text-text-3 disabled:cursor-not-allowed'
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
      class="relative flex h-control-h items-center gap-[10px] rounded-md border px-4 transition-shadow duration-fast"
      :class="[boxStateClass, disabled ? 'bg-surface-2 opacity-50' : 'bg-surface']"
    >
      <component :is="icon" v-if="icon" class="h-5 w-5 shrink-0 text-text-2" aria-hidden="true" />
      <select
        v-if="options"
        :id="inputId"
        v-bind="inputAttrs"
        :value="model ?? ''"
        :disabled="disabled"
        :required="required"
        :aria-invalid="invalid || undefined"
        :aria-describedby="describedBy"
        :class="[controlClass, 'cursor-pointer pr-7']"
        @change="onInput"
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option v-for="option in options" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      <input
        v-else
        :id="inputId"
        v-bind="inputAttrs"
        :type="inputType"
        :inputmode="inputMode"
        :value="displayValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :aria-invalid="invalid || undefined"
        :aria-describedby="describedBy"
        :class="[
          controlClass,
          { 'font-mono': mono, 'ui-field-date cursor-pointer': type === 'date' },
        ]"
        @focus="focused = true"
        @blur="focused = false"
        @input="onInput"
      />
      <span v-if="suffix" class="shrink-0 text-body text-text-2">{{ suffix }}</span>
      <CircleAlert v-if="invalid" class="h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
      <button
        v-if="type === 'password'"
        type="button"
        class="-mr-2 flex h-tap-min w-tap-min shrink-0 items-center justify-center rounded-sm text-text-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        :aria-label="passwordVisible ? 'Скрыть пароль' : 'Показать пароль'"
        @click="passwordVisible = !passwordVisible"
      >
        <EyeOff v-if="passwordVisible" class="h-5 w-5" aria-hidden="true" />
        <Eye v-else class="h-5 w-5" aria-hidden="true" />
      </button>
      <ChevronDown
        v-else-if="options"
        class="pointer-events-none absolute right-4 h-5 w-5 text-text-2"
        aria-hidden="true"
      />
      <Calendar
        v-else-if="type === 'date'"
        class="pointer-events-none h-5 w-5 shrink-0 text-text-2"
        aria-hidden="true"
      />
    </div>
  </FieldFrame>
</template>

<style scoped>
/* Нативный выбор даты растянут на всё поле (клик в любом месте открывает календарь),
   сам индикатор невидим — видна иконка Calendar */
.ui-field-date::-webkit-calendar-picker-indicator {
  position: absolute;
  inset: 0;
  width: auto;
  height: auto;
  opacity: 0;
  cursor: pointer;
}
</style>
