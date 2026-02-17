<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import TagStrip from '@/components/TagStrip.vue'
import { useTagStore } from '@/stores/tags'
import { useFundStore } from '@/stores/funds'
import { formatPercent } from '@/utils/format'

const router = useRouter()
const tagStore = useTagStore()
const fundStore = useFundStore()

const watchTags = computed(() => tagStore.watchTags)
const activeWatchTagId = computed(() => tagStore.activeWatchTagId)

const watchFunds = computed(() => {
  // 自选列表按当前自选标签读取，标签之间互不共用数据。
  return fundStore.getWatchFundsByTag(activeWatchTagId.value)
})

const setActiveTag = (id: number) => {
  // 自选页标签切换。
  tagStore.setWatchActive(id)
}

const toTagManage = () => {
  // 点击加号进入自选标签管理页，不与首页标签共用数据。
  router.push('/tag-manage?scene=watchlist')
}

const toDetail = (code: string) => {
  // 点击列表项跳转基金详情。
  router.push(`/fund/${code}`)
}
</script>

<template>
  <div class="page watchlist-page">
    <section class="card watch-top">
      <TagStrip :items="watchTags" :active-id="activeWatchTagId" show-add @change="setActiveTag" @add="toTagManage" />

      <div class="toolbar">
        <div class="icons">
          <van-icon name="setting-o" size="19" />
          <van-icon name="bell" size="19" />
          <van-icon name="notes-o" size="19" />
          <van-icon name="replay" size="19" />
        </div>
        <div class="metrics">
          <div>
            <span>当日涨幅</span>
            <small>02-13</small>
          </div>
          <div>
            <span>关联板块</span>
            <small>02-13</small>
          </div>
        </div>
      </div>
    </section>

    <section class="card list-card">
      <van-empty v-if="watchFunds.length === 0" description="当前标签暂无基金" />

      <article v-for="item in watchFunds" :key="item.id" class="fund-row" @click="toDetail(item.code)">
        <div class="left">
          <strong>{{ item.name }}</strong>
          <span>{{ item.code }}</span>
        </div>

        <div class="right">
          <span class="change" :class="item.dailyChange >= 0 ? 'up' : 'down'">{{ formatPercent(item.dailyChange) }}</span>
          <div class="sub">
            <span>净值 {{ item.nav.toFixed(4) }}</span>
            <span :class="item.boardChange >= 0 ? 'up' : 'down'">{{ item.boardName }} {{ formatPercent(item.boardChange) }}</span>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.watchlist-page {
  padding-top: 10px;
}

.watch-top {
  padding: 10px 12px;
}

.toolbar {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.icons {
  display: flex;
  gap: 14px;
  color: #8a90a5;
}

.metrics {
  display: flex;
  gap: 16px;
  color: #6f768d;
}

.metrics div {
  text-align: right;
  display: flex;
  flex-direction: column;
  font-size: 0.75rem;
}

.metrics small {
  color: #a1a6b8;
}

.list-card {
  margin-top: 10px;
  padding: 2px 12px;
}

.fund-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--line);
  padding: 10px 0;
  cursor: pointer;
}

.fund-row:last-child {
  border-bottom: 0;
}

.left,
.right {
  display: flex;
  flex-direction: column;
}

.left {
  width: 52%;
}

.left strong {
  font-size: 1rem;
  line-height: 1.2;
}

.left span {
  margin-top: 5px;
  font-size: 0.8125rem;
  color: var(--text-sub);
}

.right {
  align-items: flex-end;
  width: 46%;
}

.change {
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1;
}

.sub {
  margin-top: 3px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  font-size: 0.75rem;
  color: #7d8397;
}
</style>


