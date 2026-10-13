<script setup lang="ts">
/**
 * Белая карточка-контейнер со скруглением r-lg. Прямые дети (строки `UiRow…` или `<li>` при
 * `tag="ul"`) разделены линией сверху, у первого её нет — строки сами границ не рисуют.
 */
withDefaults(
  defineProps<{
    /** ul — список строк (дети — `<li>`) */
    tag?: 'div' | 'ul' | 'section'
  }>(),
  { tag: 'div' },
)
</script>

<template>
  <component
    :is="tag"
    class="overflow-hidden rounded-lg border border-border bg-surface [&>*:not(:first-child)]:border-t [&>*:not(:first-child)]:border-border"
  >
    <slot />
  </component>
</template>
