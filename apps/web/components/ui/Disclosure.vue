<script setup lang="ts">
/**
 * Свёрнутая секция необязательных полей («+ Категория, место, заметка» в шторке записи).
 * Содержимое — слот; закрытое не рендерится, поэтому скрытые поля не попадают в Tab.
 */
import { useId } from 'vue'
import { ChevronDown, Plus } from 'lucide-vue-next'
import { collapseTransitionHooks } from '~/utils/collapseTransition'

defineProps<{
  label: string
  /** Ссылка по центру без значков (А5: «Указать, когда меняли» под строкой шаблона) */
  centered?: boolean
}>()
const open = defineModel<boolean>('open', { default: false })
const contentId = useId()

/** В шторке с ограниченной высотой раскрытое может уйти под край — подводим его в видимую область */
function revealContent(element: Element) {
  element.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
}
</script>

<template>
  <div>
    <button
      type="button"
      class="flex h-12 w-full items-center gap-sp-2 rounded-md px-1 text-accent-text focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus-ring"
      :class="centered ? 'justify-center text-center' : 'text-left'"
      :aria-expanded="open"
      :aria-controls="open ? contentId : undefined"
      @click="open = !open"
    >
      <Plus v-if="!centered" class="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
      <span class="text-body font-semibold" :class="centered ? '' : 'min-w-0 flex-1'">
        {{ label }}
      </span>
      <ChevronDown
        v-if="!centered"
        class="h-5 w-5 shrink-0 transition-transform duration-base ease-standard motion-reduce:transition-none"
        :class="open ? 'rotate-180' : ''"
        aria-hidden="true"
      />
    </button>
    <Transition name="collapse" v-bind="collapseTransitionHooks" @after-enter="revealContent">
      <div v-if="open" :id="contentId" class="collapse-body overflow-hidden">
        <div class="pt-sp-2">
          <slot />
        </div>
      </div>
    </Transition>
  </div>
</template>
