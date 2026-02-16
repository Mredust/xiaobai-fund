<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import BaseTopNav from '../components/BaseTopNav.vue'
import { searchFunds, type SearchFundResult } from '../api/fundApi'
import { useFundStore } from '../stores/funds'
import { useTagStore } from '../stores/tags'

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
const hotList = computed(() => fundStore.hotFunds)
const pickMode = computed(() => String(route.query.mode || ''))
const isPickMode = computed(() => pickMode.value === 'pick' || pickMode.value === 'pick-convert')
const activeWatchTagId = computed(() => tagStore.activeWatchTagId)

const isWatchFund = (code: string) => {
  // 查询当前基金是否已在当前自选标签中，用于控制按钮文案。
  return fundStore.isWatchFund(code, activeWatchTagId.value)
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

const selectHistory = (item: SearchFundResult) => {
  // 点击历史/热搜项后回填输入并立刻开始搜索。
  keyword.value = item.code
  manualSearch()
}

const chooseFund = (item: SearchFundResult) => {
  // 选择模式下，根据来源场景回填目标数据。
  fundStore.recordSearchHistory(item)
  if (pickMode.value === 'pick') {
    fundStore.setManualImportFund({ code: item.code, name: item.name })
  } else {
    fundStore.setConvertTargetFund({ code: item.code, name: item.name })
  }
  router.back()
}

const openDetail = (item: SearchFundResult) => {
  // 普通模式点击结果进入基金详情页。
  fundStore.recordSearchHistory(item)
  router.push(`/fund/${item.code}`)
}

const clickResult = (item: SearchFundResult) => {
  // 根据页面模式分流到“选择基金”或“查看详情”。
  if (isPickMode.value) {
    chooseFund(item)
    return
  }
  openDetail(item)
}

const toggleWatch = (item: SearchFundResult, event: Event) => {
  // 点击右侧按钮切换当前标签的自选状态，不触发行点击跳转。
  event.stopPropagation()
  const changed = fundStore.toggleWatchFund({
    code: item.code,
    name: item.name,
    tagId: activeWatchTagId.value
  })
  if (changed) {
    showToast(isWatchFund(item.code) ? '已加入自选' : '已取消自选')
  }
}

const clearHistory = () => {
  // 清空搜索历史区域。
  fundStore.clearSearchHistory()
}

watch(
  keyword,
  (value) => {
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
  { flush: 'post' }
)

onBeforeUnmount(() => {
  // 组件销毁时清理防抖定时器。
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
})
</script>

<template>
  <div class="page fund-search-page">
    <BaseTopNav title="搜索" />

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
        <div class="section-head">
          <h3>搜索历史</h3>
          <button type="button" class="clear-btn" @click="clearHistory">
            <van-icon name="delete-o" size="18" />
          </button>
        </div>

        <div class="history-grid">
          <button v-for="item in historyList" :key="item.code" type="button" class="history-item" @click="selectHistory(item)">
            {{ item.name }}
          </button>
        </div>

        <div class="section-head hot-head">
          <h3>热搜基金Top5</h3>
        </div>

        <div class="hot-list">
          <button v-for="(item, index) in hotList" :key="item.code" type="button" class="hot-item" @click="selectHistory(item)">
            <span class="rank">{{ index + 1 }}</span>
            <div class="hot-main">
              <strong>{{ item.name }}</strong>
              <span>{{ item.code }}</span>
            </div>
          </button>
        </div>
      </template>

      <template v-else>
        <div v-if="loading" class="loading-wrap">
          <van-loading type="spinner" size="24" />
          <span>搜索中...</span>
        </div>

        <div v-else-if="results.length === 0" class="loading-wrap">
          <van-empty image="search" description="未搜索到基金" />
        </div>

        <div v-else class="result-list">
          <article v-for="item in results" :key="item.code" class="result-item" @click="clickResult(item)">
            <div class="left">
              <strong>{{ item.name }}</strong>
              <span>{{ item.code }}</span>
            </div>
            <button
              v-if="!isPickMode"
              type="button"
              class="watch-btn"
              :class="{ active: isWatchFund(item.code) }"
              @click="toggleWatch(item, $event)"
            >
              {{ isWatchFund(item.code) ? '已自选' : '加自选' }}
            </button>
            <span v-else class="pick-text">选择</span>
          </article>
        </div>
      </template>
    </section>
  </div>
</template>

<style scoped>
.fund-search-page {
  padding-top: 0;
}

.search-panel {
  padding: 12px;
}

.search-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-field {
  flex: 1;
  border: 1px solid #2f5bd8;
  border-radius: 10px;
  overflow: hidden;
}

.search-action {
  border: 0;
  background: transparent;
  color: #2f5bd8;
  font-size: 1.375rem;
  cursor: pointer;
}

.section-head {
  margin-top: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-head h3 {
  margin: 0;
  font-size: 2.125rem;
  font-weight: 700;
}

.clear-btn {
  border: 0;
  background: transparent;
  color: #8a90a5;
  cursor: pointer;
}

.history-grid {
  margin-top: 8px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 12px;
}

.history-item {
  border: 0;
  background: transparent;
  text-align: left;
  font-size: 1rem;
  color: #353b50;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0;
  min-height: 28px;
  cursor: pointer;
}

.hot-head {
  margin-top: 24px;
}

.hot-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hot-item {
  border: 0;
  background: transparent;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  cursor: pointer;
  text-align: left;
  padding: 4px 0;
}

.rank {
  width: 20px;
  font-size: 1.5rem;
  font-style: italic;
  font-weight: 700;
  color: #0e2149;
  margin-top: 1px;
}

.hot-item:nth-child(1) .rank {
  color: #f28a18;
}

.hot-item:nth-child(2) .rank {
  color: #5f98db;
}

.hot-item:nth-child(3) .rank {
  color: #f2b53f;
}

.hot-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.hot-main strong {
  font-size: 1rem;
}

.hot-main span {
  color: #7f8597;
  font-size: 0.875rem;
}

.loading-wrap {
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  color: #8d94a9;
}

.result-list {
  margin-top: 10px;
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

.pick-text {
  color: #2f5bd8;
  font-size: 0.875rem;
  font-weight: 600;
}
</style>

