<script setup lang="ts">
/**
 * Нижняя панель машины (макет «07», TabBar): Обзор · Журнал · ＋ · Напоминания · Расходы.
 * «＋» не ссылка, а кнопка → `add` (шторка записи). Счётчик на «Напоминаниях» = просрочено + скоро,
 * при 0 не рисуется. Панель плавающая: отступ 16 по бокам, снизу safe-area (не меньше 8).
 * Положение (fixed) и `--toast-bottom` задаёт layout; высота — 76 px + max(safe-area, 8 px).
 */
import { resolveComponent, type Component } from 'vue'
import { Bell, ChartColumn, Gauge, NotebookText, Plus } from 'lucide-vue-next'
import UiCounter from '~/components/ui/Counter.vue'
import { carTabPath, type CarTab } from '~/utils/carTabs'

defineProps<{
  carId: number
  active?: CarTab | null
  /** Просрочено + скоро среди включённых напоминаний */
  badge?: number
}>()

const emit = defineEmits<{ add: [] }>()

interface TabItem {
  id: CarTab
  label: string
  icon: Component
}

const LEFT_TABS: TabItem[] = [
  { id: 'overview', label: 'Обзор', icon: Gauge },
  { id: 'journal', label: 'Журнал', icon: NotebookText },
]
const RIGHT_TABS: TabItem[] = [
  { id: 'reminders', label: 'Напоминания', icon: Bell },
  { id: 'expenses', label: 'Расходы', icon: ChartColumn },
]

const NuxtLink = resolveComponent('NuxtLink')
</script>

<template>
  <nav
    aria-label="Разделы машины"
    class="px-sp-4 pb-[max(env(safe-area-inset-bottom),var(--sp-2))] pt-sp-2"
  >
    <div
      class="flex h-[68px] items-center rounded-[34px] border border-border bg-surface px-1 shadow-md"
    >
      <template v-for="(group, groupIndex) in [LEFT_TABS, RIGHT_TABS]" :key="groupIndex">
        <button
          v-if="groupIndex === 1"
          type="button"
          aria-label="Добавить запись"
          title="Добавить запись"
          class="mx-1 flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[16px] bg-accent text-on-accent shadow-[0_4px_12px_var(--focus-ring)] transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus-ring focus-visible:ring-offset-2 active:bg-accent-pressed"
          @click="emit('add')"
        >
          <Plus class="h-[26px] w-[26px]" aria-hidden="true" />
        </button>
        <component
          :is="NuxtLink"
          v-for="tab in group"
          :key="tab.id"
          :to="carTabPath(carId, tab.id)"
          :aria-current="tab.id === active ? 'page' : undefined"
          class="group flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-[3px] rounded-md text-2xs font-semibold focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus-ring"
          :class="tab.id === active ? 'text-accent-text' : 'text-text-2'"
        >
          <span
            class="relative flex h-7 w-[52px] items-center justify-center rounded-[14px] transition-colors duration-fast ease-standard"
            :class="tab.id === active ? 'bg-accent-soft' : 'group-active:bg-surface-3'"
          >
            <component :is="tab.icon" class="h-[22px] w-[22px]" aria-hidden="true" />
            <UiCounter
              v-if="tab.id === 'reminders' && badge"
              :count="badge"
              class="absolute -top-1 left-8"
              aria-hidden="true"
            />
          </span>
          <span class="whitespace-nowrap tracking-[-0.1px]">{{ tab.label }}</span>
          <span v-if="tab.id === 'reminders' && badge" class="sr-only">
            , требуют внимания: {{ badge }}
          </span>
        </component>
      </template>
    </div>
  </nav>
</template>
