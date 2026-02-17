<script setup lang="ts">
import {globalSettings} from '@/config/global'

const appName = globalSettings.appName
const emit = defineEmits<{
  search: []
}>()

const handleSearch = () => {
  // 统一向外抛出搜索点击事件，交由布局层处理路由跳转。
  emit('search')
}
</script>

<template>
  <header class="common-header">
    <div class="left-placeholder" aria-hidden="true"></div>
    <h1 class="title">{{ appName }}</h1>
    <button type="button" class="search-btn" @click="handleSearch">
      <van-icon name="search" size="20"/>
    </button>
  </header>
</template>

<style scoped>
.common-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 20;
  height: calc(50px + env(safe-area-inset-top));
  padding: env(safe-area-inset-top) 12px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  border-bottom: 1px solid var(--line);
}

.left-placeholder,
.search-btn {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}

.search-btn {
  border: 0;
  border-radius: 50%;
  background: #f4f6fb;
  cursor: pointer;
}
</style>

