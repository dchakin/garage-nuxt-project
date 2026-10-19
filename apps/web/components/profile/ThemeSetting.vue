<script setup lang="ts">
import { Moon } from 'lucide-vue-next'
import { THEME_MODES, themeModeLabels, type ThemeMode } from '~/theme/constants'

const { mode, setMode } = useTheme()

const options = THEME_MODES.map((value) => ({ value, label: themeModeLabels[value] }))
</script>

<template>
  <div class="flex flex-col gap-sp-3 bg-surface px-sp-4 py-sp-3">
    <p class="flex items-center gap-sp-3 text-body text-text">
      <Moon class="h-5 w-5 shrink-0 text-text-2" aria-hidden="true" />
      Тема
    </p>
    <UiSegmented
      :model-value="mode"
      :options="options"
      label="Тема"
      @update:model-value="(next: ThemeMode) => setMode(next)"
    />
  </div>
</template>
