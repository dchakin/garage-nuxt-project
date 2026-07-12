<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { loggedIn } = useUserSession()
await navigateTo(loggedIn.value ? '/cars' : '/login')
</script>

<template>
  <div />
</template>
