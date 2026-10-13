<script setup lang="ts">
import { entryTypeLabels, entryTypes } from '@garage/shared/schemas/entry'
import type { ReminderStatus } from '@garage/shared/types'
import { formatMoney } from '@garage/shared/utils/format'
import { Bell, Moon } from 'lucide-vue-next'

// Значения — как во фрейме «06 · Компоненты: данные»
const STATUSES: ReminderStatus[] = ['overdue', 'soon', 'ok', 'inactive']
const TODAY = '2026-10-10'
const ENTRIES = [
  {
    date: '2026-09-12',
    type: 'maintenance' as const,
    category: null,
    description: 'Замена масла и фильтра',
    mileage: 87200,
    cost: 6800,
    place: 'Сервис на Ленина',
  },
  {
    date: '2026-05-02',
    type: 'purchase' as const,
    category: null,
    description: 'Шины Michelin 215/55 R17',
    mileage: null,
    cost: 48600,
    place: 'Шинный центр',
  },
  {
    date: '2026-09-25',
    type: 'other' as const,
    category: null,
    description: '',
    mileage: null,
    cost: null,
    place: null,
  },
]
const CAMRY = {
  brand: 'Toyota',
  model: 'Camry',
  year: 2018,
  plateNumber: 'А123ВС77',
  currentMileage: 87450,
}
const SOLARIS = {
  brand: 'Hyundai',
  model: 'Solaris',
  year: 2015,
  plateNumber: 'К456ОР199',
  currentMileage: 142300,
}

const oilReminderOn = ref(true)
</script>

<template>
  <div class="space-y-sp-8">
    <div class="space-y-sp-3">
      <h2 class="text-h2 text-text">Бейджи</h2>
      <div class="flex flex-wrap items-center gap-sp-4">
        <span
          v-for="type in entryTypes"
          :key="type"
          class="flex flex-col items-center gap-1 text-xs text-text-2"
        >
          <UiTypeBadge :type="type" />
          {{ entryTypeLabels[type] }}
        </span>
      </div>
      <div class="flex flex-wrap items-center gap-sp-3">
        <UiStatusBadge v-for="status in STATUSES" :key="status" :status="status" />
        <UiStatusBadge status="overdue">2 просрочено</UiStatusBadge>
      </div>
      <div class="flex flex-wrap items-center gap-sp-4">
        <UiCounter :count="3" />
        <UiCounter :count="120" />
        <UiAvatar name="Дмитрий" />
        <UiPlate plate-number="А123ВС77" />
        <span class="text-accent"><UiSpinner size="md" /></span>
      </div>
      <div class="space-y-sp-3">
        <UiProgress :value="0.7" tone="soon" label="Прошло до ОСАГО" />
        <UiProgress :value="1" tone="overdue" />
        <UiProgress :value="0.3" tone="ok" />
        <UiProgress :value="0.55" />
      </div>
    </div>

    <div class="space-y-sp-3">
      <h2 class="text-h2 text-text">Строки</h2>
      <UiCard tag="ul">
        <li v-for="entry in ENTRIES" :key="entry.description">
          <UiRowEntry :entry="entry" :today="TODAY" />
        </li>
      </UiCard>
      <UiCard>
        <UiRowSetting :icon="Bell" label="Push-уведомления" value="Включены" />
        <UiRowSetting :icon="Moon" label="Тема" value="Как в системе" />
      </UiCard>
      <UiCard>
        <UiRowKeyValue label="Потрачено за год" :value="formatMoney(118400)" />
        <UiRowToggle
          v-model="oilReminderOn"
          title="Замена масла"
          subtitle="Каждые 10 000 км или 12 мес"
        />
      </UiCard>
      <UiRowCar :car="CAMRY" :overdue-count="2" selected />
      <UiRowCar :car="SOLARIS" :soon-count="1" />
    </div>

    <div class="space-y-sp-3">
      <h2 class="text-h2 text-text">Заголовки</h2>
      <UiMonthHeader title="Сентябрь 2026" :total="12200" />
      <UiSectionHeader title="Требует внимания" to="/dev/ui?group=data" />
      <UiSectionHeader title="Без ссылки" />
    </div>
  </div>
</template>
