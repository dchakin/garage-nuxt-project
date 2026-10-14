<script setup lang="ts">
/**
 * «Мостик» запись → напоминание в шторке записи (Д2): закрыть напоминание этой записью
 * и сдвинуть срок. Включён — зелёная плашка, выключен — нейтральная (запись без закрытия).
 */
import { useId } from 'vue'
import { Circle, CircleCheck } from 'lucide-vue-next'
import UiToggle from './Toggle.vue'

defineProps<{
  /** «Закрыть «Замена масла»» */
  title: string
  /** «Следующая — на 97 450 км или 10 окт 2027» */
  subtitle?: string
}>()

const model = defineModel<boolean>({ default: true })
const titleId = useId()
const subtitleId = useId()
</script>

<template>
  <div
    class="flex items-center gap-sp-3 rounded-md py-sp-3 pl-[14px] pr-sp-3 transition-colors duration-fast ease-standard"
    :class="model ? 'bg-success-soft' : 'bg-surface-2'"
  >
    <component
      :is="model ? CircleCheck : Circle"
      class="h-[22px] w-[22px] shrink-0"
      :class="model ? 'text-success-text' : 'text-text-2'"
      aria-hidden="true"
    />
    <span class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span
        :id="titleId"
        class="text-body font-semibold"
        :class="model ? 'text-success-text' : 'text-text'"
      >
        {{ title }}
      </span>
      <span v-if="subtitle" :id="subtitleId" class="text-sm text-text">{{ subtitle }}</span>
    </span>
    <UiToggle
      v-model="model"
      tone="success"
      :aria-labelledby="titleId"
      :aria-describedby="subtitle ? subtitleId : undefined"
    />
  </div>
</template>
