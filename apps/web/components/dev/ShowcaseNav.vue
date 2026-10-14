<script setup lang="ts">
// Тексты — как во фрейме «07 · Компоненты: навигация и оверлеи» (группы «Системные и шапки», «Нижняя панель»)
import type { CarTab } from '~/utils/carTabs'

const SHOWCASE_CAR_ID = 1
const STATES: { active: CarTab | null; badge: number }[] = [
  { active: null, badge: 3 },
  { active: 'overview', badge: 3 },
  { active: 'reminders', badge: 3 },
  { active: 'journal', badge: 0 },
]

const switchCount = ref(0)
const addCount = ref(0)
</script>

<template>
  <div class="space-y-sp-6">
    <div class="space-y-sp-3">
      <h2 class="text-h2 text-text">Шапки</h2>
      <UiCard>
        <UiAppBar
          variant="car"
          car-name="Toyota Camry"
          plate-number="А123ВС77"
          user-name="Дмитрий"
          profile-to="/dev/ui?group=nav"
          @switch="switchCount++"
        />
        <UiAppBar variant="back" title="Изменить автомобиль" back-to="/dev/ui?group=nav">
          <template #action>
            <UiButton variant="text" size="sm">Готово</UiButton>
          </template>
        </UiAppBar>
      </UiCard>
      <p class="text-sm text-text-2" data-testid="switch-count">Переключатель: {{ switchCount }}</p>
    </div>

    <div class="space-y-sp-3">
      <h2 class="text-h2 text-text">Нижняя панель</h2>
      <UiTabBar
        v-for="(state, index) in STATES"
        :key="index"
        :car-id="SHOWCASE_CAR_ID"
        :active="state.active"
        :badge="state.badge"
        :aria-label="`Разделы машины, пример ${index + 1}`"
        class="-mx-sp-4"
        @add="addCount++"
      />
      <p class="text-sm text-text-2" data-testid="add-count">Добавить: {{ addCount }}</p>
    </div>
  </div>
</template>
