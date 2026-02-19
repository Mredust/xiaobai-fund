<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {useRouter} from 'vue-router'
import {showToast} from 'vant'
import TagStrip from '@/components/TagStrip.vue'
import SummaryScrollHead from '@/views/hold/components/SummaryScrollHead.vue'
import {buildMiniTrendPath} from '@/utils/chart'
import {formatPercent, formatSignedNumber} from '@/utils/format'
import {toSafeNumber} from '@/utils/number'
import {HOLDING_ACCOUNT_SUMMARY_NAME, TAG_NAME_ALL, useTagStore} from '@/stores/tags'
import {type WatchFundItem, useFundStore} from '@/stores/funds'

interface SummaryCardItem {
  tagId: number
  tagName: string
  upCount: number
  downCount: number
  asset: number
  holdingProfit: number
  holdingProfitRate: number
  dayProfit: number
  dayProfitRate: number
  trendPath: string
}

const router = useRouter()
const tagStore = useTagStore()
const fundStore = useFundStore()
const pageRef = ref<HTMLElement | null>(null)
const holdingsTopRef = ref<HTMLElement | null>(null)
const syncingQuotes = ref(false)
let refreshTimer: number | null = null

const tags = computed(() => tagStore.holdingTags)
const activeTagId = computed(() => tagStore.activeHoldingTagId)

const isAccountSummaryTab = computed(() => {
  // 使用标签名称判断是否为“账户汇总”模式，避免依赖固定 id。
  const activeTag = tags.value.find((item) => item.id === activeTagId.value)
  return activeTag?.name === HOLDING_ACCOUNT_SUMMARY_NAME
})

const isAllTab = computed(() => {
  // 使用标签名称判断是否为“全部”模式，避免依赖固定 id。
  const activeTag = tags.value.find((item) => item.id === activeTagId.value)
  return activeTag?.name === TAG_NAME_ALL
})

const summaryTagList = computed(() => {
  // 分类汇总卡片排除“账户汇总”和“全部”标签。
  return tags.value.filter((item) => item.name !== HOLDING_ACCOUNT_SUMMARY_NAME && item.name !== TAG_NAME_ALL)
})

const allHoldingTag = computed(() => tags.value.find((item) => item.name === TAG_NAME_ALL) || null)

const mergeUniqueFundsByCode = (rows: ReturnType<typeof fundStore.getHoldingFundsByTag>) => {
  // “全部”标签下按 code 去重，避免同一基金重复展示。
  const seenCodes = new Set<string>()
  return rows.filter((item) => {
    if (seenCodes.has(item.code)) {
      return false
    }
    seenCodes.add(item.code)
    return true
  })
}

const displayFunds = computed(() => {
  // “账户汇总”聚合其他所有标签，其余标签按规则展示。
  if (isAccountSummaryTab.value) {
    return summaryTagList.value.flatMap((tag) => fundStore.getHoldingFundsByTag(tag.id))
  }

  // “全部”在汇总其他标签基础上，也包含直接加到“全部”标签的基金。
  if (isAllTab.value) {
    const summaryFunds = summaryTagList.value.flatMap((tag) => fundStore.getHoldingFundsByTag(tag.id))
    const allTagFunds = allHoldingTag.value ? fundStore.getHoldingFundsByTag(allHoldingTag.value.id) : []
    return mergeUniqueFundsByCode([...summaryFunds, ...allTagFunds])
  }

  return fundStore.getHoldingFundsByTag(activeTagId.value)
})

const holdingFundCodes = computed(() => {
  // 读取全部持有标签的基金 code，并去重用于定时刷新。
  return [
    ...new Set(
      Object.values(fundStore.holdingFundsByTag)
        .flatMap((list) => list.map((item) => item.code))
    )
  ]
})

const currentScopeFunds = computed(() => {
  // 顶部资产汇总与当前列表展示范围保持一致。
  return displayFunds.value
})

const summaryAsset = computed(() => {
  // 汇总作用域下的账户资产。
  return currentScopeFunds.value.reduce((sum, item) => sum + toSafeNumber(fundStore.positionByCode[item.code]?.amount), 0)
})

const summaryDayProfit = computed(() => {
  // 汇总作用域下的当日收益。
  return currentScopeFunds.value.reduce((sum, item) => sum + toSafeNumber(fundStore.positionByCode[item.code]?.yesterdayProfit), 0)
})

const accountSummaryCards = computed<SummaryCardItem[]>(() => {
  // 构建账户汇总模式下的分类卡片数据。
  return summaryTagList.value.map((tag) => {
    const funds = fundStore.getHoldingFundsByTag(tag.id)
    const asset = funds.reduce((sum, item) => sum + toSafeNumber(fundStore.positionByCode[item.code]?.amount), 0)
    const holdingProfit = funds.reduce((sum, item) => sum + toSafeNumber(fundStore.positionByCode[item.code]?.profit), 0)
    const dayProfit = funds.reduce((sum, item) => sum + toSafeNumber(fundStore.positionByCode[item.code]?.yesterdayProfit), 0)
    const upCount = funds.filter((item) => item.dailyChange > 0).length
    const downCount = funds.filter((item) => item.dailyChange < 0).length

    return {
      tagId: tag.id,
      tagName: tag.name,
      upCount,
      downCount,
      asset,
      holdingProfit,
      holdingProfitRate: asset > 0 ? (holdingProfit / asset) * 100 : 0,
      dayProfit,
      dayProfitRate: asset > 0 ? (dayProfit / asset) * 100 : 0,
      trendPath: buildMiniTrendPath(tag.id, funds)
    }
  })
})

const upCount = computed(() => displayFunds.value.filter((item) => item.dailyChange > 0).length)
const downCount = computed(() => displayFunds.value.filter((item) => item.dailyChange < 0).length)

const parseMetricNumber = (value: string | number | undefined | null) => {
  // 解析展示值中的数字，无法解析时回退 null。
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

const getMetricClass = (value: string | number | undefined | null) => {
  const numeric = parseMetricNumber(value)
  if (numeric === null || numeric === 0) {
    return 'flat'
  }
  return numeric > 0 ? 'up' : 'down'
}

const formatMetricAmount = (value: string | number | undefined | null) => {
  const numeric = parseMetricNumber(value)
  if (numeric === null) {
    return '--'
  }
  return formatSignedNumber(numeric)
}

const formatMetricPercent = (value: string | number | undefined | null) => {
  const numeric = parseMetricNumber(value)
  if (numeric === null) {
    return '--'
  }
  return formatPercent(numeric)
}

const formatNav = (value: number | undefined) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '--'
  }
  return value.toFixed(4)
}

const formatHoldingAmount = (value: string | number | undefined | null) => {
  const amount = toSafeNumber(value ?? 0)
  return amount > 0 ? amount.toFixed(2) : '--'
}

const truncateFundName = (name: string, maxLength = 6) => {
  // 基金名称超过指定字数时追加省略号。
  const chars = Array.from(String(name || ''))
  if (chars.length <= maxLength) {
    return name
  }
  return `${chars.slice(0, maxLength).join('')}...`
}

const setActiveTag = (id: number) => {
  // 首页标签切换。
  tagStore.setHoldingActive(id)
}

const toTagManage = () => {
  // 点击加号进入持有标签管理页。
  router.push('/tag-manage?scene=holdings')
}

const toImport = () => {
  // 空状态按钮跳转到同步持仓页。
  router.push('/import-holdings?scene=holdings')
}

const toSyncHolding = () => {
  // 列表底部“同步持仓”入口，复用导入持仓流程。
  router.push('/import-holdings?scene=holdings')
}

const toFundDetail = (code: string) => {
  // 点击基金行进入基金详情页。
  router.push(`/fund/${code}`)
}

const showFundActionPopup = ref(false)
const showMoveGroupDialog = ref(false)
const actionFund = ref<WatchFundItem | null>(null)
const moveTargetTagId = ref(0)
const keepFundInSourceTag = ref(false)
const suppressNextFundClick = ref(false)
let longPressTimer: number | null = null

const movableHoldingTags = computed(() =>
  tags.value.filter((item) => item.name !== HOLDING_ACCOUNT_SUMMARY_NAME)
)

const clearLongPressTimer = () => {
  if (longPressTimer !== null) {
    window.clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

const openFundActions = (item: WatchFundItem) => {
  actionFund.value = item
  showFundActionPopup.value = true
}

const onFundTouchStart = (item: WatchFundItem, event: TouchEvent) => {
  if (event.touches.length > 1) {
    return
  }

  clearLongPressTimer()
  longPressTimer = window.setTimeout(() => {
    suppressNextFundClick.value = true
    openFundActions(item)
  }, 450)
}

const onFundTouchEnd = () => {
  clearLongPressTimer()
}

const onFundItemClick = (item: WatchFundItem) => {
  if (suppressNextFundClick.value) {
    suppressNextFundClick.value = false
    return
  }

  toFundDetail(item.code)
}

const getSourceTagIds = (code: string) => {
  // 当前在“全部”标签时，来源标签为包含该基金的全部分组。
  if (isAllTab.value) {
    return movableHoldingTags.value
      .filter((tag) => fundStore.getHoldingFundsByTag(tag.id).some((fund) => fund.code === code))
      .map((tag) => tag.id)
  }

  return [activeTagId.value]
}

const openMoveGroupDialog = () => {
  const targetFund = actionFund.value
  if (!targetFund) {
    showFundActionPopup.value = false
    return
  }

  const sourceTagIds = getSourceTagIds(targetFund.code)
  const preferredTag =
    movableHoldingTags.value.find((item) => !sourceTagIds.includes(item.id)) || movableHoldingTags.value[0] || null

  if (!preferredTag) {
    showToast('暂无可用分组')
    return
  }

  moveTargetTagId.value = preferredTag.id
  keepFundInSourceTag.value = false
  showFundActionPopup.value = false
  showMoveGroupDialog.value = true
}

const closeMoveGroupDialog = () => {
  showMoveGroupDialog.value = false
}

const confirmMoveGroup = () => {
  const targetFund = actionFund.value
  if (!targetFund) {
    closeMoveGroupDialog()
    return
  }

  const targetTagId = moveTargetTagId.value
  if (!targetTagId) {
    showToast('请选择目标分组')
    return
  }

  const sourceTagIds = getSourceTagIds(targetFund.code)
  const amount = toSafeNumber(fundStore.positionByCode[targetFund.code]?.amount)
  const profit = toSafeNumber(fundStore.positionByCode[targetFund.code]?.profit)

  fundStore.addHoldingFund({
    tagId: targetTagId,
    code: targetFund.code,
    name: targetFund.name,
    amount,
    profit
  })

  if (!keepFundInSourceTag.value) {
    sourceTagIds
      .filter((tagId) => tagId !== targetTagId)
      .forEach((tagId) => {
        fundStore.removeHoldingFund(targetFund.code, tagId)
      })
  }

  closeMoveGroupDialog()
  showToast(keepFundInSourceTag.value ? '已添加到目标分组' : '已移动到目标分组')
}

const openHoldingTagManage = () => {
  closeMoveGroupDialog()
  router.push('/tag-manage?scene=holdings')
}

const openCategoryTag = (tagId: number) => {
  // 点击分类卡片切换到对应标签页面。
  tagStore.setHoldingActive(tagId)
}

const syncHoldingsTopHeight = () => {
  // 固定顶部高度变化时，实时同步内容区顶部偏移，避免遮挡首屏内容。
  const height = holdingsTopRef.value?.offsetHeight || 0
  if (pageRef.value) {
    pageRef.value.style.setProperty('--holdings-top-height', `${height}px`)
  }
}

const onRefresh = async () => {
  // 每分钟按全部持有基金 code 刷新估值快照。
  try {
    if (syncingQuotes.value) {
      return
    }

    syncingQuotes.value = true
    const codes = holdingFundCodes.value
    if (codes.length === 0) {
      return
    }

    const refreshByCodes = (fundStore as { refreshHoldingFundsByCodes?: (rows: string[]) => Promise<void> | void })
      .refreshHoldingFundsByCodes

    if (typeof refreshByCodes === 'function') {
      await Promise.resolve(refreshByCodes(codes))
      return
    }

    // 兜底：老版本 store 不存在刷新 action 时，保持引用更新触发视图刷新。
    Object.keys(fundStore.holdingFundsByTag).forEach((key) => {
      const tagId = Number(key)
      const list = fundStore.getHoldingFundsByTag(tagId)
      fundStore.holdingFundsByTag[tagId] = list.map((item) => ({ ...item }))
    })
  } finally {
    syncingQuotes.value = false
  }
}

onMounted(() => {
  void nextTick(syncHoldingsTopHeight)
  window.addEventListener('resize', syncHoldingsTopHeight)
  void onRefresh()
  refreshTimer = window.setInterval(() => {
    void onRefresh()
  }, 60_000)
})

onBeforeUnmount(() => {
  clearLongPressTimer()
  window.removeEventListener('resize', syncHoldingsTopHeight)
  if (refreshTimer !== null) {
    window.clearInterval(refreshTimer)
    refreshTimer = null
  }
})

watch(
    [showMoveGroupDialog, movableHoldingTags],
    ([visible]) => {
      if (!visible) {
        return
      }

      if (movableHoldingTags.value.some((item) => item.id === moveTargetTagId.value)) {
        return
      }

      moveTargetTagId.value = movableHoldingTags.value[0]?.id || 0
    }
)

watch(
    () => tags.value.length,
    () => {
      void nextTick(syncHoldingsTopHeight)
    }
)
</script>

<template>
  <div ref="pageRef" class="page holdings-page">
    <section ref="holdingsTopRef" class="holdings-top card">
      <TagStrip :items="tags" :active-id="activeTagId" show-add @change="setActiveTag" @add="toTagManage"/>
    </section>

    <section v-if="isAccountSummaryTab" class="card summary-list-wrap">
      <SummaryScrollHead fixed :summary-asset="summaryAsset" :summary-day-profit="summaryDayProfit"/>

      <article v-for="item in accountSummaryCards" :key="item.tagId" class="card summary-item"
               @click="openCategoryTag(item.tagId)">
        <div class="summary-item-top">
          <div class="tag-name">
            <van-icon name="balance-list-o" size="18" color="#3f63d7"/>
            <strong>{{ item.tagName }}</strong>
          </div>
          <div class="compare-metrics">
            <span class="compare-metric up">
              <span class="compare-count">{{ item.upCount }}</span>
              <span class="compare-arrow">↑</span>
            </span>
            <span class="compare-metric down">
              <span class="compare-count">{{ item.downCount }}</span>
              <span class="compare-arrow">↓</span>
            </span>
          </div>
        </div>

        <div class="summary-item-bottom">
          <div class="summary-row summary-row--top">
            <div class="metric-line summary-metric">
              <span>账户资产</span>
              <strong>{{ item.asset.toFixed(2) }}</strong>
            </div>

            <!-- 走势图 -->
            <!-- <div class="mini-trend">
               <svg viewBox="0 0 168 54" preserveAspectRatio="none">
                 <path :d="item.trendPath" stroke="#13a368" stroke-width="2" fill="none"/>
               </svg>
             </div>-->
          </div>

          <div class="summary-row summary-row--bottom">
            <div class="metric-line summary-metric">
              <span>持有收益</span>
              <div class="profit-wrap">
                <strong :class="item.holdingProfit >= 0 ? 'up' : 'down'">{{
                    formatSignedNumber(item.holdingProfit)
                  }}</strong>
                <small :class="['profit-chip', getMetricClass(item.holdingProfitRate)]">
                  {{ formatPercent(item.holdingProfitRate) }}
                </small>
              </div>
            </div>

            <div class="metric-line summary-metric">
              <span>当日收益</span>
              <div class="profit-wrap">
                <strong :class="item.dayProfit >= 0 ? 'up' : 'down'">{{ formatSignedNumber(item.dayProfit) }}</strong>
                <small :class="['profit-chip', getMetricClass(item.dayProfitRate)]">
                  {{ formatPercent(item.dayProfitRate) }}
                </small>
              </div>
            </div>
          </div>
        </div>
      </article>

      <div v-if="accountSummaryCards.length === 0" class="card empty-wrap">
        <van-empty description="暂无分类标签">
          <van-button round color="#f6c428" type="primary" class="import-btn" @click="toTagManage">去添加分类标签
          </van-button>
        </van-empty>
      </div>
    </section>

    <section v-if="!isAccountSummaryTab && displayFunds.length > 0" class="funds-card card">
      <SummaryScrollHead fixed :summary-asset="summaryAsset" :summary-day-profit="summaryDayProfit"/>

      <div v-if="isAllTab" class="funds-overview">
        <span class="title">全部基金</span>
        <span class="stats">
          <span class="stats-item up">
            <span class="stats-count">{{ upCount }}</span>
            <span class="stats-arrow">↑</span>
          </span>
          <span class="stats-item down">
            <span class="stats-count">{{ downCount }}</span>
            <span class="stats-arrow">↓</span>
          </span>
        </span>
      </div>

      <div class="funds-header">
        <span>基金名称</span>
        <span>当日收益</span>
        <span>当日涨幅</span>
        <span>持有收益</span>
      </div>

      <div class="fund-list">
        <article
            v-for="item in displayFunds"
            :key="item.id"
            class="fund-item"
            @click="onFundItemClick(item)"
            @contextmenu.prevent="openFundActions(item)"
            @touchstart.passive="onFundTouchStart(item, $event)"
            @touchend="onFundTouchEnd"
            @touchcancel="onFundTouchEnd"
            @touchmove="onFundTouchEnd"
        >
          <div class="left">
            <strong :title="item.name">{{ truncateFundName(item.name) }}</strong>
            <span>{{ formatHoldingAmount(fundStore.positionByCode[item.code]?.amount) }}</span>
          </div>
          <div class="fund-metric">
            <strong :class="getMetricClass(fundStore.positionByCode[item.code]?.yesterdayProfit)">
              {{ formatMetricAmount(fundStore.positionByCode[item.code]?.yesterdayProfit) }}
            </strong>
            <small :class="getMetricClass(item.dailyChange)">
              {{ formatPercent(item.dailyChange) }}
            </small>
          </div>
          <div class="fund-metric">
            <strong :class="getMetricClass(item.dailyChange)">{{ formatPercent(item.dailyChange) }}</strong>
            <small>{{ formatNav(item.nav) }}</small>
          </div>
          <div class="fund-metric">
            <strong :class="getMetricClass(fundStore.positionByCode[item.code]?.profit)">
              {{ formatMetricAmount(fundStore.positionByCode[item.code]?.profit) }}
            </strong>
            <small :class="getMetricClass(fundStore.positionByCode[item.code]?.profitRate)">
              {{ formatMetricPercent(fundStore.positionByCode[item.code]?.profitRate) }}
            </small>
          </div>
        </article>
      </div>

      <div class="funds-actions">
        <button type="button" class="sync-btn" @click="toSyncHolding">
          <van-icon name="plus" size="18"/>
          <span>同步持仓</span>
        </button>
      </div>
    </section>

    <section v-if="!isAccountSummaryTab && displayFunds.length === 0" class="funds-card card">
      <SummaryScrollHead fixed :summary-asset="summaryAsset" :summary-day-profit="summaryDayProfit"/>

      <div class="empty-wrap empty-wrap-centered">
        <van-empty description="当前标签暂无持仓基金">
          <van-button round color="#f6c428" type="primary" class="import-btn" @click="toImport">同步持仓</van-button>
        </van-empty>
      </div>
    </section>

    <van-popup v-model:show="showFundActionPopup" position="bottom" round class="action-popup">
      <div class="action-popup-title">{{ actionFund?.name }}({{ actionFund?.code }})</div>
      <div class="action-grid">
        <button type="button" class="action-btn" @click="openMoveGroupDialog">
          <van-icon name="share-o" size="22"/>
          <span>移动分组</span>
        </button>
      </div>
    </van-popup>

    <van-popup v-model:show="showMoveGroupDialog" round class="move-dialog">
      <div class="move-dialog-head">
        <strong>移动到如下分组</strong>
      </div>

      <van-radio-group v-model="moveTargetTagId" class="move-dialog-list">
        <div
            v-for="tag in movableHoldingTags"
            :key="tag.id"
            class="move-dialog-item"
            role="button"
            tabindex="0"
            @click="moveTargetTagId = tag.id"
            @keydown.enter.prevent="moveTargetTagId = tag.id"
            @keydown.space.prevent="moveTargetTagId = tag.id"
        >
          <van-radio :name="tag.id" checked-color="#2f5bd8"/>
          <span>{{ tag.name }}</span>
        </div>
      </van-radio-group>

      <button type="button" class="move-dialog-new-btn" @click="openHoldingTagManage">
        + 新建账户
      </button>

      <label class="keep-origin-row">
        <van-checkbox v-model="keepFundInSourceTag" checked-color="#ff9800"/>
        <span>原标签保留该基金</span>
      </label>

      <div class="move-dialog-actions">
        <button type="button" class="dialog-btn" @click="closeMoveGroupDialog">取消</button>
        <button type="button" class="dialog-btn primary" @click="confirmMoveGroup">确定</button>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.holdings-page {
  --layout-header-height: calc(3.125rem + env(safe-area-inset-top));
  --tabbar-space: calc(3.5rem + env(safe-area-inset-bottom));
  padding: 0;
  height: calc(100vh - 3.5rem - env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  touch-action: pan-y;
}

.holdings-top {
  position: fixed;
  left: 0;
  right: 0;
  top: var(--layout-header-height);
  z-index: 18;
  padding: 10px 12px;
  box-sizing: border-box;
  flex-shrink: 0;
}

.summary-list-wrap {
  display: flex;
  flex-direction: column;
  flex: 1;
  margin-top: calc(var(--holdings-top-height, 56px) - 10px);
  padding-bottom: var(--tabbar-space);
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior-x: none;
}

.summary-item {
  padding: 12px;
  cursor: pointer;
  border-bottom: 4px solid var(--line)
}

.summary-item-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--line);
  padding-bottom: 8px;
}

.tag-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tag-name strong {
  font-size: 1rem;
}

.compare-metrics {
  display: flex;
  gap: 12px;
  font-size: 1rem;
  font-weight: 700;
  align-items: center;
}

.compare-metric {
  min-width: 3.25em;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 2px;
  line-height: 1;
}

.compare-count,
.compare-arrow {
  display: inline-flex;
  align-items: center;
}

.compare-arrow {
  margin-left: 5px;
}

.summary-item-bottom {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.summary-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  align-items: stretch;
}

.summary-metric {
  justify-content: center;
}

.metric-line {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-line span,
.summary-metric span {
  color: #7c8398;
  font-size: 0.8125rem;
}

.metric-line strong,
.summary-metric strong {
  font-size: 1rem;
  line-height: 1;
}

.profit-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.profit-wrap small {
  font-size: 0.8125rem;
}

.mini-trend {
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.mini-trend-head {
  height: 22px;
  display: flex;
  align-items: center;
  padding: 0 8px;
  font-size: 0.6875rem;
  color: #7c8398;
  background: #f8f9fc;
}

.mini-trend svg {
  width: 100%;
  height: 54px;
  display: block;
}

.funds-card {
  flex: 1;
  margin-top: calc(var(--holdings-top-height, 56px) - 9px);
  padding-bottom: var(--tabbar-space);
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior-x: none;
}

.funds-overview,
.funds-header {
  display: grid;
  grid-template-columns: 1.6fr 1fr 1fr 1fr;
  gap: 8px;
  align-items: center;
  padding: 0 12px;
}

.funds-overview {
  grid-template-columns: 1fr auto;
  margin-bottom: 12px;
}

.funds-overview .title {
  font-size: 1rem;
  font-weight: 700;
}

.funds-overview .stats {
  display: flex;
  gap: 10px;
  align-items: center;
  color: #545c72;
  font-size: 1.125rem;
}

.funds-overview .stats-item {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  line-height: 1;
}

.stats-arrow {
  margin-left: 2px;
}

.funds-overview .stats-arrow,
.funds-overview .stats-count {
  display: inline-flex;
  align-items: center;
}

.funds-header {
  color: var(--text-sub);
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  min-height: 42px;
  font-size: 0.7rem;
  padding-top: 6px;
  padding-bottom: 6px;
}

.funds-header > span {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  text-align: right;
}

.funds-header > span:first-child {
  justify-content: flex-start;
  text-align: left;
}

.empty-wrap {
  padding: 22px 12px 10px;
}

.empty-wrap-centered {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.import-btn {
  width: 220px;
  margin-top: 12px;
  font-weight: 600;
}

.fund-list {
  padding: 6px 12px 0;
}

.fund-item {
  display: grid;
  grid-template-columns: 1.6fr 1fr 1fr 1fr;
  gap: 8px;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--line);
  cursor: pointer;
}

.fund-item .left,
.fund-item .fund-metric {
  display: flex;
  flex-direction: column;
}

.fund-item .left span,
.fund-item .fund-metric small {
  font-size: 0.7rem;
}

.fund-item .fund-metric {
  align-items: flex-end;
  gap: 4px;
  min-width: 0;
}

.fund-item .left strong {
  font-size: 1rem;
  font-weight: 400;
}

.fund-item .left span {
  color: var(--text-sub);
}

.fund-item .fund-metric strong {
  font-size: 1em;
  line-height: 1.1;
  color: #1f2741;
}

.fund-item .fund-metric small {
  line-height: 1.1;
  color: #7b8298;
}

.fund-item .fund-metric strong.up {
  color: var(--up);
}

.fund-item .fund-metric strong.down {
  color: var(--down);
}

.fund-item .fund-metric strong.flat {
  color: #7b8298;
}

.profit-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: 6px;
  line-height: 1.1;
}

.profit-chip.down {
  color: #11b666;
  background: #e6f7ef;
}

.profit-chip.up {
  color: #fc5456;
  background: #feeded;
}

.profit-chip.flat {
  color: #b9bfcc;
  background: #f6f7f9;
}

.funds-actions {
  border-top: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 10px 12px 0;
  margin-top: 6px;
  font-size: 0.8rem;
}

.sync-btn {
  border: 0;
  background: transparent;
  color: #8a90a5;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  cursor: pointer;
}

.action-popup {
  overflow: hidden;
}

.action-popup-title {
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-bottom: 1px solid var(--line);
  color: #20273f;
  font-size: 1rem;
  font-weight: 700;
  text-align: center;
}

.action-grid {
  padding: 8px 12px calc(10px + env(safe-area-inset-bottom));
}

.action-btn {
  width: 100%;
  min-height: 68px;
  border: 0;
  background: #fff;
  color: #1d2541;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 1rem;
  cursor: pointer;
}

.move-dialog {
  width: min(92vw, 430px);
  overflow: hidden;
}

.move-dialog-head {
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid var(--line);
}

.move-dialog-head strong {
  font-size: 1.125rem;
  font-weight: 700;
  letter-spacing: 1px;
  color: #101a39;
}

.move-dialog-list {
  max-height: min(48vh, 320px);
  overflow-y: auto;
}

.move-dialog-item {
  min-height: 58px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  border-bottom: 1px solid var(--line);
  font-size: 1.125rem;
  color: #111a37;
  cursor: pointer;
}

.move-dialog-new-btn {
  width: 100%;
  min-height: 58px;
  border: 0;
  border-bottom: 1px solid var(--line);
  background: #fff;
  text-align: left;
  padding: 0 16px;
  font-size: 1.0625rem;
  color: #2f5bd8;
  cursor: pointer;
}

.keep-origin-row {
  min-height: 52px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--line);
  font-size: 0.9375rem;
  color: #253054;
}

.move-dialog-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.dialog-btn {
  min-height: 56px;
  border: 0;
  border-right: 1px solid var(--line);
  background: #fff;
  color: #7e8498;
  font-size: 1.125rem;
  cursor: pointer;
}

.dialog-btn:last-child {
  border-right: 0;
}

.dialog-btn.primary {
  color: #2f5bd8;
}
</style>
