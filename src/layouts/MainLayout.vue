<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CommonHeader from '../components/CommonHeader.vue'

const route = useRoute()
const router = useRouter()

const active = computed(() => {
  // 将当前路径映射到底部 tab，保证子路径时高亮正确。
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
  // 公共头部仅在持有、自选、行情三个主页面显示。
  return active.value !== '/profile'
})

const goSearch = () => {
  // 点击头部搜索图标进入基金搜索页。
  router.push('/fund-search')
}
</script>

<template>
  <div class="main-layout">
    <CommonHeader v-if="showCommonHeader" @search="goSearch" />

    <main class="main-content" :class="{ 'with-header': showCommonHeader }">
      <router-view />
    </main>

    <van-tabbar :model-value="active" route safe-area-inset-bottom>
      <van-tabbar-item replace to="/holdings" icon="records-o">持有</van-tabbar-item>
      <van-tabbar-item replace to="/watchlist" icon="star-o">自选</van-tabbar-item>
      <van-tabbar-item replace to="/market" icon="bar-chart-o">行情</van-tabbar-item>
      <van-tabbar-item replace to="/profile" icon="contact-o">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<style scoped>
.main-layout {
  background: var(--app-bg);
}

.main-content {
  overflow-x: hidden;
}

.main-content.with-header {
  padding-top: calc(50px + env(safe-area-inset-top));
}
</style>
