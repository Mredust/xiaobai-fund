<script setup lang="ts">
interface ActionItem {
  id: number
  title: string
  icon: string
  value?: string
}

const actionList: ActionItem[] = [
  { id: 1, title: '消息提醒设置', icon: 'bell', value: '去设置' },
  { id: 2, title: '显示设置', icon: 'setting-o' },
  { id: 3, title: '盈亏分析', icon: 'bar-chart-o' },
  { id: 4, title: '消息中心', icon: 'chat-o' },
  { id: 5, title: '建议反馈', icon: 'comment-o' },
  { id: 6, title: '切换数据源', icon: 'records-o', value: '数据源1' },
  { id: 7, title: '邀请码', icon: 'friends-o' }
]
</script>

<template>
  <div class="page profile-page">
    <section class="card user-card">
      <van-image
        width="58"
        height="58"
        src="https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg"
        alt="头像"
      />
      <div class="user-meta">
        <strong>M.红尘</strong>
        <span>养基宝已经陪伴您 217 天啦</span>
      </div>
    </section>

    <van-cell-group class="action-group">
      <van-cell v-for="item in actionList" :key="item.id" :title="item.title" :icon="item.icon" :value="item.value" is-link />
    </van-cell-group>
  </div>
</template>

<style scoped>
.profile-page {
  padding: 0;
  overflow-x: hidden;
  touch-action: pan-y;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
}

.user-meta {
  display: flex;
  flex-direction: column;
}

.user-meta strong {
  font-size: 1.4375rem;
}

.user-meta span {
  color: #767d91;
  font-size: 0.875rem;
  margin-top: 4px;
}

.action-group {
  margin-top: 10px;
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.profile-page :deep(*) {
  border-radius: 0 !important;
}
</style>

