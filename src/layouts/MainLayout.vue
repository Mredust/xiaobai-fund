<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LayoutHeader from '@/layouts/components/LayoutHeader.vue'
import LayoutBody from '@/layouts/components/LayoutBody.vue'
import LayoutTabbar from '@/layouts/components/LayoutTabbar.vue'

const route = useRoute()
const router = useRouter()

const active = computed(() => {
  // Map current path to tab key so nested routes still highlight the right tab.
  const path = route.path
  if (path.startsWith('/watchlist')) {
    return '/watchlist'
  }
  if (path.startsWith('/market')) {
    return '/market'
  }
  if (path.startsWith('/profile')) {
    return '/profile'
  }
  return '/holdings'
})

const showCommonHeader = computed(() => {
  // Show common header on all tab pages except profile.
  return active.value !== '/profile'
})

const goSearch = () => {
  // 进入搜索页时带上来源 tab，供回显页返回时定向回到对应 tabbar 页面。
  router.push({
    path: '/fund-search',
    query: {
      tab: active.value
    }
  })
}
</script>

<template>
  <div class="main-layout">
    <LayoutHeader :show="showCommonHeader" @search="goSearch" />

    <LayoutBody :with-header="showCommonHeader">
      <router-view />
    </LayoutBody>

    <LayoutTabbar :active="active" />
  </div>
</template>

<style scoped>
.main-layout {
  background: var(--app-bg);
}
</style>
