<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {useRouter} from 'vue-router'
import TagStrip from '@/components/TagStrip.vue'
import {buildMiniTrendPath} from '@/utils/chart'
import {formatPercent, formatSignedNumber} from '@/utils/format'
import {toSafeNumber} from '@/utils/number'
import {useTagStore} from '@/stores/tags'
import {useFundStore} from '@/stores/funds'

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

const tags = computed(() => tagStore.holdingTags)
const activeTagId = computed(() => tagStore.activeHoldingTagId)

const isAccountSummaryTab = computed(() => {
  // 使用标签名称判断是否为“账户汇总”模式，避免依赖固定 id。
  const activeTag = tags.value.find((item) => item.id === activeTagId.value)
  return activeTag?.name === '账户汇总'
})

const isAllTab = computed(() => {
  // 使用标签名称判断是否为“全部”模式，避免依赖固定 id。
  const activeTag = tags.value.find((item) => item.id === activeTagId.value)
  return activeTag?.name === '全部'
})

const summaryTagList = computed(() => {
  // 分类汇总卡片排除“账户汇总”和“全部”标签。
  return tags.value.filter((item) => item.name !== '账户汇总' && item.name !== '全部')
})

const displayFunds = computed(() => {
  // “账户汇总/全部”聚合其他所有标签，其余标签仅展示自身基金。
  if (isAccountSummaryTab.value || isAllTab.value) {
    return summaryTagList.value.flatMap((tag) => fundStore.getHoldingFundsByTag(tag.id))
  }
  return fundStore.getHoldingFundsByTag(activeTagId.value)
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

const setActiveTag = (id: number) => {
  // 首页标签切换。
  tagStore.setHoldingActive(id)
}

const toTagManage = () => {
  // 点击加号进入持有标签管理页。
  router.push('/tag-manage?scene=holdings')
}

const toImport = () => {
  // 空状态按钮跳转到导入持仓页。
  router.push('/import-holdings')
}

const toSyncHolding = () => {
  // 列表底部“同步持仓”入口，复用导入持仓流程。
  router.push('/import-holdings')
}

const toFundDetail = (code: string) => {
  // 点击基金行进入基金详情页。
  router.push(`/fund/${code}`)
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

onMounted(() => {
  void nextTick(syncHoldingsTopHeight)
  window.addEventListener('resize', syncHoldingsTopHeight)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncHoldingsTopHeight)
})

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

    <section v-if="isAccountSummaryTab" class="summary-list-wrap">
      <div class="summary-scroll-head">
        <div class="summary-box">
          <div class="summary-col">
            <span class="summary-label">账户资产</span>
            <strong class="summary-value">{{ summaryAsset.toFixed(2) }}</strong>
          </div>
          <div class="summary-col right">
            <span class="summary-label">当日总收益</span>
            <strong class="summary-value"
                    :class="summaryDayProfit >= 0 ? 'up' : 'down'">{{ formatSignedNumber(summaryDayProfit) }}</strong>
          </div>
        </div>
      </div>

      <article v-for="item in accountSummaryCards" :key="item.tagId" class="card summary-item"
               @click="openCategoryTag(item.tagId)">
        <div class="summary-item-top">
          <div class="tag-name">
            <van-icon name="balance-list-o" size="18" color="#3f63d7"/>
            <strong>{{ item.tagName }}</strong>
          </div>
          <div class="compare-metrics">
            <span class="up">{{ item.upCount }}↑</span>
            <span class="down">{{ item.downCount }}↓</span>
          </div>
        </div>

        <div class="summary-item-bottom">
          <div class="bottom-left">
            <div class="metric-line">
              <span>账户资产</span>
              <strong>{{ item.asset.toFixed(2) }}</strong>
            </div>
            <div class="metric-line">
              <span>持有收益</span>
              <div class="profit-wrap">
                <strong :class="item.holdingProfit >= 0 ? 'up' : 'down'">{{
                    formatSignedNumber(item.holdingProfit)
                  }}</strong>
                <small>{{ formatPercent(item.holdingProfitRate) }}</small>
              </div>
            </div>
          </div>

          <div class="bottom-right">
            <div class="mini-trend">
              <svg viewBox="0 0 168 54" preserveAspectRatio="none">
                <path :d="item.trendPath" stroke="#13a368" stroke-width="2" fill="none"/>
              </svg>
            </div>
            <div class="day-wrap">
              <span>当日收益</span>
              <div class="profit-wrap">
                <strong :class="item.dayProfit >= 0 ? 'up' : 'down'">{{ formatSignedNumber(item.dayProfit) }}</strong>
                <small>{{ formatPercent(item.dayProfitRate) }}</small>
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

    <section v-if="!isAccountSummaryTab" class="funds-card card">
      <div class="summary-scroll-head">
        <div class="summary-box">
          <div class="summary-col">
            <span class="summary-label">账户资产</span>
            <strong class="summary-value">{{ summaryAsset.toFixed(2) }}</strong>
          </div>
          <div class="summary-col right">
            <span class="summary-label">当日总收益</span>
            <strong class="summary-value"
                    :class="summaryDayProfit >= 0 ? 'up' : 'down'">{{ formatSignedNumber(summaryDayProfit) }}</strong>
          </div>
        </div>
      </div>

      <div v-if="isAllTab" class="funds-overview">
        <span class="title">全部基金</span>
        <span class="stats">
          <span class="up">↑{{ upCount }}</span>
          <span class="down">↓{{ downCount }}</span>
        </span>
      </div>

      <div class="funds-header">
        <span>基金名称</span>
        <span>当日收益</span>
        <span>当日涨幅</span>
        <span>持有收益</span>
      </div>

      <div v-if="displayFunds.length === 0" class="empty-wrap">
        <van-empty description="暂无持仓基金">
          <van-button round color="#f6c428" type="primary" class="import-btn" @click="toImport">导入持仓看收益
          </van-button>
        </van-empty>
      </div>

      <div v-else class="fund-list">
        <article v-for="item in displayFunds" :key="item.id" class="fund-item" @click="toFundDetail(item.code)">
          <div class="left">
            <strong>{{ item.name }}</strong>
            <span>{{ item.code }}</span>
          </div>
          <div class="right">
            <span :class="item.dailyChange >= 0 ? 'up' : 'down'">{{ item.dailyChange.toFixed(2) }}%</span>
            <span>{{ fundStore.positionByCode[item.code]?.profit || '--' }}</span>
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
  background-color: #ffe389;
  padding: 10px 12px;
  box-sizing: border-box;
  flex-shrink: 0;
}

.summary-scroll-head {
  background: linear-gradient(180deg, #ffe389 0%, #f8dd6f 45%, #f7f2d8 100%);
  padding: 0 12px;
}

.summary-box {
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-radius: 10px 10px 0 0;
  background: rgb(255 255 255 / 55%);
}

.summary-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.summary-col.right {
  align-items: flex-end;
}

.summary-label {
  font-size: 0.8rem;
  color: #6f6280;
  opacity: 0.7;
  margin-bottom: 5px;
}

.summary-value {
  font-size: 1.5rem;
  line-height: 1;
  font-weight: 4;
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

.compare-metrics > span {
  min-width: 3.25em;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  line-height: 1;
}

.summary-item-bottom {
  margin-top: 10px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.bottom-left,
.bottom-right {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.metric-line {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-line span,
.day-wrap span {
  color: #7c8398;
  font-size: 0.8125rem;
}

.metric-line strong,
.day-wrap strong {
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
  color: #6f7790;
  background: #ecf6ef;
  padding: 2px 6px;
  border-radius: 6px;
}

.mini-trend {
  border: 1px solid var(--line);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.mini-trend svg {
  width: 100%;
  height: 62px;
  display: block;
}

.day-wrap {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 12px;
}

.funds-overview {
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

.funds-header {
  color: var(--text-sub);
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  height: 42px;
  font-size: 0.7rem;
}

.funds-header > span {
  flex: 1;
  text-align: right;
}

.funds-header > span:first-child {
  text-align: left;
}

.empty-wrap {
  padding: 22px 12px 10px;
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
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--line);
  cursor: pointer;
}

.fund-item .left,
.fund-item .right {
  display: flex;
  flex-direction: column;
}

.fund-item .left span,
.fund-item .right span {
  font-size: 0.7rem;
}

.fund-item .right {
  align-items: flex-end;
}

.fund-item strong {
  font-size: 0.8rem;
}

.fund-item span {
  color: var(--text-sub);
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
</style>




