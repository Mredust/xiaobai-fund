<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {useRouter} from 'vue-router'
import TagStrip from '@/components/TagStrip.vue'
import {TAG_NAME_ALL, useTagStore} from '@/stores/tags'
import {type WatchFundItem, useFundStore} from '@/stores/funds'
import {formatPercent} from '@/utils/format'

const router = useRouter()
const tagStore = useTagStore()
const fundStore = useFundStore()
const pageRef = ref<HTMLElement | null>(null)
const watchTopRef = ref<HTMLElement | null>(null)

const watchTags = computed(() => tagStore.watchTags)
const activeWatchTagId = computed(() => tagStore.activeWatchTagId)
const isAllWatchTag = computed(() => {
  const activeTag = watchTags.value.find((item) => item.id === activeWatchTagId.value)
  return activeTag?.name === TAG_NAME_ALL
})

const watchFunds = computed(() => {
  // “全部”标签聚合其他标签基金并去重，其他标签按自身读取。
  if (isAllWatchTag.value) {
    const mergedCodes = new Set<string>()
    const mergedFunds: WatchFundItem[] = []
    const nonAllTags = watchTags.value.filter((item) => item.name !== TAG_NAME_ALL)
    const allTag = watchTags.value.find((item) => item.name === TAG_NAME_ALL)
    const collectTags = allTag ? [...nonAllTags, allTag] : nonAllTags

    collectTags.forEach((tag) => {
      fundStore.getWatchFundsByTag(tag.id).forEach((item) => {
        if (mergedCodes.has(item.code)) {
          return
        }
        mergedCodes.add(item.code)
        mergedFunds.push(item)
      })
    })

    return mergedFunds
  }

  return fundStore.getWatchFundsByTag(activeWatchTagId.value)
})

const watchFundCodes = computed(() =>
  Array.from(
    new Set(
      watchFunds.value
        .map((item) => String(item.code || '').trim())
        .filter(Boolean)
    )
  )
)

const latestEstimateDate = computed(() => {
  // 头部日期取当前列表中最新一条估值时间。
  const latest = watchFunds.value
    .map((item) => String(item.estimateTime || '').trim())
    .filter(Boolean)
    .sort((a, b) => (a > b ? -1 : 1))[0]

  if (!latest) {
    return '--'
  }

  const dateText = latest.split(' ')[0] || latest
  return dateText.length >= 10 ? dateText.slice(5) : dateText
})

const setActiveTag = (id: number) => {
  // 自选页标签切换。
  tagStore.setWatchActive(id)
}

const toTagManage = () => {
  // 点击加号进入自选标签管理页，不与首页标签共用数据。
  router.push('/tag-manage?scene=watchlist')
}

const toImportWatch = () => {
  // 进入新增自选页，复用导入组件流程。
  router.push('/import-holdings?scene=watchlist')
}

const toDetail = (code: string) => {
  // 点击列表项跳转基金详情。
  router.push(`/fund/${code}`)
}

const syncingQuotes = ref(false)
let refreshTimer: number | null = null

const syncWatchTopHeight = () => {
  // 固定头部高度变化时，实时同步列表顶部留白，避免内容被遮挡。
  const height = watchTopRef.value?.offsetHeight || 0
  if (pageRef.value) {
    pageRef.value.style.setProperty('--watch-top-height', `${height}px`)
  }
}

const onRefresh = async () => {
  // 按当前列表 code 数组批量拉取估值数据。
  try {
    if (syncingQuotes.value) {
      return
    }
    syncingQuotes.value = true
    const codes = watchFundCodes.value
    if (codes.length === 0) {
      return
    }
    const refreshByCodes = (fundStore as { refreshWatchFundsByCodes?: (rows: string[]) => Promise<void> | void })
      .refreshWatchFundsByCodes
    if (typeof refreshByCodes === 'function') {
      await Promise.resolve(refreshByCodes(codes))
      return
    }
    // 兜底：老版本 store 不存在批量 action 时，仍可按标签刷新。
    const refreshByTag = (fundStore as { refreshWatchFundsByTag?: (tagId: number) => Promise<void> | void })
      .refreshWatchFundsByTag
    const targetTagIds = isAllWatchTag.value ? watchTags.value.map((item) => item.id) : [activeWatchTagId.value]
    if (typeof refreshByTag === 'function') {
      await Promise.all(targetTagIds.map((tagId) => Promise.resolve(refreshByTag(tagId))))
      return
    }
    targetTagIds.forEach((tagId) => {
      const list = fundStore.getWatchFundsByTag(tagId)
      fundStore.watchFundsByTag[tagId] = list.map((item) => ({ ...item }))
    })
  } finally {
    syncingQuotes.value = false
  }
}

onMounted(() => {
  void nextTick(syncWatchTopHeight)
  window.addEventListener('resize', syncWatchTopHeight)
  void onRefresh()
  refreshTimer = window.setInterval(() => {
    void onRefresh()
  }, 60_000)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncWatchTopHeight)
  if (refreshTimer !== null) {
    window.clearInterval(refreshTimer)
    refreshTimer = null
  }
})

watch(
    () => watchTags.value.length,
    () => {
      void nextTick(syncWatchTopHeight)
    }
)
</script>

<template>
  <div ref="pageRef" class="page watchlist-page">
    <section ref="watchTopRef" class="card watch-top">
      <TagStrip :items="watchTags" :active-id="activeWatchTagId" show-add @change="setActiveTag" @add="toTagManage"/>

      <div class="toolbar">
        <div class="icons">
          <van-icon name="setting-o" size="19"/>
          <button type="button" class="icon-btn" @click="onRefresh" :disabled="syncingQuotes">
            <van-icon name="replay" size="19" :class="{ spinning: syncingQuotes }"/>
          </button>
        </div>
        <div class="metrics">
          <div>
            <span>当日涨幅</span>
            <small>{{ latestEstimateDate }}</small>
          </div>
        </div>
      </div>
    </section>

    <section class="card list-card">
      <div v-if="watchFunds.length === 0" class="empty-wrap">
        <van-empty description="当前标签暂无基金">
          <van-button round color="#f6c428" type="primary" class="empty-add-btn" @click="toImportWatch">
            新增自选
          </van-button>
        </van-empty>
      </div>

      <template v-else>
        <article v-for="item in watchFunds" :key="item.id" class="fund-row" @click="toDetail(item.code)">
          <div class="left">
            <strong>{{ item.name }}</strong>
            <span>{{ item.code }}</span>
          </div>

          <div class="right">
            <span class="change" :class="item.dailyChange > 0 ? 'up' : item.dailyChange < 0 ? 'down' : ''">{{
                formatPercent(item.dailyChange)
              }}</span>
            <div class="sub">
              <span>{{ item.nav.toFixed(4) }}</span>
            </div>
          </div>
        </article>
      </template>
    </section>

    <section v-if="watchFunds.length > 0" class="add-watch-row">
      <button type="button" class="add-watch-btn" @click="toImportWatch">
        <van-icon name="plus" size="18"/>
        <span>新增自选</span>
      </button>
    </section>
  </div>
</template>

<style scoped>
.watchlist-page {
  --layout-header-height: calc(3.125rem + env(safe-area-inset-top));
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
  position: fixed;
  left: 0;
  right: 0;
  top: var(--layout-header-height);
  z-index: 18;
  padding: 10px 12px 0;
  box-sizing: border-box;
}

.toolbar {
  margin-top: 5px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.icons {
  display: flex;
  align-items: center;
  gap: 14px;
  color: #8a90a5;
}

.icon-btn {
  border: 0;
  background: transparent;
  color: inherit;
  padding: 0;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.icon-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.spinning {
  animation: spin 1s linear infinite;
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
  margin-top: calc(var(--watch-top-height, 96px) - 9px);
  max-width: 100%;
  padding: 2px 12px;
  overflow-x: hidden;
}

.empty-wrap {
  padding: 18px 0 8px;
}

.empty-add-btn {
  width: 220px;
  margin-top: 10px;
  font-weight: 600;
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
  font-weight: 400;
  line-height: 1;
}

.change.up {
  color: #e34a4a;
}

.change.down {
  color: #22a06b;
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

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
