<template>
  <!-- Без этого компонента @vite-pwa/nuxt не добавляет <link rel="manifest"> в разметку -->
  <VitePwaManifest />
  <NuxtLoadingIndicator color="#4f46e5" />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
