<script setup lang="ts">
import {computed, ref} from 'vue'
import {useRouter} from 'vue-router'
import TagStrip from '@/components/TagStrip.vue'
import {useTagStore} from '@/stores/tags'
import {useFundStore} from '@/stores/funds'
import {formatPercent} from '@/utils/format'

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

const toFundSearch = () => {
  // 从自选页底部入口进入基金搜索，便于新增自选。
  router.push('/fund-search')
}

const toDetail = (code: string) => {
  // 点击列表项跳转基金详情。
  router.push(`/fund/${code}`)
}

const refreshing = ref(false)

const onRefresh = async () => {
  // 预留：仅刷新当前标签下的自选基金，不影响其他标签。
  try {
    const refreshAction = (fundStore as { refreshWatchFundsByTag?: (tagId: number) => Promise<void> | void })
      .refreshWatchFundsByTag

    if (typeof refreshAction === 'function') {
      await refreshAction(activeWatchTagId.value)
      return
    }

    // 兜底：若历史缓存污染导致 action 被覆盖，仍保证下拉刷新不报错。
    const tagId = activeWatchTagId.value
    const list = fundStore.getWatchFundsByTag(tagId)
    fundStore.watchFundsByTag[tagId] = list.map((item) => ({ ...item }))
  } finally {
    refreshing.value = false
  }
}
</script>

<template>
  <div class="page watchlist-page">
    <section class="card watch-top">
      <TagStrip :items="watchTags" :active-id="activeWatchTagId" show-add @change="setActiveTag" @add="toTagManage"/>

      <div class="toolbar">
        <div class="icons">
          <van-icon name="setting-o" size="19"/>
        </div>
        <div class="metrics">
          <div>
            <span>当日涨幅</span>
            <small>02-13</small>
          </div>
        </div>
      </div>
    </section>

    <section class="card list-card">
      <van-pull-refresh v-model="refreshing" class="list-pull" @refresh="onRefresh">
        <van-empty v-if="watchFunds.length === 0" description="当前标签暂无基金"/>

        <template v-else>
          <article v-for="item in watchFunds" :key="item.id" class="fund-row" @click="toDetail(item.code)">
            <div class="left">
              <strong>{{ item.name }}</strong>
              <span>{{ item.code }}</span>
            </div>

            <div class="right">
              <span class="change" :class="item.dailyChange >= 0 ? 'up' : 'down'">{{
                  formatPercent(item.dailyChange)
                }}</span>
              <div class="sub">
                <span>{{ item.nav.toFixed(4) }}</span>
              </div>
            </div>
          </article>
        </template>
      </van-pull-refresh>
    </section>

    <section class="add-watch-row">
      <button type="button" class="add-watch-btn" @click="toFundSearch">
        <van-icon name="plus" size="18"/>
        <span>新增自选</span>
      </button>
    </section>
  </div>
</template>

<style scoped>
.watchlist-page {
  --tabbar-space: calc(3.5rem + env(safe-area-inset-bottom));
  width: 100%;
  max-width: 100vw;
  padding-bottom: var(--tabbar-space);
  box-sizing: border-box;
  overflow-x: hidden;
  overscroll-behavior-x: none;
  touch-action: pan-y;
}

.watch-top {
  position: sticky;
  top: calc(0rem + env(safe-area-inset-top));
  z-index: 10;
  padding: 10px 12px;
}

.toolbar {
  margin-top: 5px;
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
  max-width: 100%;
  padding: 2px 12px;
  overflow-x: hidden;
}

.list-pull {
  overflow-x: hidden;
  touch-action: pan-y;
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
  min-width: 0;
}

.left strong {
  font-size: 0.8rem;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  font-size: 1rem;
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

.add-watch-btn {
  border: 0;
  background: transparent;
  color: #8a90a5;
  padding: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  cursor: pointer;
}

.add-watch-row {
  max-width: 100%;
  padding: 10px 12px 0;
  overflow-x: hidden;
}

.watchlist-page :deep(.van-pull-refresh__track) {
  touch-action: pan-y;
}
</style>
