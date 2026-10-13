<script setup lang="ts">
// Значения — как во фреймах «06 · Компоненты: данные» и «Ж1 · Расходы» (Camry, 88 500 ₽ за 2026)
const MONTH_BARS = [
  { label: 'фев', value: 7200 },
  { label: 'мар', value: 4300 },
  { label: 'апр', value: 0 },
  { label: 'май', value: 48600 },
  { label: 'июн', value: 7900 },
  { label: 'июл', value: 0 },
  { label: 'авг', value: 9900 },
  { label: 'сен', value: 10600 },
  { label: 'окт', value: 1200 },
]
const PERIOD_BARS = [
  { label: 'апр', value: 7400 },
  { label: 'май', value: 10800 },
  { label: 'июн', value: 5600 },
  { label: 'июл', value: 16500 },
  { label: 'авг', value: 7000 },
  { label: 'сен', value: 12200 },
]
const CATEGORIES = [
  { name: 'Шины', amount: 48600, share: 55 },
  { name: 'Электрика', amount: 9800, share: 11 },
  { name: 'Подвеска', amount: 7500, share: 8 },
  { name: 'Масло и фильтры', amount: 6800, share: 8 },
  { name: 'Тормоза', amount: 4200, share: 5 },
  { name: 'Прочее', amount: 11600, share: 13 },
]
const BIGGEST_MONTH_INDEX = 3
const FIRST_YEAR = 2024
const CURRENT_YEAR = 2026

const year = ref(CURRENT_YEAR)
</script>

<template>
  <div class="space-y-sp-8">
    <div class="space-y-sp-3">
      <h2 class="text-h2 text-text">Графики</h2>
      <UiPeriodSwitcher
        :label="`${year} год`"
        :can-prev="year > FIRST_YEAR"
        :can-next="year < CURRENT_YEAR"
        @prev="year--"
        @next="year++"
      />
      <UiColumnChart
        :bars="MONTH_BARS"
        :current-index="MONTH_BARS.length - 1"
        :value-index="BIGGEST_MONTH_INDEX"
        label="Расходы по месяцам"
      />
      <UiColumnChart
        :bars="PERIOD_BARS"
        :current-index="PERIOD_BARS.length - 1"
        label="Расходы за полгода"
      />
      <div>
        <UiCategoryBar v-for="category in CATEGORIES" :key="category.name" v-bind="category" />
      </div>
      <UiMiniBars :values="[18, 30, 14, 40, 22, 32]" />
    </div>

    <div class="space-y-sp-3">
      <h2 class="text-h2 text-text">Загрузка</h2>
      <UiSkeleton class="h-5 w-[180px]" />
      <UiSkeleton variant="card" class="h-[120px]" />
      <UiCard>
        <UiSkeleton v-for="row in 3" :key="row" variant="row" />
      </UiCard>
    </div>
  </div>
</template>
