<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseTopNav from '../components/BaseTopNav.vue'
import TrendChart from '../components/TrendChart.vue'
import { useFundStore } from '../stores/funds'

const route = useRoute()
const router = useRouter()
const fundStore = useFundStore()

const activeTab = ref<'intraday' | 'history'>('intraday')

const sectorName = computed(() => {
  // 从路由参数解析板块名称。
  return decodeURIComponent(String(route.params.name || '未知板块'))
})

const sector = computed(() => {
  // 读取板块基础数据，若缺失则回退默认结构。
  return (
    fundStore.getSectorByName(sectorName.value) || {
      name: sectorName.value,
      trend: 0,
      count: 0,
      funds: []
    }
  )
})

const formatRate = (value: number) => {
  // 板块和基金涨跌幅统一格式化。
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

const mockTrend = (base: number, size: number) => {
  // 使用板块涨跌幅构造示意折线，保证页面可视化结构完整。
  const points: Array<{ x: number; y: number }> = []
  const start = Date.now() - size * 60_000
  let value = base

  for (let i = 0; i < size; i += 1) {
    value += (Math.random() - 0.5) * 0.4
    points.push({ x: start + i * 60_000, y: value })
  }

  return points
}

const intradayPoints = computed(() => {
  // 分时图数据。
  return mockTrend(sector.value.trend, 80)
})

const historyPoints = computed(() => {
  // 历史走势数据。
  return mockTrend(sector.value.trend * 0.8, 120)
})

const toFundDetail = (code: string) => {
  // 点击板块基金项进入基金详情。
  router.push(`/fund/${code}`)
}
</script>

<template>
  <div class="page sector-page">
    <BaseTopNav :title="sectorName" />

    <section class="card panel-card">
      <div class="tab-switch">
        <button
          type="button"
          class="switch-item"
          :class="{ active: activeTab === 'intraday' }"
          @click="activeTab = 'intraday'"
        >
          分时图
        </button>
        <button
          type="button"
          class="switch-item"
          :class="{ active: activeTab === 'history' }"
          @click="activeTab = 'history'"
        >
          历史走势
        </button>
      </div>

      <div class="sector-meta">
        <span>02-13</span>
        <strong>{{ sector.name }}板块 {{ formatRate(sector.trend) }}</strong>
      </div>

      <TrendChart :points="activeTab === 'intraday' ? intradayPoints : historyPoints" color="#e25b6f" />
    </section>

    <section class="card fund-list-card">
      <header class="list-head">
        <h3>板块基金</h3>
        <span>去对比</span>
      </header>

      <div class="title-row">
        <span>已去重({{ sector.count }}只)</span>
        <span>当日涨幅</span>
        <span>近一月涨幅</span>
      </div>

      <article v-for="item in sector.funds" :key="item.code" class="fund-item" @click="toFundDetail(item.code)">
        <div class="left">
          <strong>{{ item.name }}</strong>
          <span>{{ item.code }}</span>
        </div>
        <div class="right">
          <strong :class="item.dailyChange >= 0 ? 'up' : 'down'">{{ formatRate(item.dailyChange) }}</strong>
          <strong :class="item.monthChange >= 0 ? 'up' : 'down'">{{ formatRate(item.monthChange) }}</strong>
        </div>
      </article>

      <van-empty v-if="sector.funds.length === 0" description="暂无板块基金数据" />
    </section>
  </div>
</template>

<style scoped>
.sector-page {
  padding-top: 0;
}

.panel-card {
  padding: 10px 12px;
}

.tab-switch {
  display: flex;
  gap: 20px;
}

.switch-item {
  border: 0;
  background: transparent;
  font-size: 1.875rem;
  color: #7a8298;
  font-weight: 600;
  padding: 0;
  cursor: pointer;
}

.switch-item.active {
  color: #1a2744;
}

.sector-meta {
  margin: 8px 0;
  display: flex;
  gap: 10px;
  align-items: center;
}

.sector-meta span {
  color: #7a8298;
  font-size: 0.8125rem;
}

.sector-meta strong {
  font-size: 1rem;
  font-weight: 600;
}

.fund-list-card {
  margin-top: 10px;
  padding: 0 12px 10px;
}

.list-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
}

.list-head h3 {
  margin: 0;
  font-size: 2.125rem;
}

.list-head span {
  color: #6b84c7;
  font-size: 1rem;
}

.title-row {
  display: grid;
  grid-template-columns: 1fr 80px 86px;
  font-size: 0.8125rem;
  color: #81889d;
  border-bottom: 1px solid var(--line);
  padding-bottom: 8px;
}

.title-row span:nth-child(2),
.title-row span:nth-child(3) {
  text-align: right;
}

.fund-item {
  display: grid;
  grid-template-columns: 1fr 166px;
  align-items: center;
  min-height: 58px;
  border-bottom: 1px solid var(--line);
  cursor: pointer;
}

.left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.left strong {
  font-size: 1rem;
}

.left span {
  color: #7f8699;
  font-size: 0.8125rem;
}

.right {
  display: grid;
  grid-template-columns: 80px 86px;
}

.right strong {
  text-align: right;
  font-size: 1rem;
}
</style>

