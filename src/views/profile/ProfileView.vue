<script setup lang="ts">
import {useRouter} from 'vue-router'
import {showToast} from 'vant'
import {useProfileStore} from '@/stores/profile'

interface ProfileItem {
  id: number
  title: string
  icon: string
}

const router = useRouter()
const profileStore = useProfileStore()

const functionItems: ProfileItem[] = [
  {id: 1, title: '盈亏分析', icon: 'bar-chart-o'},
  {id: 2, title: '主题设置', icon: 'setting-o'}
]

const toProfileInfo = () => {
  // 点击右侧入口跳转个人信息编辑页。
  router.push('/profile-info')
}

const toFeedback = () => {
  // 点击反馈卡片跳转反馈页面。
  router.push('/feedback')
}

const onFunctionItemClick = () => {
  // 功能列表页面尚未开发时给出统一提示。
  showToast('功能尚未开发')
}
</script>

<template>
  <div class="page profile-page">
    <div class="profile-scroll">
      <section class="user-section">
        <van-image width="4.25rem" height="4.25rem" :src="profileStore.avatar" alt="头像" class="avatar"/>

        <div class="user-meta">
          <div class="name-row">
            <strong>{{ profileStore.nickname }}</strong>
          </div>
        </div>

        <button type="button" class="profile-entry" @click="toProfileInfo">
          <van-icon name="arrow" size="1.125rem"/>
        </button>
      </section>

      <section class="group-card">
        <button v-for="item in functionItems" :key="item.id" type="button" class="item-row"
                @click="onFunctionItemClick">
          <div class="row-left">
            <van-icon :name="item.icon" size="1.375rem"/>
            <span>{{ item.title }}</span>
          </div>
          <div class="row-right">
            <van-icon name="arrow" size="1rem"/>
          </div>
        </button>
      </section>

      <section class="single-card">
        <button type="button" class="item-row" @click="toFeedback">
          <div class="row-left">
            <van-icon name="comment-o" size="1.375rem"/>
            <span>问题反馈</span>
          </div>
          <div class="row-right">
            <van-icon name="arrow" size="1rem"/>
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

.user-section {
  margin-top: 0.9375rem;
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

.name-row strong {
  font-size: 1.5rem;
  font-weight: 500;
  font-family: 'STKaiti', 'KaiTi', serif;
  color: #1f2741;
}

.profile-entry {
  border: 0;
  background: transparent;
  color: #9aa1b5;
  width: 1.75rem;
  height: 1.75rem;
  position: relative;
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
  min-height: 3.875rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0.9375rem;
  color: #202741;
}

.item-row:last-child {
  border-bottom: 0;
}

.row-left {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  color: #4d5365;
}

.row-left span {
  font-size: 1rem;
  color: #1f2741;
}

.row-right {
  display: inline-flex;
  align-items: center;
  color: #a5acbf;
}
</style>
