<script setup lang="ts">
defineProps<{
  withHeader: boolean
}>()
</script>

<template>
  <main class="layout-body" :class="{ 'with-header': withHeader }">
    <slot />
  </main>
</template>

<style scoped>
.layout-body {
  overflow-x: hidden;
}

.layout-body.with-header {
  padding-top: calc(3.125rem + env(safe-area-inset-top));
}
</style>
