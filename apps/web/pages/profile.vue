<script setup lang="ts">
import { CarFront } from 'lucide-vue-next'

// Экран «Профиль» (З1) — #54; пока тема и вход в список машин (выход — в шапке)
definePageMeta({ middleware: 'auth', layout: 'default' })

const { user } = useAuth()
</script>

<template>
  <div>
    <h1 class="mb-4 text-h1 text-text">Профиль</h1>
    <p class="mb-4 text-body text-text-2">{{ user?.name }} · {{ user?.email }}</p>
    <ProfileThemeSetting />
    <UiCard class="mt-4">
      <UiRowSetting :icon="CarFront" label="Мои машины" to="/cars" />
    </UiCard>
  </div>
</template>
