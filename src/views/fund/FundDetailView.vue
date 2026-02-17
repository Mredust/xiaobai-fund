<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import BaseTopNav from '@/components/BaseTopNav.vue'
import TrendChart from './components/TrendChart.vue'
import { fetchFundData, type FundDetailResult } from '@/api/fundApi'
import { useFundStore } from '@/stores/funds'
import { formatPercent, formatYmd } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const fundStore = useFundStore()

const loading = ref(false)
const errorText = ref('')
const detail = ref<FundDetailResult | null>(null)
const activeTab = ref<'sector' | 'performance'>('sector')
const activePeriod = ref<'1m' | '3m' | '6m' | '1y' | '3y'>('3m')
const showMoreSheet = ref(false)

const code = computed(() => String(route.params.code || '').trim())

const positionInfo = computed(() => {
  // 读取当前基金持仓信息，缺失时回退默认值。
  if (!fundStore.isHoldingFund(code.value)) {
    return null
  }

  return (
    fundStore.positionByCode[code.value] || {
      amount: '0.00',
      ratio: '--',
      cost: '--',
      profit: '0.00',
      profitRate: '--',
      holdingDays: '--',
      yesterdayProfit: '0.00',
      yesterdayProfitRate: '--'
    }
  )
})

const moreActions = computed(() => {
  // 更多弹窗仅保留基金PK和笔记两个入口。
  return [
    { name: '基金PK', key: 'fund-pk' },
    { name: '笔记', key: 'note' }
  ]
})

const trendByPeriod = computed(() => {
  // 根据周期筛选走势图数据点。
  const list = detail.value?.historyTrend || []
  const map = {
    '1m': 22,
    '3m': 66,
    '6m': 132,
    '1y': 240,
    '3y': 365
  }
  return list.slice(-map[activePeriod.value])
})

const intradayTrend = computed(() => {
  // 分时图取最近 60 个点。
  const list = detail.value?.historyTrend || []
  return list.slice(-60)
})

const tenTradeRows = computed(() => {
  // 取最近 10 个交易日，并计算每行涨跌幅。
  const list = detail.value?.historyTrend || []
  if (list.length < 2) {
    return [] as Array<{ date: string; nav: number; change: number }>
  }

  return list
    .slice(-10)
    .map((item, index, array) => {
      const prev = array[index - 1]
      const change = prev && prev.y !== 0 ? ((item.y - prev.y) / prev.y) * 100 : item.equityReturn || 0
      return {
        date: formatYmd(new Date(item.x)),
        nav: item.y,
        change
      }
    })
    .reverse()
})

const relatedBoards = computed(() => {
  // 构建关联板块列表，优先显示已知板块，其次补足市场热门板块。
  const names = new Set<string>()
  const rows: Array<{ name: string; trend: number }> = []

  const watchFund = fundStore.getWatchFundByCode(code.value)
  if (watchFund?.boardName) {
    names.add(watchFund.boardName)
  }

  fundStore.marketSectors.forEach((sector) => {
    if (!names.has(sector.name) && rows.length < 4) {
      names.add(sector.name)
    }
  })

  names.forEach((name) => {
    const sector = fundStore.getSectorByName(name)
    rows.push({ name, trend: sector?.trend ?? 0 })
  })

  return rows
})

const loadDetail = async () => {
  // 请求基金详情接口并刷新页面状态。
  if (!code.value) {
    detail.value = null
    return
  }

  loading.value = true
  errorText.value = ''

  try {
    detail.value = await fetchFundData(code.value)
  } catch (error) {
    console.error(error)
    errorText.value = '基金详情加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

const openSector = (name: string) => {
  // 点击关联板块跳转板块详情。
  router.push(`/sector/${encodeURIComponent(name)}`)
}

const openEditHolding = () => {
  // 点击修改持仓跳转修改持仓页。
  router.push(`/fund/${code.value}/edit-holding`)
}

const openTradeRecord = () => {
  // 点击交易记录跳转交易记录页。
  router.push(`/fund/${code.value}/trade-record`)
}

const deleteHolding = async () => {
  // 删除基金在持有标签中的数据。
  try {
    await showConfirmDialog({
      title: '提示',
      message: '确认删除该基金的持有记录？',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })

    const removed = fundStore.removeHoldingFund(code.value)
    if (!removed) {
      showToast('当前基金不在持有列表')
      return
    }

    showToast('已删持有')
  } catch {}
}

const deleteWatch = async () => {
  // 删除基金在自选标签中的数据。
  try {
    await showConfirmDialog({
      title: '提示',
      message: '确认从自选中移除该基金？',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })

    const removed = fundStore.removeWatchFund(code.value)
    if (!removed) {
      showToast('当前基金不在自选列表')
      return
    }

    showToast('已删自选')
  } catch {}
}

const openMore = () => {
  // 打开底部“更多”动作面板。
  showMoreSheet.value = true
}

const handleMoreAction = (action: { key?: string }) => {
  // 根据“更多”项执行对应动作。
  if (action.key === 'fund-pk') {
    showToast('基金PK功能开发中')
    return
  }

  if (action.key === 'note') {
    showToast('笔记功能开发中')
  }
}

watch(
  () => code.value,
  () => {
    // 路由 code 变化时重新加载详情。
    void loadDetail()
  },
  { immediate: true }
)
</script>

<template>
  <div class="page fund-detail-page">
    <BaseTopNav title="养基宝" />

    <section v-if="loading" class="card loading-card">
      <van-loading size="28" />
      <span>详情加载中...</span>
    </section>

    <section v-else-if="errorText" class="card loading-card">
      <van-empty image="error" :description="errorText" />
    </section>

    <template v-else-if="detail">
      <section class="card header-card">
        <div class="fund-name-wrap">
          <van-icon name="arrow-left" size="16" color="#606780" />
          <div class="fund-title">
            <strong>{{ detail.name }}</strong>
            <span>{{ detail.code }}</span>
          </div>
          <van-icon name="arrow" size="16" color="#606780" />
        </div>

        <div class="metrics-row">
          <div class="metric-item">
            <label>当日涨幅</label>
            <strong :class="detail.gszzl >= 0 ? 'up' : 'down'">{{ formatPercent(detail.gszzl) }}</strong>
          </div>
          <div class="metric-item">
            <label>近一年</label>
            <strong class="up">{{ formatPercent(detail.yearChange) }}</strong>
          </div>
          <div class="metric-item">
            <label>热度排名</label>
            <strong>{{ detail.heatRank }}/{{ detail.heatTotal }}</strong>
          </div>
        </div>

        <div v-if="positionInfo" class="position-grid">
          <div class="grid-cell">
            <span>持有金额</span>
            <strong>{{ positionInfo.amount }}</strong>
          </div>
          <div class="grid-cell">
            <span>持仓占比</span>
            <strong>{{ positionInfo.ratio }}</strong>
          </div>
          <div class="grid-cell">
            <span>持仓成本</span>
            <strong>{{ positionInfo.cost }}</strong>
          </div>
          <div class="grid-cell">
            <span>持有收益</span>
            <strong>{{ positionInfo.profit }}</strong>
          </div>
          <div class="grid-cell">
            <span>持有收益率</span>
            <strong>{{ positionInfo.profitRate }}</strong>
          </div>
          <div class="grid-cell">
            <span>持有天数</span>
            <strong>{{ positionInfo.holdingDays }}</strong>
          </div>
          <div class="grid-cell">
            <span>昨日收益</span>
            <strong>{{ positionInfo.yesterdayProfit }}</strong>
          </div>
          <div class="grid-cell">
            <span>昨日收益率</span>
            <strong>{{ positionInfo.yesterdayProfitRate }}</strong>
          </div>
        </div>
      </section>

      <section class="card tab-card">
        <van-tabs v-model:active="activeTab" line-width="24px" title-active-color="#162441" title-inactive-color="#707892">
          <van-tab name="sector" title="关联板块">
            <div class="tab-content">
              <div class="tab-tip">
                <span>当日走势</span>
                <strong :class="detail.gszzl >= 0 ? 'up' : 'down'">{{ formatPercent(detail.gszzl) }}</strong>
              </div>
              <TrendChart :points="intradayTrend" color="#13a368" />

              <div class="board-list">
                <button v-for="item in relatedBoards" :key="item.name" type="button" class="board-item" @click="openSector(item.name)">
                  <span>{{ item.name }}</span>
                  <strong :class="item.trend >= 0 ? 'up' : 'down'">{{ formatPercent(item.trend) }}</strong>
                </button>
              </div>
            </div>
          </van-tab>

          <van-tab name="performance" title="业绩走势">
            <div class="tab-content">
              <div class="period-switch">
                <button
                  v-for="period in ['1m', '3m', '6m', '1y', '3y']"
                  :key="period"
                  type="button"
                  class="period-btn"
                  :class="{ active: period === activePeriod }"
                  @click="activePeriod = period as '1m' | '3m' | '6m' | '1y' | '3y'"
                >
                  {{ period }}
                </button>
              </div>

              <TrendChart :points="trendByPeriod" color="#4a78f1" />

              <div class="table-head">
                <span>日期</span>
                <span>净值</span>
                <span>日涨幅</span>
              </div>
              <div class="table-body">
                <div v-for="item in tenTradeRows" :key="item.date" class="table-row">
                  <span>{{ item.date }}</span>
                  <span>{{ item.nav.toFixed(4) }}</span>
                  <span :class="item.change >= 0 ? 'up' : 'down'">{{ formatPercent(item.change) }}</span>
                </div>
              </div>
            </div>
          </van-tab>
        </van-tabs>
      </section>

      <section class="detail-bottom-bar">
        <button type="button" class="bar-btn" @click="openEditHolding">
          <van-icon name="edit" size="18" />
          <span>修改持仓</span>
        </button>
        <button type="button" class="bar-btn" @click="openTradeRecord">
          <van-icon name="notes-o" size="18" />
          <span>交易记录</span>
        </button>
        <button type="button" class="bar-btn" @click="deleteWatch">
          <van-icon name="minus" size="18" />
          <span>删自选</span>
        </button>
        <button type="button" class="bar-btn" @click="deleteHolding">
          <van-icon name="delete-o" size="18" />
          <span>删持有</span>
        </button>
        <button type="button" class="bar-btn" @click="openMore">
          <van-icon name="ellipsis" size="18" />
          <span>更多</span>
        </button>
      </section>
    </template>

    <van-action-sheet
      v-model:show="showMoreSheet"
      :actions="moreActions"
      cancel-text="取消"
      close-on-click-action
      @select="handleMoreAction"
    />
  </div>
</template>

<style scoped>
.fund-detail-page {
  padding-top: 0;
  padding-bottom: calc(84px + env(safe-area-inset-bottom));
}

.loading-card {
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
}

.header-card {
  padding: 12px;
}

.fund-name-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.fund-title {
  flex: 1;
  text-align: center;
  display: flex;
  flex-direction: column;
}

.fund-title strong {
  font-size: 1.75rem;
  line-height: 1.2;
}

.fund-title span {
  font-size: 0.9375rem;
  color: #747c92;
}

.metrics-row {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-item label {
  font-size: 0.8125rem;
  color: #6f7790;
}

.metric-item strong {
  font-size: 1.875rem;
  line-height: 1;
}

.position-grid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px 8px;
  border-top: 1px solid var(--line);
  padding-top: 12px;
}

.grid-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.grid-cell span {
  font-size: 0.8125rem;
  color: #7c8398;
}

.grid-cell strong {
  font-size: 1.0625rem;
}

.tab-card {
  margin-top: 10px;
  padding: 8px 0 14px;
}

.tab-content {
  padding: 10px 12px 0;
}

.tab-tip {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.tab-tip span {
  font-size: 0.8125rem;
  color: #7d8498;
}

.tab-tip strong {
  font-size: 1.125rem;
}

.board-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
}

.board-item {
  border: 0;
  background: transparent;
  border-bottom: 1px solid var(--line);
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 44px;
  cursor: pointer;
}

.board-item span {
  font-size: 1rem;
}

.board-item strong {
  font-size: 1rem;
}

.period-switch {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.period-btn {
  border: 0;
  background: #f2f4fb;
  color: #6f7790;
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 0.8125rem;
  cursor: pointer;
}

.period-btn.active {
  background: #dbe6ff;
  color: #355ecf;
}

.table-head,
.table-row {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr;
  align-items: center;
}

.table-head {
  margin-top: 10px;
  color: #7a8198;
  font-size: 0.8125rem;
}

.table-body {
  margin-top: 6px;
}

.table-row {
  min-height: 36px;
  font-size: 0.9375rem;
  border-bottom: 1px solid var(--line);
}

.table-row span:last-child {
  text-align: right;
}

.detail-bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  border-top: 1px solid var(--line);
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 19;
}

.bar-btn {
  border: 0;
  background: transparent;
  min-height: 58px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #232b42;
  font-size: 0.8125rem;
  cursor: pointer;
}
</style>


