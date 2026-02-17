<script setup lang="ts">
import BaseTopNav from '@/components/BaseTopNav.vue'

const issueUrl = 'https://github.com/Mredust/xiaobai-fund/issues'
</script>

<template>
  <div class="page feedback-page">
    <BaseTopNav title="问题反馈"/>

    <section class="card feedback-card">
      <p class="title">不足之处请见谅，欢迎提交你的宝贵建议：</p>
      <a :href="issueUrl" class="issue-link" target="_blank" rel="noopener noreferrer">{{ issueUrl }}</a>
    </section>
  </div>
</template>

<style scoped>
.feedback-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.feedback-card {
  display: flex;
  align-items: start;
  justify-content: center;
  flex-direction: column;
  gap: 0.75rem;
  text-align: center;
  padding: 1rem;
  margin: 1rem 0.5rem 0;
}

.title {
  margin: 0;
  font-size: 1rem;
  color: #1f2741;
}

.issue-link {
  font-size: 0.9375rem;
  color: #2f5bd8;
  word-break: break-all;
}
</style>
