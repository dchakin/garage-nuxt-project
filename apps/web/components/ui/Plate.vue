<script setup lang="ts">
import { computed } from 'vue'
import { splitPlate } from '~/utils/plate'

/** Белый с чёрным в обеих темах, как настоящий номер */
const props = defineProps<{
  /** Как ввёл пользователь: «А123ВС77», «а123вс 77» */
  plateNumber: string
}>()

const plate = computed(() => splitPlate(props.plateNumber))
const spokenPlate = computed(() =>
  plate.value.region ? `${plate.value.number} ${plate.value.region}` : plate.value.number,
)
</script>

<template>
  <span
    role="img"
    :aria-label="`Госномер ${spokenPlate}`"
    class="inline-flex h-6 shrink-0 items-center rounded-xs border-[1.5px] border-plate-text bg-plate-bg px-1.5 font-mono text-xs text-plate-text"
  >
    <span>{{ plate.number }}</span>
    <template v-if="plate.region">
      <span class="mx-1.5 h-3.5 w-px bg-plate-text" />
      <span>{{ plate.region }}</span>
    </template>
  </span>
</template>
