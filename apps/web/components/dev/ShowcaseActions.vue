<script setup lang="ts">
import { ArrowLeft, Check, MapPin, Pencil, Plus, SlidersHorizontal, Trash2 } from 'lucide-vue-next'
import { entryTypeShortLabels, entryTypes, type EntryType } from '@garage/shared/schemas/entry'
import { entryTypeIcons } from '~/utils/entryTypeIcons'

// Значения — как во фрейме «05 · Компоненты: действия и ввод»
const mileage = ref<number | null>(87450)
const wrongMileage = ref<number | null>(8745)
const email = ref('dmitry@mail.ru')
const password = ref('password')
const category = ref('oil')
const date = ref('2026-10-10')
const place = ref('Сервис на Ленина')
const note = ref('')
const amount = ref<number | null>(6800)
const search = ref('')
const typeFilter = ref<EntryType | 'all'>('all')
const oilChip = ref(true)
const period = ref('month')
const pushOn = ref(true)
const pushOff = ref(false)
const entryType = ref<EntryType>('maintenance')

const CATEGORIES = [
  { value: 'oil', label: 'Масло и фильтры' },
  { value: 'tires', label: 'Шины и диски' },
]
const PERIODS = [
  { value: 'month', label: 'Месяц' },
  { value: 'year', label: 'Год' },
  { value: 'all', label: 'Всё время' },
]
</script>

<template>
  <div class="space-y-sp-8">
    <div class="space-y-sp-3">
      <h2 class="text-h2 text-text">Кнопки</h2>
      <div class="flex flex-wrap items-center gap-sp-3">
        <UiButton>Сохранить</UiButton>
        <UiButton variant="secondary">Отмена</UiButton>
        <UiButton variant="tonal">Обновить</UiButton>
        <UiButton variant="danger" :icon="Trash2">Удалить</UiButton>
        <UiButton variant="text">Изменить</UiButton>
        <UiButton variant="danger-text" :icon="Trash2">Удалить запись</UiButton>
        <UiButton variant="tonal" size="sm" :icon="Check">Сделал</UiButton>
      </div>
      <div class="flex flex-wrap items-center gap-sp-3">
        <UiButton :icon="Plus">Добавить запись</UiButton>
        <UiButton disabled>Сохранить</UiButton>
        <UiButton loading>Сохраняем…</UiButton>
        <UiIconButton :icon="ArrowLeft" label="Назад" />
        <UiIconButton :icon="Pencil" label="Изменить" variant="filled" />
      </div>
      <UiButton class="w-full">Сохранить</UiButton>
    </div>

    <div class="space-y-sp-4">
      <h2 class="text-h2 text-text">Поля ввода</h2>
      <UiField v-model="mileage" label="Пробег" type="number" suffix="км" name="mileage" />
      <UiField
        v-model="wrongMileage"
        label="Пробег"
        type="number"
        suffix="км"
        error="Меньше текущего (87 450 км). Это запись из прошлого?"
      />
      <UiField v-model="category" label="Категория" :options="CATEGORIES" />
      <UiField v-model="date" label="Дата" type="date" />
      <UiField v-model="email" label="Email" type="email" autocomplete="email" />
      <UiField v-model="password" label="Пароль" type="password" />
      <UiField v-model="place" label="Место" :icon="MapPin" hint="Подсказки — из прошлых записей" />
      <UiField model-value="JTNB11HK103012345" label="VIN" mono disabled />
      <UiTextarea
        v-model="note"
        label="Заметка"
        placeholder="Например: масло Mobil 5W-30, фильтр Mann"
        :maxlength="500"
      />
      <UiAmountField v-model="amount" label="Сумма" />
      <UiSearchField v-model="search" placeholder="Поиск по записям" />
    </div>

    <div class="space-y-sp-4">
      <h2 class="text-h2 text-text">Выбор</h2>
      <div class="flex flex-wrap gap-sp-2">
        <UiChip :selected="typeFilter === 'all'" @click="typeFilter = 'all'">Все</UiChip>
        <UiChip
          v-for="type in entryTypes"
          :key="type"
          :selected="typeFilter === type"
          :icon="entryTypeIcons[type].icon"
          :icon-class="entryTypeIcons[type].colorClass"
          @click="typeFilter = type"
        >
          {{ entryTypeShortLabels[type] }}
        </UiChip>
        <UiChip v-model="oilChip" :icon="oilChip ? Check : undefined">Масло</UiChip>
        <UiChip :icon="SlidersHorizontal" icon-class="text-text">Фильтры · 2</UiChip>
      </div>
      <UiSegmented v-model="period" :options="PERIODS" label="Период" />
      <div class="flex items-center gap-sp-4">
        <UiToggle v-model="pushOn" label="Уведомления" />
        <UiToggle v-model="pushOff" label="Напоминание" />
        <UiToggle :model-value="true" label="Недоступно" disabled />
        <UiToggle :model-value="true" label="Закрыть напоминание" tone="success" />
      </div>
      <div role="radiogroup" aria-label="Тип записи" class="flex flex-wrap gap-sp-2">
        <UiTypeOption v-for="type in entryTypes" :key="type" v-model="entryType" :type="type" />
      </div>
    </div>
  </div>
</template>
