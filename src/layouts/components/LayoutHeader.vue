<script setup lang="ts">
import CommonHeader from '@/components/CommonHeader.vue'

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  search: []
}>()
</script>

<template>
  <CommonHeader v-if="show" @search="emit('search')" />
</template>
