<script setup lang="ts">
import { Tags } from 'lucide-vue-next'

// Экран «Категории машины» — этап 10
definePageMeta({ middleware: 'auth', layout: 'default' })

const route = useRoute()
</script>

<template>
  <div>
    <BackLink :to="`/cars/${route.params.id}/settings`">Настройки</BackLink>
    <h1 class="mb-4 mt-2 text-h1 text-text">Категории</h1>
    <UiCard>
      <UiEmptyState
        :icon="Tags"
        title="Категории скоро появятся"
        message="Здесь можно будет завести свои категории для этой машины."
      />
    </UiCard>
  </div>
</template>
