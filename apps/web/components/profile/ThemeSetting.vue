<script setup lang="ts">
import { THEME_MODES, themeModeLabels } from '~/theme/constants'

const { mode, setMode } = useTheme()
</script>

<template>
  <div class="card p-4 mb-4">
    <p id="theme-setting-label" class="font-medium text-text mb-3">Тема</p>
    <div
      role="radiogroup"
      aria-labelledby="theme-setting-label"
      class="grid grid-cols-3 gap-1 rounded-md bg-surface-2 p-1"
    >
      <button
        v-for="option in THEME_MODES"
        :key="option"
        type="button"
        role="radio"
        :aria-checked="mode === option"
        class="h-9 whitespace-nowrap rounded-sm px-1 text-sm font-medium transition-colors duration-fast ease-standard"
        :class="mode === option ? 'bg-surface text-text shadow-sm' : 'text-text-2 hover:text-text'"
        @click="setMode(option)"
      >
        {{ themeModeLabels[option] }}
      </button>
    </div>
  </div>
</template>
