<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useFundStore } from '@/stores/funds'
import { formatPercent, formatSignedNumber } from '@/utils/format'
import {
  fetchMarketIndicesFast,
  fetchMarketOverview,
  fetchSectorFunds,
  type FundDistribution,
  type MarketIndexSimple,
  type MarketOverview,
  type SectorInfo
} from '@/api/marketApi'

const router = useRouter()
const fundStore = useFundStore()

const indicesLoading = ref(true)
const overviewLoading = ref(true)
const sectorsLoading = ref(true)

const indices = ref<MarketIndexSimple[]>([])
const overview = ref<MarketOverview | null>(null)
const sectors = ref<SectorInfo[]>([])

const maxDistribution = computed(() => {
  // 计算分布柱图的最大值，驱动柱高比例。
  if (!overview.value?.distribution.length) {
    return 1
  }
  return Math.max(...overview.value.distribution.map((item) => item.count), 1)
})

const distribution = computed(() => {
  // 读取分布数组，空态时返回空列表。
  return overview.value?.distribution || []
})

const totalPkCount = computed(() => {
  // 计算 PK 总数并兜底为 1，避免除零。
  if (!overview.value) {
    return 1
  }
  return Math.max(overview.value.totalDown + overview.value.totalFlat + overview.value.totalUp, 1)
})

const downPercent = computed(() => {
  // 计算下跌区间占比。
  if (!overview.value) {
    return 0
  }
  return (overview.value.totalDown / totalPkCount.value) * 100
})

const flatPercent = computed(() => {
  // 计算平盘区间占比。
  if (!overview.value) {
    return 0
  }
  return (overview.value.totalFlat / totalPkCount.value) * 100
})

const upPercent = computed(() => {
  // 计算上涨区间占比。
  if (!overview.value) {
    return 0
  }
  return (overview.value.totalUp / totalPkCount.value) * 100
})

const distributionClass = (item: FundDistribution) => {
  // 根据区间为柱图分配红绿灰颜色。
  if (item.range === '0') {
    return 'neutral'
  }
  if (item.range.startsWith('≤') || item.range.includes('-')) {
    return 'down'
  }
  return 'up'
}

const getBarHeight = (item: FundDistribution) => {
  // 将基金数量映射到柱图高度，保证可视区域最小高度可见。
  const ratio = item.count / maxDistribution.value
  return `${Math.max(4, Math.round(ratio * 96))}px`
}

const toSector = (name: string) => {
  // 点击板块行进入板块详情页。
  router.push(`/sector/${encodeURIComponent(name)}`)
}

const loadIndices = async () => {
  // 拉取顶部指数列表。
  indicesLoading.value = true
  try {
    indices.value = await fetchMarketIndicesFast()
  } catch (error) {
    console.error(error)
    indices.value = []
  } finally {
    indicesLoading.value = false
  }
}

const loadOverview = async () => {
  // 拉取涨跌分布与 PK 数据。
  overviewLoading.value = true
  try {
    overview.value = await fetchMarketOverview()
  } catch (error) {
    console.error(error)
    overview.value = null
  } finally {
    overviewLoading.value = false
  }
}

const loadSectors = async () => {
  // 拉取板块涨跌列表，失败时回退本地 store 数据。
  sectorsLoading.value = true
  try {
    const remote = await fetchSectorFunds()
    if (remote.length) {
      sectors.value = remote
      return
    }

    sectors.value = fundStore.marketSectors.map((item) => ({
      code: String(item.id),
      name: item.name,
      dayReturn: item.trend,
      count: item.count,
      streak: item.trend >= 0 ? '连涨2天' : '连跌1天'
    }))
  } catch (error) {
    console.error(error)
    sectors.value = []
  } finally {
    sectorsLoading.value = false
  }
}

const loadMarket = async () => {
  // 并行拉取行情页面需要的三类数据。
  await Promise.all([loadIndices(), loadOverview(), loadSectors()])
}

onMounted(() => {
  // 页面挂载后初始化行情数据。
  void loadMarket()
})
</script>

<template>
  <div class="page market-page">
    <section class="card indices-card">
      <div v-if="indicesLoading" class="loading-wrap">
        <van-loading size="22" />
      </div>

      <div v-else class="indices-scroll">
        <article
          v-for="item in indices"
          :key="item.code"
          class="index-item"
          :class="item.changePercent >= 0 ? 'up' : 'down'"
        >
          <div class="index-name">{{ item.name }}</div>
          <strong class="index-current">{{ item.current.toFixed(2) }}</strong>
          <div class="index-change">
            <span>{{ formatSignedNumber(item.change) }}</span>
            <span>{{ formatPercent(item.changePercent) }}</span>
          </div>
        </article>
      </div>
    </section>

    <section class="card dist-card">
      <header class="dist-head">
        <strong>基金涨跌分布</strong>
        <span v-if="overview">更新：{{ overview.updateTime }}</span>
      </header>

      <div v-if="overviewLoading" class="loading-wrap">
        <van-loading size="22" />
      </div>

      <template v-else-if="overview">
        <div class="bars-wrap">
          <div v-for="item in distribution" :key="item.range" class="bar-item">
            <span class="count">{{ item.count }}</span>
            <i class="bar" :class="distributionClass(item)" :style="{ height: getBarHeight(item) }"></i>
            <span class="label">{{ item.range }}</span>
          </div>
        </div>

        <div class="pk-wrap">
          <div class="pk-side left">
            <span>下跌</span>
            <strong>{{ overview.totalDown }}</strong>
          </div>

          <div class="pk-track">
            <div class="pk-seg down" :style="{ width: `${downPercent}%` }"></div>
            <div class="pk-seg flat" :style="{ width: `${flatPercent}%` }"></div>
            <div class="pk-seg up" :style="{ width: `${upPercent}%` }"></div>
          </div>

          <div class="pk-side right">
            <strong>{{ overview.totalUp }}</strong>
            <span>上涨</span>
          </div>
        </div>
      </template>
    </section>

    <section class="card sector-card">
      <header class="sector-head">
        <strong>板块总览</strong>
        <van-icon name="arrow" size="18" color="#9ca2b8" />
      </header>

      <div v-if="sectorsLoading" class="loading-wrap">
        <van-loading size="22" />
      </div>

      <div v-else>
        <article v-for="item in sectors" :key="item.code" class="sector-item" @click="toSector(item.name)">
          <div class="left">
            <strong>{{ item.name }}</strong>
            <span>{{ item.count }}只基金</span>
          </div>

          <div class="middle" :class="item.dayReturn >= 0 ? 'up' : 'down'">{{ item.streak }}</div>

          <div class="right" :class="item.dayReturn >= 0 ? 'up' : 'down'">{{ formatPercent(item.dayReturn) }}</div>
        </article>

        <van-empty v-if="sectors.length === 0" description="暂无板块数据" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.market-page {
  padding: 0;
  overflow-x: hidden;
  touch-action: pan-y;
}

.indices-card,
.dist-card,
.sector-card {
  margin: 0 12px;
}

.dist-card,
.sector-card {
  margin-top: 10px;
}

.indices-card {
  padding: 10px;
}

.indices-scroll {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  scrollbar-width: none;
}

.indices-scroll::-webkit-scrollbar {
  display: none;
}

.index-item {
  min-width: 168px;
  background: #eef8f3;
  border-radius: 10px;
  padding: 10px;
}

.index-item.up {
  background: #fef3f4;
}

.index-item.down {
  background: #eef8f3;
}

.index-name {
  font-size: 1rem;
  color: #40495f;
}

.index-current {
  display: block;
  margin-top: 4px;
  font-size: 1.625rem;
  line-height: 1;
}

.index-change {
  margin-top: 6px;
  display: flex;
  gap: 10px;
  font-size: 1rem;
  font-weight: 600;
}

.index-item.up .index-current,
.index-item.up .index-change {
  color: #e34a4a;
}

.index-item.down .index-current,
.index-item.down .index-change {
  color: #13a368;
}

.dist-card {
  padding: 12px 10px;
}

.dist-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dist-head strong {
  font-size: 1.5rem;
}

.dist-head span {
  color: #9096ab;
  font-size: 0.875rem;
}

.bars-wrap {
  margin-top: 8px;
  display: grid;
  grid-template-columns: repeat(9, minmax(0, 1fr));
  gap: 3px;
  align-items: end;
  min-height: 146px;
}

.bar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.count {
  font-size: 0.8125rem;
  color: #667089;
  min-height: 18px;
}

.bar {
  width: 26px;
  border-radius: 4px 4px 0 0;
  min-height: 4px;
}

.bar.down {
  background: #12a761;
}

.bar.up {
  background: #f05158;
}

.bar.neutral {
  background: #bcc3d6;
}

.label {
  margin-top: 4px;
  font-size: 0.75rem;
  color: #70778e;
}

.pk-wrap {
  margin-top: 14px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: center;
}

.pk-side {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.9375rem;
  color: #4d566f;
}

.pk-side.left strong {
  color: #12a761;
}

.pk-side.right strong {
  color: #f05158;
}

.pk-track {
  height: 14px;
  border-radius: 999px;
  overflow: hidden;
  display: flex;
  background: #eef1f8;
}

.pk-seg.down {
  background: #12a761;
}

.pk-seg.flat {
  background: #c9cfde;
}

.pk-seg.up {
  background: #f05158;
}

.sector-card {
  padding: 0 10px;
}

.sector-head {
  min-height: 52px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--line);
}

.sector-head strong {
  font-size: 2.125rem;
}

.sector-item {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 12px;
  align-items: center;
  min-height: 72px;
  border-bottom: 1px solid var(--line);
  cursor: pointer;
}

.sector-item:last-child {
  border-bottom: 0;
}

.left {
  display: flex;
  flex-direction: column;
}

.left strong {
  font-size: 1.25rem;
}

.left span {
  font-size: 0.875rem;
  color: #8a91a7;
  margin-top: 2px;
}

.middle,
.right {
  font-size: 1rem;
  font-weight: 600;
}

.loading-wrap {
  min-height: 92px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.up {
  color: #e34a4a;
}

.down {
  color: #13a368;
}

.market-page :deep(*) {
  border-radius: 0 !important;
}
</style>


