<script setup lang="ts">
import { useRouter } from 'vue-router'

const props = withDefaults(
  defineProps<{
    title: string
    showLeft?: boolean
  }>(),
  {
    showLeft: true
  }
)

const router = useRouter()

const goBack = () => {
  // 优先回退历史记录，若无历史则回首页，避免空白页。
  if (window.history.length > 1) {
    router.back()
    return
  }
  router.replace('/holdings')
}
</script>

<template>
  <header class="top-nav card">
    <div class="top-nav-left">
      <button v-if="props.showLeft" type="button" class="icon-btn" @click="goBack">
        <van-icon name="arrow-left" size="22" />
      </button>
    </div>
    <div class="top-nav-title">{{ props.title }}</div>
    <div class="top-nav-right">
      <slot name="right" />
    </div>
  </header>
</template>

<style scoped>
.top-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 8px;
}

.top-nav-left,
.top-nav-right {
  width: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.top-nav-title {
  flex: 1;
  text-align: center;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 1px;
}

.icon-btn {
  border: 0;
  background: transparent;
  padding: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
</style>

