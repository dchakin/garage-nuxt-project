<template>
  <!-- Без этого компонента @vite-pwa/nuxt не добавляет <link rel="manifest"> в разметку -->
  <VitePwaManifest />
  <NuxtLoadingIndicator color="var(--accent)" />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
