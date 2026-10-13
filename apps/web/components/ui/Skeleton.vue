<script setup lang="ts">
withDefaults(
  defineProps<{
    /**
     * line — строка текста: во всю ширину × 12 px, ширина и высота меняются классом (`w-[180px] h-5`),
     * card — блок под карточку (Skeleton/Block): высота — обязательно классом (`h-[116px]`),
     * row — строка списка (Skeleton/Row: плитка, две строки, сумма)
     */
    variant?: 'line' | 'card' | 'row'
  }>(),
  { variant: 'line' },
)
</script>

<template>
  <div
    v-if="variant === 'row'"
    class="flex items-center gap-sp-3 bg-surface px-sp-4 py-[14px]"
    aria-hidden="true"
    data-skeleton="row"
  >
    <div
      class="h-10 w-10 shrink-0 animate-pulse rounded-sm bg-surface-2 motion-reduce:animate-none"
    />
    <div class="flex-1 space-y-sp-2">
      <div
        class="h-3 w-[170px] max-w-full animate-pulse rounded-xs bg-surface-2 motion-reduce:animate-none"
      />
      <div
        class="h-2.5 w-[120px] max-w-full animate-pulse rounded-[5px] bg-surface-2 motion-reduce:animate-none"
      />
    </div>
    <div
      class="h-3 w-14 shrink-0 animate-pulse rounded-xs bg-surface-2 motion-reduce:animate-none"
    />
  </div>
  <div
    v-else
    class="animate-pulse bg-surface-2 motion-reduce:animate-none"
    :class="variant === 'card' ? 'rounded-lg' : 'min-h-3 rounded-xs'"
    aria-hidden="true"
    :data-skeleton="variant"
  />
</template>
