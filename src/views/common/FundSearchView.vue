<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {showToast} from 'vant'
import BaseTopNav from '@/components/BaseTopNav.vue'
import {searchFunds, type SearchFundResult} from '@/api/fundApi'
import {useFundStore} from '@/stores/funds'
import {TAG_NAME_ALL, useTagStore} from '@/stores/tags'

const route = useRoute()
const router = useRouter()
const fundStore = useFundStore()
const tagStore = useTagStore()

const keyword = ref('')
const loading = ref(false)
const results = ref<SearchFundResult[]>([])

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const hasKeyword = computed(() => keyword.value.trim().length > 0)
const historyList = computed(() => fundStore.searchHistory)
const tabRouteWhitelist = new Set(['/holdings', '/watchlist', '/profile'])
const pickMode = computed(() => String(route.query.mode || ''))
const isPickMode = computed(
    () => pickMode.value === 'pick' || pickMode.value === 'pick-convert' || pickMode.value === 'pick-import'
)
const pickActionText = computed(() => (pickMode.value === 'pick-import' ? '导入' : '选择'))
const showWatchAction = computed(
  // 搜索结果默认展示“加自选”；仅在非自选导入模式才展示“选择/导入”按钮。
  () => !isPickMode.value || (pickMode.value === 'pick-import' && importScene.value === 'watchlist')
)
const importScene = computed<'watchlist' | 'holdings'>(() => {
  // 导入选择场景由路由参数决定，默认导入持仓标签。
  return route.query.scene === 'watchlist' ? 'watchlist' : 'holdings'
})
const activeWatchTagId = computed(() => tagStore.activeWatchTagId)
const activeHoldingTagId = computed(() => tagStore.activeHoldingTagId)
const watchTags = computed(() => tagStore.watchTags)
const watchedCodeSet = computed(() => new Set(fundStore.watchFundCodes))
const allWatchTagId = computed(() => watchTags.value.find((item) => item.name === TAG_NAME_ALL)?.id ?? 0)
const hasCustomWatchTag = computed(() => watchTags.value.some((item) => item.name !== TAG_NAME_ALL))
const topNavBackTo = computed(() => {
  // 回显页（replay=1）返回时直接回到来源 tab，避免再落回搜索首层页。
  if (route.query.replay !== '1') {
    return ''
  }

  if (isPickMode.value) {
    const from = typeof route.query.from === 'string' ? route.query.from.trim() : ''
    return from.startsWith('/') ? from : ''
  }

  const tab = typeof route.query.tab === 'string' ? route.query.tab : ''
  if (tabRouteWhitelist.has(tab)) {
    return tab
  }
  return '/holdings'
})

const groupPopupVisible = ref(false)
const pendingWatchFund = ref<SearchFundResult | null>(null)
const selectedWatchTagId = ref(0)
let suppressKeywordWatcher = false

const isWatchFund = (code: string) => {
  // 查询当前基金是否已在任一自选标签中，用于控制按钮文案。
  return watchedCodeSet.value.has(code)
}

const runSearch = async (text: string) => {
  // 执行搜索请求并刷新列表数据。
  const value = text.trim()
  if (!value) {
    results.value = []
    loading.value = false
    return
  }

  loading.value = true
  const data = await searchFunds(value)
  results.value = data
  loading.value = false
}

const manualSearch = () => {
  // 点击“搜索”按钮时立即触发查询，不走防抖等待。
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  void runSearch(keyword.value)
}

const buildSearchPath = (options?: { replay?: boolean }) => {
  // 构造搜索页地址：保留 mode/scene，并按当前关键词写入 q。
  const query: Record<string, string> = {}
  Object.entries(route.query).forEach(([key, value]) => {
    if (key === 'replay') {
      return
    }
    if (typeof value === 'string' && value.trim()) {
      query[key] = value
      return
    }
    if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) {
      query[key] = value[0]
    }
  })

  const q = keyword.value.trim()
  if (q) {
    query.q = q
  } else {
    delete query.q
  }

  if (options?.replay) {
    query.replay = '1'
  }

  return router.resolve({path: '/fund-search', query}).fullPath
}

const selectHistory = (item: SearchFundResult) => {
  // 点击历史项后回填输入并立刻开始搜索。
  keyword.value = item.code
  manualSearch()
}

const chooseFund = (item: SearchFundResult) => {
  // 选择模式下，根据来源场景回填目标数据。
  fundStore.recordSearchHistory(item)

  if (pickMode.value === 'pick') {
    fundStore.setManualImportFund({code: item.code, name: item.name})
    router.back()
    return
  }

  if (pickMode.value === 'pick-import') {
    if (importScene.value === 'watchlist') {
      const imported = fundStore.addWatchFund({code: item.code, name: item.name, tagId: activeWatchTagId.value})
      showToast(imported ? '已添加导入' : '当前自选标签已存在该基金')
    } else {
      const exists = fundStore.getHoldingFundsByTag(activeHoldingTagId.value).some((fund) => fund.code === item.code)
      fundStore.addHoldingFund({code: item.code, name: item.name, tagId: activeHoldingTagId.value})
      showToast(exists ? '当前持仓标签已存在该基金' : '已添加导入')
    }

    router.back()
    return
  }

  if (pickMode.value === 'pick-convert') {
    fundStore.setConvertTargetFund({code: item.code, name: item.name})
    router.back()
  }
}

const chooseFundByButton = (item: SearchFundResult, event: Event) => {
  // 选择模式下点击右侧按钮进行回填，不触发行跳转详情。
  event.stopPropagation()
  chooseFund(item)
}

const openDetail = async (item: SearchFundResult) => {
  // 普通模式点击结果进入基金详情页，并维护“搜索页 -> 回显页 -> 详情页”的路由栈。
  fundStore.recordSearchHistory(item)

  const replayPath = buildSearchPath({ replay: true })
  if (route.fullPath !== replayPath) {
    if (route.query.replay === '1') {
      await router.replace(replayPath)
    } else {
      await router.push(replayPath)
    }
  }

  await router.push({
    path: `/fund/${item.code}`
  })
}

const addWatchToTag = (item: SearchFundResult, tagId: number) => {
  // 添加基金到指定自选标签并提示结果。
  const added = fundStore.addWatchFund({
    code: item.code,
    name: item.name,
    tagId
  })
  showToast(added ? '已加入自选' : '当前分组已存在该基金')
}

const toggleWatch = (item: SearchFundResult, event: Event) => {
  // 点击“加自选/已自选”：已自选则移除，未自选按分组逻辑添加。
  event.stopPropagation()
  if (isWatchFund(item.code)) {
    const removed = fundStore.removeWatchFund(item.code)
    showToast(removed ? '已取消自选' : '当前基金不在自选列表')
    return
  }

  if (!hasCustomWatchTag.value) {
    const targetTagId = allWatchTagId.value || activeWatchTagId.value
    if (!targetTagId) {
      showToast('暂无可用自选分组')
      return
    }
    addWatchToTag(item, targetTagId)
    return
  }

  pendingWatchFund.value = item
  selectedWatchTagId.value = activeWatchTagId.value || allWatchTagId.value
  groupPopupVisible.value = true
}

const closeGroupPopup = () => {
  // 关闭分组弹窗并清理待加入基金。
  groupPopupVisible.value = false
  pendingWatchFund.value = null
}

const confirmAddWatchGroup = () => {
  // 确认添加到选中的自选分组。
  const item = pendingWatchFund.value
  if (!item) {
    closeGroupPopup()
    return
  }

  const targetTagId = selectedWatchTagId.value || allWatchTagId.value || activeWatchTagId.value
  if (!targetTagId) {
    showToast('暂无可用自选分组')
    closeGroupPopup()
    return
  }

  addWatchToTag(item, targetTagId)
  closeGroupPopup()
}

const openWatchTagManage = () => {
  // 弹窗内点击“+新建”跳转自选标签管理。
  closeGroupPopup()
  router.push('/tag-manage?scene=watchlist')
}

const clearHistory = () => {
  // 清空搜索历史区域。
  fundStore.clearSearchHistory()
}

watch(
    keyword,
    (value) => {
      if (suppressKeywordWatcher) {
        suppressKeywordWatcher = false
        return
      }

      // 输入防抖：停止输入 1.5 秒后再发起搜索。
      if (debounceTimer) {
        clearTimeout(debounceTimer)
        debounceTimer = null
      }

      if (!value.trim()) {
        results.value = []
        loading.value = false
        return
      }

      debounceTimer = setTimeout(() => {
        void runSearch(value)
      }, 1500)
    },
    {flush: 'post'}
)

onMounted(() => {
  // 从详情页返回搜索页时按 q 参数恢复回显列表。
  const q = typeof route.query.q === 'string' ? route.query.q.trim() : ''
  if (!q) {
    return
  }

  suppressKeywordWatcher = true
  keyword.value = q
  void runSearch(q)
})

onBeforeUnmount(() => {
  // 组件销毁时清理防抖定时器。
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
})
</script>

<template>
  <div class="page card fund-search-page">
    <BaseTopNav title="搜索" :back-to="topNavBackTo" class="search-top-nav"/>

    <section class="search-panel card">
      <div class="search-row">
        <van-field
            v-model="keyword"
            left-icon="search"
            clearable
            placeholder="请输入基金代码/名称/首字母"
            class="search-field"
            @keyup.enter="manualSearch"
        />
        <button type="button" class="search-action" @click="manualSearch">搜索</button>
      </div>

      <template v-if="!hasKeyword">
        <div class="history-wrap">
          <div class="section-head">
            <strong>搜索历史</strong>
            <button type="button" class="clear-btn" @click="clearHistory">
              <van-icon name="delete-o" size="18"/>
            </button>
          </div>

          <div class="history-grid">
            <button v-for="item in historyList" :key="item.code" type="button" class="history-item"
                    @click="selectHistory(item)">
              <strong class="history-name">{{ item.name }}</strong>
              <span class="history-code">{{ item.code }}</span>
            </button>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="result-scroll">
          <div v-if="loading" class="loading-wrap">
            <van-loading type="spinner" size="24"/>
            <span>搜索中...</span>
          </div>

          <div v-else-if="results.length === 0" class="loading-wrap">
            <van-empty image="search" description="未搜索到基金"/>
          </div>

          <div v-else class="result-list">
            <article v-for="item in results" :key="item.code" class="result-item" @click="openDetail(item)">
              <div class="left">
                <strong>{{ item.name }}</strong>
                <span>{{ item.code }}</span>
              </div>
              <button
                  v-if="showWatchAction"
                  type="button"
                  class="watch-btn"
                  :class="{ active: isWatchFund(item.code) }"
                  @click="toggleWatch(item, $event)"
              >
                {{ isWatchFund(item.code) ? '已自选' : '加自选' }}
              </button>
              <button v-else type="button" class="pick-text-btn" @click="chooseFundByButton(item, $event)">
                {{ pickActionText }}
              </button>
            </article>
          </div>
        </div>
      </template>
    </section>

    <van-popup v-model:show="groupPopupVisible" position="bottom" round class="group-popup">
      <div class="group-popup-head">
        <button type="button" class="group-new-btn" @click="openWatchTagManage">+ 新建</button>
        <strong>添加到以下分组</strong>
        <button type="button" class="group-close-btn" @click="closeGroupPopup">
          <van-icon name="cross" size="20"/>
        </button>
      </div>

      <van-radio-group v-model="selectedWatchTagId" class="group-list">
        <div
          v-for="tag in watchTags"
          :key="tag.id"
          class="group-item"
          role="button"
          tabindex="0"
          @click="selectedWatchTagId = tag.id"
          @keydown.enter.prevent="selectedWatchTagId = tag.id"
          @keydown.space.prevent="selectedWatchTagId = tag.id"
        >
          <van-radio :name="tag.id" checked-color="#2f5bd8"/>
          <span>{{ tag.name }}</span>
        </div>
      </van-radio-group>

      <button type="button" class="group-confirm-btn" @click="confirmAddWatchGroup">确认</button>
    </van-popup>
  </div>
</template>

<style scoped>
.fund-search-page {
  --search-nav-height: calc(3.125rem + env(safe-area-inset-top));
  padding-top: 0;
  height: 100vh;
  overflow: hidden;
}

.search-top-nav {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  z-index: 25;
  padding-top: env(safe-area-inset-top);
}

.search-panel {
  position: fixed;
  left: 0;
  right: 0;
  top: var(--search-nav-height);
  bottom: 0;
  padding: 12px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.search-row {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  min-height: 44px;
}

.history-wrap {
  margin-top: 10px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  padding-top: 44px;
}

.search-field {
  flex: 1;
  border: 1px solid #2f5bd8;
  border-radius: 10px;
  overflow: hidden;
}

.van-cell {
  padding: 5px;
}

.search-action {
  border: 0;
  background: transparent;
  color: #2f5bd8;
  font-size: 1rem;
  cursor: pointer;
}

.section-head {
  position: fixed;
  left: 12px;
  right: 12px;
  top: calc(var(--search-nav-height) + 12px + 44px + 10px);
  z-index: 24;
  margin-top: 0;
  min-height: 36px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
}

.section-head strong {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}

.clear-btn {
  border: 0;
  background: transparent;
  color: #8a90a5;
  cursor: pointer;
}

.history-grid {
  margin-top: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  border: 0;
  background: transparent;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 2px;
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
  word-break: break-all;
  padding: 5px 0;
  min-height: 28px;
  cursor: pointer;
  border-bottom:1px solid #ecf0f1;
}

.history-name {
  margin: 0;
  font-size: 1rem;
  color: #353b50;
  line-height: 1.4;
  font-weight: 500;
}

.history-code {
  font-size: 0.8125rem;
  color: #8a90a5;
  line-height: 1.2;
}

.loading-wrap {
  min-height: 220px;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  color: #8d94a9;
}

.result-list {
  margin-top: 0;
}

.result-scroll {
  margin-top: 10px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
}

.result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--line);
  padding: 12px 0;
  cursor: pointer;
}

.left {
  width: 68%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.left strong {
  font-size: 1.0625rem;
}

.left span {
  color: #7f8597;
  font-size: 0.8125rem;
}

.watch-btn {
  border: 1px solid #2f5bd8;
  background: #fff;
  color: #2f5bd8;
  border-radius: 16px;
  min-width: 74px;
  padding: 4px 10px;
  font-size: 0.875rem;
  cursor: pointer;
}

.watch-btn.active {
  border-color: #dfe3ef;
  background: #f4f6fb;
  color: #8f96ab;
}

.watch-btn:disabled {
  cursor: default;
}

.pick-text-btn {
  border: 0;
  background: transparent;
  color: #2f5bd8;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.group-popup {
  max-height: 70vh;
  overflow: hidden;
}

.group-popup-head {
  height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  border-bottom: 1px solid var(--line);
}

.group-popup-head strong {
  font-size: 1.125rem;
  font-weight: 700;
  color: #111a37;
}

.group-new-btn,
.group-close-btn {
  border: 0;
  background: transparent;
  color: #2f5bd8;
  font-size: 1rem;
  cursor: pointer;
}

.group-close-btn {
  color: #b6bccd;
  display: inline-flex;
  align-items: center;
}

.group-list {
  max-height: calc(70vh - 134px);
  overflow-y: auto;
}

.group-item {
  height: 58px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border-bottom: 1px solid var(--line);
  font-size: 1.0625rem;
  color: #111a37;
  cursor: pointer;
}

.group-confirm-btn {
  width: 100%;
  height: 62px;
  border: 0;
  background: #fff;
  color: #101a39;
  font-size: 1.125rem;
  font-weight: 700;
  border-top: 1px solid #dde2f1;
  cursor: pointer;
}
</style>
