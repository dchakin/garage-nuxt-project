<script setup lang="ts">
// Витрина UI-кита для разработки и e2e-скриншотов (`/dev/ui`, `/dev/ui?group=actions`).
// В прод-образ не попадает: Dockerfile собирает с GARAGE_EXCLUDE_DEV_PAGES=1 (nuxt.config.ts).
import type { Component } from 'vue'
import DevShowcaseActions from '~/components/dev/ShowcaseActions.vue'
import DevShowcaseData from '~/components/dev/ShowcaseData.vue'
import DevShowcaseCharts from '~/components/dev/ShowcaseCharts.vue'
import DevShowcaseOverlays from '~/components/dev/ShowcaseOverlays.vue'
import DevShowcaseFeedback from '~/components/dev/ShowcaseFeedback.vue'
import DevShowcaseNav from '~/components/dev/ShowcaseNav.vue'

definePageMeta({ layout: false })
useHead({ title: 'UI-кит', meta: [{ name: 'robots', content: 'noindex' }] })

/** Группа витрины = фрейм макета; новые группы добавляются сюда */
const GROUPS: { id: string; title: string; component: Component }[] = [
  { id: 'actions', title: 'Действия и ввод', component: DevShowcaseActions },
  { id: 'data', title: 'Данные и статусы', component: DevShowcaseData },
  { id: 'charts', title: 'Графики и загрузка', component: DevShowcaseCharts },
  { id: 'overlays', title: 'Оверлеи', component: DevShowcaseOverlays },
  { id: 'feedback', title: 'Обратная связь', component: DevShowcaseFeedback },
  { id: 'nav', title: 'Навигация', component: DevShowcaseNav },
]

const route = useRoute()
const visibleGroups = computed(() =>
  route.query.group ? GROUPS.filter((group) => group.id === route.query.group) : GROUPS,
)
</script>

<template>
  <main class="mx-auto max-w-3xl space-y-sp-10 bg-bg px-sp-4 py-sp-6">
    <section
      v-for="group in visibleGroups"
      :key="group.id"
      :aria-labelledby="`ui-${group.id}`"
      class="space-y-sp-6"
    >
      <h1 :id="`ui-${group.id}`" class="text-h1 text-text">{{ group.title }}</h1>
      <component :is="group.component" />
    </section>
  </main>
</template>
