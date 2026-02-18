<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import BaseTopNav from '@/components/BaseTopNav.vue'
import TrendChart from '@/views/fund/components/TrendChart.vue'
import { fetchFundData, type FundDetailResult } from '@/api/fundApi'
import { useFundStore } from '@/stores/funds'
import { TAG_NAME_ALL, useTagStore } from '@/stores/tags'
import { formatPercent, formatYmd } from '@/utils/format'
import { globalSettings } from '@/config/global.ts'

const appName = globalSettings.appName
const route = useRoute()
const router = useRouter()
const fundStore = useFundStore()
const tagStore = useTagStore()

const COLOR_UP = '#e34a4a'
const COLOR_DOWN = '#22a06b'
const COLOR_FLAT = '#b9bfcc'

const loading = ref(false)
const errorText = ref('')
const detail = ref<FundDetailResult | null>(null)
const activeTab = ref<'sector' | 'performance'>('sector')
type PeriodKey = '1m' | '3m' | '6m' | '1y' | '3y'
const periodOptions: Array<{ key: PeriodKey; label: string }> = [
  {key: '1m', label: '近1月'},
  {key: '3m', label: '近3月'},
  {key: '6m', label: '近6月'},
  {key: '1y', label: '近1年'},
  {key: '3y', label: '近3年'}
]
const activePeriod = ref<PeriodKey>('3m')
const intradayXAxisLabels = ['9:30', '11:30/13:00', '15:00']
const showWatchGroupPopup = ref(false)
const selectedWatchTagId = ref(0)

const code = computed(() => String(route.params.code || '').trim())
const backToPath = computed(() => {
  // 来自搜索列表时，返回目标优先回到搜索页回显结果。
  const from = route.query.from
  if (typeof from !== 'string' || !from.startsWith('/fund-search')) {
    return ''
  }
  return from
})

const isHoldingFund = computed(() => fundStore.isHoldingFund(code.value))
const isWatchFund = computed(() => fundStore.isWatchFund(code.value))
const watchTags = computed(() => tagStore.watchTags)
const allWatchTagId = computed(() => watchTags.value.find((item) => item.name === TAG_NAME_ALL)?.id ?? 0)
const hasCustomWatchTag = computed(() => watchTags.value.some((item) => item.name !== TAG_NAME_ALL))

type BottomRule = 'rule1' | 'rule2' | 'rule3' | 'holdingOnly'
const bottomRule = computed<BottomRule>(() => {
  if (isHoldingFund.value && isWatchFund.value) {
    return 'rule3'
  }
  if (isHoldingFund.value && !isWatchFund.value) {
    return 'holdingOnly'
  }
  if (isWatchFund.value) {
    return 'rule2'
  }
  return 'rule1'
})

const parseMetricNumber = (value: string | number | undefined | null) => {
  // 从文本中提取可比较的数字，失败时回退 null。
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  if (!normalized || normalized === '--') {
    return null
  }

  const numeric = Number(normalized.replace(/[^\d.-]/g, ''))
  return Number.isFinite(numeric) ? numeric : null
}

const getNumberTrendClass = (value: number | null) => {
  if (value === null || value === 0) {
    return 'flat'
  }
  return value > 0 ? 'up' : 'down'
}

const getTrendColorByValue = (value: number | null) => {
  if (value === null || value === 0) {
    return COLOR_FLAT
  }
  return value > 0 ? COLOR_UP : COLOR_DOWN
}

const getMetricTrendClass = (value: string | number | undefined | null) => {
  const numeric = parseMetricNumber(value)
  return getNumberTrendClass(numeric)
}

const defaultPositionInfo = {
  amount: '0.00',
  ratio: '--',
  cost: '--',
  profit: '0.00',
  profitRate: '--',
  holdingDays: '--',
  yesterdayProfit: '0.00',
  yesterdayProfitRate: '--'
}

const currentNav = computed(() => {
  const gsz = Number(detail.value?.gsz)
  if (Number.isFinite(gsz) && gsz > 0) {
    return gsz
  }
  const dwjz = Number(detail.value?.dwjz)
  if (Number.isFinite(dwjz) && dwjz > 0) {
    return dwjz
  }
  return null
})

const basePositionInfo = computed(() => {
  if (!isHoldingFund.value) {
    return null
  }
  return fundStore.positionByCode[code.value] || defaultPositionInfo
})

const holdingTotalAmount = computed(() => {
  const seenCodes = new Set<string>()
  let total = 0

  Object.values(fundStore.holdingFundsByTag).forEach((rows) => {
    rows.forEach((item) => {
      if (seenCodes.has(item.code)) {
        return
      }
      seenCodes.add(item.code)
      const amount = parseMetricNumber(fundStore.positionByCode[item.code]?.amount)
      if (amount !== null && amount > 0) {
        total += amount
      }
    })
  })

  return total
})

const positionInfo = computed(() => {
  // 按 real-time-fund-main 口径：amount/profit + 当前净值 推导 share/cost/ratio。
  const base = basePositionInfo.value
  if (!base) {
    return null
  }

  const amount = parseMetricNumber(base.amount) ?? 0
  const profit = parseMetricNumber(base.profit) ?? 0
  const nav = currentNav.value
  const share = nav && amount > 0 ? amount / nav : null
  const principal = amount - profit
  const cost = share && share > 0 ? principal / share : null
  const ratio = amount > 0 && holdingTotalAmount.value > 0 ? (amount / holdingTotalAmount.value) * 100 : null
  const profitRate = principal > 0 ? (profit / principal) * 100 : null

  const dayRate = Number.isFinite(Number(detail.value?.gszzl)) ? Number(detail.value?.gszzl) : null
  const yesterdayProfit =
    dayRate !== null && amount > 0 ? amount - amount / (1 + dayRate / 100) : parseMetricNumber(base.yesterdayProfit)

  return {
    amount: amount.toFixed(2),
    amountValue: amount,
    shares: share !== null ? share.toFixed(2) : '--',
    sharesValue: share,
    ratio: ratio !== null ? `${ratio.toFixed(2)}%` : base.ratio || '--',
    ratioValue: ratio,
    profit: profit.toFixed(2),
    profitValue: profit,
    profitRate:
      profitRate !== null
        ? `${profitRate > 0 ? '+' : ''}${profitRate.toFixed(2)}%`
        : base.profitRate || '--',
    profitRateValue: profitRate,
    cost: cost !== null && cost > 0 ? cost.toFixed(4) : base.cost || '--',
    costValue: cost,
    yesterdayProfit:
      yesterdayProfit !== null && Number.isFinite(yesterdayProfit)
        ? yesterdayProfit.toFixed(2)
        : base.yesterdayProfit || '--',
    yesterdayProfitValue: yesterdayProfit,
    yesterdayProfitRate:
      dayRate !== null ? `${dayRate > 0 ? '+' : ''}${dayRate.toFixed(2)}%` : base.yesterdayProfitRate || '--',
    yesterdayProfitRateValue: dayRate,
    holdingDays: base.holdingDays || '--'
  }
})

const trendByPeriod = computed(() => {
  // 根据周期筛选走势图数据点。
  const list = detail.value?.historyTrend || []
  const map: Record<PeriodKey, number> = {
    '1m': 22,
    '3m': 66,
    '6m': 132,
    '1y': 240,
    '3y': 365
  }
  return list.slice(-map[activePeriod.value])
})

const nearestCloseDate = computed(() => {
  // 计算距离今天最近的收盘日期（优先今天之前最近一天）。
  const list = detail.value?.historyTrend || []
  if (!list.length) {
    return null
  }

  const now = Date.now()
  let latestPast = -Infinity
  let nearestFuture = Infinity

  list.forEach((item) => {
    const timestamp = item.x
    if (timestamp <= now && timestamp > latestPast) {
      latestPast = timestamp
      return
    }

    if (timestamp > now && timestamp < nearestFuture) {
      nearestFuture = timestamp
    }
  })

  const target = latestPast > -Infinity ? latestPast : nearestFuture
  if (!Number.isFinite(target)) {
    return null
  }

  return new Date(target)
})

const subtractMonths = (baseDate: Date, months: number) => {
  // 月份回退时保持尽量相同“日”并处理月末边界。
  const date = new Date(baseDate)
  const day = date.getDate()
  date.setDate(1)
  date.setMonth(date.getMonth() - months)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  date.setDate(Math.min(day, lastDay))
  return date
}

const dateRangeStartByPeriod = computed(() => {
  // 左端日期按“当前日期减所选周期”计算。
  const today = new Date()
  const monthMap: Record<PeriodKey, number> = {
    '1m': 1,
    '3m': 3,
    '6m': 6,
    '1y': 12,
    '3y': 36
  }
  return subtractMonths(today, monthMap[activePeriod.value])
})

const performanceXAxisLabels = computed(() => {
  const leftDate = dateRangeStartByPeriod.value
  const rightDate = nearestCloseDate.value || new Date()
  const middleDate = new Date(Math.round((leftDate.getTime() + rightDate.getTime()) / 2))

  return [formatYmd(leftDate), formatYmd(middleDate), formatYmd(rightDate)]
})

const selectedPeriodLabel = computed(() => {
  return periodOptions.find((item) => item.key === activePeriod.value)?.label || '近3月'
})

const selectedPeriodRangeChange = computed(() => {
  // 计算所选区间的涨跌幅。
  const list = trendByPeriod.value
  if (list.length < 2) {
    return null
  }

  const first = list[0]?.y
  const last = list[list.length - 1]?.y
  if (typeof first !== 'number' || typeof last !== 'number' || !Number.isFinite(first) || first === 0 || !Number.isFinite(last)) {
    return null
  }

  return ((last - first) / first) * 100
})

const selectedPeriodCostLineChange = computed(() => {
  // 以当前持仓成本估算成本线收益率。
  const latestNav = trendByPeriod.value[trendByPeriod.value.length - 1]?.y
  if (typeof latestNav !== 'number' || !Number.isFinite(latestNav) || latestNav <= 0) {
    return null
  }

  const cost = positionInfo.value?.costValue ?? null
  if (typeof cost !== 'number' || !Number.isFinite(cost) || cost <= 0) {
    return null
  }

  return ((latestNav - cost) / cost) * 100
})

const costLineValue = computed(() => {
  const cost = positionInfo.value?.costValue ?? null
  return typeof cost === 'number' && Number.isFinite(cost) && cost > 0 ? cost : null
})

const intradayTrendColor = computed(() => getTrendColorByValue(parseMetricNumber(detail.value?.gszzl)))
const performanceTrendColor = computed(() => getTrendColorByValue(selectedPeriodRangeChange.value))

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

const formatHoldingChange = (value: number | null) => {
  // 重仓股涨跌幅文案：正数带 +，0 不带符号。
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '--'
  }
  if (value === 0) {
    return '0.00%'
  }
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
}

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

const openEditHolding = () => {
  // 点击修改持仓跳转修改持仓页。
  router.push(`/fund/${code.value}/edit-holding`)
}

const openAddHolding = () => {
  // 点击添加持有进入“先选分组，再输入金额”的两步流程。
  router.push({
    path: `/fund/${code.value}/add-holding/select-tag`,
    query: {
      from: route.fullPath
    }
  })
}

const openTradeRecord = () => {
  // 点击交易记录跳转交易记录页。
  router.push(`/fund/${code.value}/trade-record`)
}

const openCompare = () => {
  // 基金对比入口占位，后续接真实能力。
  showToast('基金对比功能开发中')
}

const addWatchToTag = (tagId: number) => {
  // 添加当前基金到指定自选分组。
  const added = fundStore.addWatchFund({
    code: code.value,
    name: detail.value?.name || `基金${code.value}`,
    tagId
  })
  showToast(added ? '已加入自选' : '当前分组已存在该基金')
}

const openAddWatch = () => {
  // “加自选”按分组规则处理：仅全部分组时直接添加，否则弹分组选择框。
  if (isWatchFund.value) {
    showToast('当前基金已在自选列表')
    return
  }

  if (!hasCustomWatchTag.value) {
    const targetTagId = allWatchTagId.value || tagStore.activeWatchTagId
    if (!targetTagId) {
      showToast('暂无可用自选分组')
      return
    }
    addWatchToTag(targetTagId)
    return
  }

  selectedWatchTagId.value = tagStore.activeWatchTagId || allWatchTagId.value
  showWatchGroupPopup.value = true
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
  } catch {
  }
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
  } catch {
  }
}

const closeWatchGroupPopup = () => {
  // 关闭“加自选分组”弹窗。
  showWatchGroupPopup.value = false
}

const confirmAddWatchGroup = () => {
  // 确认添加到选中的自选分组。
  const targetTagId = selectedWatchTagId.value || allWatchTagId.value || tagStore.activeWatchTagId
  if (!targetTagId) {
    showToast('暂无可用自选分组')
    closeWatchGroupPopup()
    return
  }

  addWatchToTag(targetTagId)
  closeWatchGroupPopup()
}

const openWatchTagManage = () => {
  // 从弹窗里进入自选分组管理。
  closeWatchGroupPopup()
  router.push('/tag-manage?scene=watchlist')
}

watch(
    () => code.value,
    () => {
      // 路由 code 变化时重新加载详情。
      void loadDetail()
    },
    {immediate: true}
)
</script>

<template>
  <div class="page fund-detail-page">
    <BaseTopNav class="fund-top-nav" :title="appName" :back-to="backToPath"/>

    <section v-if="loading" class="card loading-card">
      <van-loading size="28"/>
      <span>详情加载中...</span>
    </section>

    <section v-else-if="errorText" class="card loading-card">
      <van-empty image="error" :description="errorText"/>
    </section>

    <template v-else-if="detail">
      <section class="card fund-name-card">
        <div class="fund-name-wrap">
          <div class="fund-title">
            <strong>{{ detail.name }}</strong>
            <span>{{ detail.code }}</span>
          </div>
        </div>
      </section>

      <section class="card header-card">
        <div class="metrics-row">
          <div class="metric-item metric-item--daily">
            <strong :class="getNumberTrendClass(detail.gszzl)">{{ formatPercent(detail.gszzl) }}</strong>
            <label>当日涨幅</label>
          </div>
          <div class="metric-item">
            <strong :class="getNumberTrendClass(detail.yearChange)">{{ formatPercent(detail.yearChange) }}</strong>
            <label>近一年</label>
          </div>
          <div class="metric-item">
            <strong>{{ detail.heatRank }}/{{ detail.heatTotal }}</strong>
            <label>热度排名</label>
          </div>
        </div>

        <div v-if="positionInfo" class="position-grid">
          <div class="grid-cell">
            <span>持有金额</span>
            <strong>{{ positionInfo.amount }}</strong>
          </div>
          <div class="grid-cell">
            <span>持有份额</span>
            <strong>{{ positionInfo.shares }}</strong>
          </div>
          <div class="grid-cell">
            <span>持仓占比</span>
            <strong>{{ positionInfo.ratio }}</strong>
          </div>
          <div class="grid-cell">
            <span>持有收益</span>
            <strong :class="getMetricTrendClass(positionInfo.profit)">{{ positionInfo.profit }}</strong>
          </div>
          <div class="grid-cell">
            <span>持有收益率</span>
            <strong :class="getMetricTrendClass(positionInfo.profitRate)">{{ positionInfo.profitRate }}</strong>
          </div>
          <div class="grid-cell">
            <span>持仓成本</span>
            <strong>{{ positionInfo.cost }}</strong>
          </div>
          <div class="grid-cell">
            <span>昨日收益</span>
            <strong :class="getMetricTrendClass(positionInfo.yesterdayProfit)">{{ positionInfo.yesterdayProfit }}</strong>
          </div>
          <div class="grid-cell">
            <span>昨日收益率</span>
            <strong :class="getMetricTrendClass(positionInfo.yesterdayProfitRate)">{{ positionInfo.yesterdayProfitRate }}</strong>
          </div>
          <div class="grid-cell">
            <span>持有天数</span>
            <strong>{{ positionInfo.holdingDays }}</strong>
          </div>
        </div>
      </section>

      <section class="card tab-card">
        <van-tabs v-model:active="activeTab" line-width="24px" title-active-color="#162441"
                  title-inactive-color="#707892">
          <van-tab name="sector" title="关联板块">
            <div class="tab-content">
              <div class="tab-tip">
                <span>当日走势</span>
                <strong :class="getNumberTrendClass(detail.gszzl)">{{ formatPercent(detail.gszzl) }}</strong>
              </div>
              <TrendChart :points="intradayTrend" :color="intradayTrendColor" :x-axis-labels="intradayXAxisLabels"/>

              <div class="holding-panel">
                <div class="holding-head">
                  <span>股票</span>
                  <span>持仓占比</span>
                  <span>涨跌幅</span>
                </div>

                <div v-if="detail.holdings.length" class="holding-body">
                  <div v-for="item in detail.holdings" :key="`${item.code}-${item.name}`" class="holding-row">
                    <div class="holding-stock">
                      <strong>{{ item.name }}</strong>
                      <span>{{ item.code }}</span>
                    </div>
                    <div class="holding-weight">{{ item.weight }}</div>
                    <div class="holding-change"
                         :class="typeof item.change === 'number' ? (item.change > 0 ? 'up' : item.change < 0 ? 'down' : 'flat') : 'flat'">
                      {{ formatHoldingChange(item.change) }}
                    </div>
                  </div>
                </div>

                <van-empty v-else image="error" description="暂无持仓数据"/>
              </div>
            </div>
          </van-tab>

          <van-tab name="performance" title="业绩走势">
            <div class="tab-content">
              <div class="performance-meta">
                <div class="meta-item">
                  <span>{{ selectedPeriodLabel }}涨跌幅</span>
                  <strong :class="getNumberTrendClass(selectedPeriodRangeChange)">
                    {{ selectedPeriodRangeChange === null ? '--' : formatPercent(selectedPeriodRangeChange) }}
                  </strong>
                </div>
                <div class="meta-item">
                  <span>成本线</span>
                  <strong :class="getNumberTrendClass(selectedPeriodCostLineChange)">
                    {{ selectedPeriodCostLineChange === null ? '--' : formatPercent(selectedPeriodCostLineChange) }}
                  </strong>
                </div>
              </div>

              <TrendChart
                :points="trendByPeriod"
                :color="performanceTrendColor"
                :x-axis-labels="performanceXAxisLabels"
                :cost-line-value="costLineValue"
                cost-line-label="成本线"
              />

              <div class="period-switch">
                <button
                    v-for="period in periodOptions"
                    :key="period.key"
                    type="button"
                    class="period-btn"
                    :class="{ active: period.key === activePeriod }"
                    @click="activePeriod = period.key"
                >
                  {{ period.label }}
                </button>
              </div>

              <div class="table-head">
                <span>日期</span>
                <span>净值</span>
                <span>日涨幅</span>
              </div>
              <div class="table-body">
                <div v-for="item in tenTradeRows" :key="item.date" class="table-row">
                  <span>{{ item.date }}</span>
                  <span>{{ item.nav.toFixed(4) }}</span>
                  <span :class="getNumberTrendClass(item.change)">{{ formatPercent(item.change) }}</span>
                </div>
              </div>
            </div>
          </van-tab>
        </van-tabs>
      </section>

      <section class="detail-bottom-bar" :class="{ compact: bottomRule === 'rule1' || bottomRule === 'rule2' }">
        <template v-if="bottomRule === 'rule1'">
          <button type="button" class="bar-btn" @click="openCompare">
            <van-icon name="exchange" size="18"/>
            <span>基金对比</span>
          </button>
          <button type="button" class="bar-btn" @click="openAddHolding">
            <van-icon name="plus" size="18"/>
            <span>添加持有</span>
          </button>
          <button type="button" class="bar-btn" @click="openAddWatch">
            <van-icon name="star-o" size="18"/>
            <span>加自选</span>
          </button>
        </template>

        <template v-else-if="bottomRule === 'rule2'">
          <button type="button" class="bar-btn" @click="openCompare">
            <van-icon name="exchange" size="18"/>
            <span>基金对比</span>
          </button>
          <button type="button" class="bar-btn" @click="openAddHolding">
            <van-icon name="plus" size="18"/>
            <span>添加持有</span>
          </button>
          <button type="button" class="bar-btn" @click="deleteWatch">
            <van-icon name="minus" size="18"/>
            <span>删自选</span>
          </button>
        </template>

        <template v-else-if="bottomRule === 'rule3'">
          <button type="button" class="bar-btn" @click="openEditHolding">
            <van-icon name="edit" size="18"/>
            <span>修改持仓</span>
          </button>
          <button type="button" class="bar-btn" @click="openTradeRecord">
            <van-icon name="notes-o" size="18"/>
            <span>交易记录</span>
          </button>
          <button type="button" class="bar-btn" @click="deleteWatch">
            <van-icon name="minus" size="18"/>
            <span>删自选</span>
          </button>
          <button type="button" class="bar-btn" @click="deleteHolding">
            <van-icon name="delete-o" size="18"/>
            <span>删除持有</span>
          </button>
          <button type="button" class="bar-btn" @click="openCompare">
            <van-icon name="exchange" size="18"/>
            <span>基金对比</span>
          </button>
        </template>

        <template v-else>
          <button type="button" class="bar-btn" @click="openEditHolding">
            <van-icon name="edit" size="18"/>
            <span>修改持仓</span>
          </button>
          <button type="button" class="bar-btn" @click="openTradeRecord">
            <van-icon name="notes-o" size="18"/>
            <span>交易记录</span>
          </button>
          <button type="button" class="bar-btn" @click="openAddWatch">
            <van-icon name="star-o" size="18"/>
            <span>加自选</span>
          </button>
          <button type="button" class="bar-btn" @click="deleteHolding">
            <van-icon name="delete-o" size="18"/>
            <span>删除持有</span>
          </button>
          <button type="button" class="bar-btn" @click="openCompare">
            <van-icon name="exchange" size="18"/>
            <span>基金对比</span>
          </button>
        </template>
      </section>
    </template>

    <van-popup v-model:show="showWatchGroupPopup" position="bottom" round class="group-popup">
      <div class="group-popup-head">
        <button type="button" class="group-new-btn" @click="openWatchTagManage">+ 新建</button>
        <strong>添加到以下分组</strong>
        <button type="button" class="group-close-btn" @click="closeWatchGroupPopup">
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
.fund-detail-page {
  --top-nav-height: 52px;
  --fund-name-height: 60px;
  --fixed-header-height: calc(var(--top-nav-height) + var(--fund-name-height));
  padding-top: 0;
  padding-bottom: calc(84px + env(safe-area-inset-bottom));
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  touch-action: pan-y;
  overscroll-behavior-x: none;
}

.fund-top-nav {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  z-index: 30;
}

.fund-name-card {
  position: fixed;
  left: 0;
  right: 0;
  top: var(--top-nav-height);
  z-index: 29;
  padding: 10px 12px;
  box-sizing: border-box;
}

.loading-card {
  margin-top: calc(var(--top-nav-height) + 10px);
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
}

.header-card {
  margin-top: calc(var(--fixed-header-height));
  padding: 12px;
}

.fund-name-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #ccc;
}

.fund-title {
  flex: 1;
  text-align: center;
  display: flex;
  flex-direction: column;
}

.fund-title strong {
  font-size: 1rem;
  line-height: 1.2;
  font-weight: 500;
  letter-spacing: 2px;
}

.fund-title span {
  margin-top: 4px;
  font-size: 0.9rem;
  color: #747c92;
}

.flat {
  color: #b9bfcc;
}

.metrics-row {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  align-items: end;
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
  font-size: 1.125rem;
  line-height: 1.2;
}

.metric-item--daily strong {
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

.holding-panel {
  margin-top: 10px;
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
}

.holding-head,
.holding-row {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  align-items: center;
  padding: 0 10px;
}

.holding-head {
  min-height: 36px;
  background: #f7f8fc;
  color: #7a8198;
  font-size: 0.8125rem;
  border-bottom: 1px solid var(--line);
}

.holding-head span:nth-child(2),
.holding-head span:nth-child(3),
.holding-weight,
.holding-change {
  text-align: right;
}

.holding-row {
  min-height: 58px;
  border-bottom: 1px solid var(--line);
}

.holding-row:last-child {
  border-bottom: 0;
}

.holding-stock {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.holding-stock strong {
  font-size: 1rem;
  line-height: 1.1;
  font-weight: 500;
  color: #1d2647;
}

.holding-stock span {
  font-size: 0.8125rem;
  color: #8b92a9;
}

.holding-weight,
.holding-change {
  font-size: 1rem;
  font-weight: 500;
  color: #1d2647;
}

.holding-change.flat {
  color: #6f7790;
}

.holding-change.up {
  color: #e34a4a;
}

.holding-change.down {
  color: #22a06b;
}

.performance-meta {
  margin-bottom: 8px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.meta-item {
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #f8faff;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.meta-item span {
  font-size: 0.8125rem;
  color: #7d8498;
}

.meta-item strong {
  font-size: 1rem;
  line-height: 1.2;
}

.period-switch {
  display: flex;
  gap: 6px;
  margin-top: 10px;
  margin-bottom: 10px;
}

.period-btn {
  flex: 1;
  border: 0;
  background: #f2f4fb;
  color: #6f7790;
  border-radius: 8px;
  padding: 6px 8px;
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
  padding: 0 10px;
}

.table-head {
  margin-top: 10px;
  color: #7a8198;
  font-size: 0.8125rem;
}

.table-head span:last-child,
.table-row span:last-child {
  text-align: right;
}

.table-body {
  margin-top: 6px;
}

.table-row {
  min-height: 36px;
  font-size: 0.9375rem;
  border-bottom: 1px solid var(--line);
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

.detail-bottom-bar.compact {
  display: flex;
  justify-content: space-around;
}

.bar-btn {
  border: 0;
  background: transparent;
  min-height: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #232b42;
  font-size: 0.8125rem;
  cursor: pointer;
}

.detail-bottom-bar.compact .bar-btn {
  min-width: 74px;
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
