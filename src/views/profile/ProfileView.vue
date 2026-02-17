<script setup lang="ts">
import { useProfileStore } from '@/stores/profile'

interface ProfileItem {
  id: number
  title: string
  icon: string
  value?: string
  highlight?: boolean
  dot?: boolean
}

const basicSettings: ProfileItem[] = [
  { id: 1, title: '消息提醒设置', icon: 'bell', value: '去设置', highlight: true, dot: true },
  { id: 2, title: '显示设置', icon: 'apps-o' }
]

const analysisItems: ProfileItem[] = [
  { id: 3, title: '盈亏分析', icon: 'bar-chart-o' },
  { id: 4, title: '消息中心', icon: 'chat-o' },
  { id: 5, title: '建议反馈', icon: 'comment-o' },
  { id: 6, title: '切换数据源', icon: 'records-o' }
]

const profileStore = useProfileStore()
</script>

<template>
  <div class="page profile-page">
    <div class="profile-scroll">
      <div class="tools-row">
        <button type="button" class="tool-pill">
          <van-icon name="ellipsis" size="1.25rem" />
          <span class="divider"></span>
          <van-icon name="minus" size="1.25rem" />
          <span class="divider"></span>
          <van-icon name="location-o" size="1.25rem" />
        </button>
      </div>

      <section class="user-section">
        <van-image width="5.25rem" height="5.25rem" :src="profileStore.avatar" alt="头像" class="avatar" />

        <div class="user-meta">
          <div class="name-row">
            <strong>{{ profileStore.nickname }}</strong>
            <span class="vip">VIP</span>
          </div>
          <p>养基宝已经陪伴您{{ profileStore.companionDays }}天啦</p>
        </div>

        <button type="button" class="profile-entry">
          <i class="dot"></i>
          <van-icon name="arrow" size="1.25rem" />
        </button>
      </section>

      <section class="group-card">
        <button v-for="item in basicSettings" :key="item.id" type="button" class="item-row">
          <div class="row-left">
            <van-icon :name="item.icon" size="1.5rem" />
            <span>{{ item.title }}</span>
          </div>
          <div class="row-right" :class="{ highlight: item.highlight }">
            <span v-if="item.value">{{ item.value }}</span>
            <i v-if="item.dot" class="small-dot"></i>
            <van-icon name="arrow" size="1.125rem" />
          </div>
        </button>
      </section>

      <section class="group-card">
        <button v-for="item in analysisItems" :key="item.id" type="button" class="item-row">
          <div class="row-left">
            <van-icon :name="item.icon" size="1.5rem" />
            <span>{{ item.title }}</span>
          </div>
          <div class="row-right" :class="{ highlight: item.highlight }">
            <span v-if="item.id === 6">{{ profileStore.dataSource }}</span>
            <van-icon name="arrow" size="1.125rem" />
          </div>
        </button>
      </section>

      <section class="single-card">
        <button type="button" class="item-row">
          <div class="row-left">
            <van-icon name="friends-o" size="1.5rem" />
            <span>邀请码</span>
          </div>
          <div class="row-right">
            <van-icon name="arrow" size="1.125rem" />
          </div>
        </button>
      </section>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  padding: 0;
  background: #f3f4f8;
}

.profile-scroll {
  min-height: calc(100vh - 3.5rem - env(safe-area-inset-bottom));
  padding: 0.875rem 0.75rem 1rem;
  overflow-y: auto;
  overflow-x: hidden;
}

.tools-row {
  display: flex;
  justify-content: flex-end;
}

.tool-pill {
  border: 0.0625rem solid #dbdee8;
  background: #f6f7fb;
  border-radius: 1.5rem;
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  min-height: 2.375rem;
  padding: 0 0.75rem;
  color: #2b3247;
}

.divider {
  width: 0.0625rem;
  height: 1rem;
  background: #d2d7e4;
}

.user-section {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.avatar {
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.user-meta {
  flex: 1;
  min-width: 0;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.name-row strong {
  font-size: 1.875rem;
  font-weight: 500;
  font-family: 'STKaiti', 'KaiTi', serif;
  line-height: 1.1;
}

.vip {
  font-size: 0.8125rem;
  color: #fff;
  background: linear-gradient(90deg, #f3c13a 0%, #d9a528 100%);
  border-radius: 0.75rem;
  padding: 0.125rem 0.5rem;
  font-weight: 600;
}

.user-meta p {
  margin: 0.375rem 0 0;
  font-size: 1.5625rem;
  color: #364063;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.profile-entry {
  border: 0;
  background: transparent;
  color: #8e95aa;
  width: 1.875rem;
  height: 1.875rem;
  position: relative;
}

.dot {
  position: absolute;
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 50%;
  background: #f34b5a;
  right: 0.1875rem;
  top: 0.125rem;
}

.group-card,
.single-card {
  margin-top: 0.875rem;
  border-radius: 0.625rem;
  background: #fff;
  box-shadow: 0 0.1875rem 0.625rem rgb(15 27 67 / 4%);
  overflow: hidden;
}

.item-row {
  width: 100%;
  border: 0;
  border-bottom: 0.0625rem solid #eef0f5;
  background: transparent;
  min-height: 3.625rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0.875rem;
  color: #202741;
}

.item-row:last-child {
  border-bottom: 0;
}

.row-left {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
}

.row-left span {
  font-size: 2rem;
}

.row-right {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: #9aa1b5;
}

.row-right span {
  font-size: 1.5rem;
}

.row-right.highlight {
  color: #f55b63;
}

.small-dot {
  width: 0.3125rem;
  height: 0.3125rem;
  border-radius: 50%;
  background: #f34b5a;
}
</style>
