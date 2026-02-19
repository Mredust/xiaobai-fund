<script setup lang="ts">
defineProps<{
  active: string
}>()
</script>

<template>
  <van-tabbar :model-value="active" route safe-area-inset-bottom>
    <van-tabbar-item replace to="/holdings" icon="records-o">持有</van-tabbar-item>
    <van-tabbar-item replace to="/watchlist" icon="star-o">自选</van-tabbar-item>
    <van-tabbar-item replace to="/profile" icon="contact-o">我的</van-tabbar-item>
  </van-tabbar>
</template>
