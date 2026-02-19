<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { showToast } from 'vant'
import BaseTopNav from '@/components/BaseTopNav.vue'
import FundSnapshotCard from './components/FundSnapshotCard.vue'
import { fetchFundData, type FundDetailResult } from '@/api/fundApi'
import { useFundStore, type TradeRecordItem } from '@/stores/funds'

const route = useRoute()
const fundStore = useFundStore()

const loading = ref(false)
const detail = ref<FundDetailResult | null>(null)
const topTab = ref<'all' | 'pending'>('all')
const actionFilter = ref<'all' | TradeRecordItem['type']>('all')

const code = computed(() => String(route.params.code || '').trim())

const dateText = computed(() => {
  const raw = detail.value?.gztime || ''
  const datePart = raw.split(' ')[0] || ''
  if (!datePart.includes('-')) {
    return '--'
  }
  return datePart.slice(5)
})

const currentNav = computed(() => {
  const gsz = Number(detail.value?.gsz)
  if (Number.isFinite(gsz) && gsz > 0) {
    return gsz
  }
  const dwjz = Number(detail.value?.dwjz)
  if (Number.isFinite(dwjz) && dwjz > 0) {
    return dwjz
  }
  return 0
})

const allRecords = computed(() => fundStore.getTradeRecordsByCode(code.value))

const records = computed(() => {
  const today = new Date()
  const todayText = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return allRecords.value.filter((item) => {
    if (topTab.value === 'pending' && item.confirmDate <= todayText) {
      return false
    }
    if (actionFilter.value !== 'all' && item.type !== actionFilter.value) {
      return false
    }
    return true
  })
})

const typeLabelMap: Record<TradeRecordItem['type'], string> = {
  buy: '加仓',
  sell: '减仓',
  sip: '定投',
  convert: '转换'
}

const typeClassMap: Record<TradeRecordItem['type'], string> = {
  buy: 'buy',
  sell: 'sell',
  sip: 'buy',
  convert: 'sell'
}

const formatRecordAmount = (item: TradeRecordItem) => {
  const value = Number(item.amount)
  if (!Number.isFinite(value)) {
    return '--'
  }
  return `${value.toFixed(2)}${item.unit}`
}

const loadDetail = async () => {
  if (!code.value) {
    detail.value = null
    return
  }

  loading.value = true
  try {
    detail.value = await fetchFundData(code.value)
  } catch (error) {
    console.error(error)
    showToast('基金信息加载失败')
  } finally {
    loading.value = false
  }
}

watch(
  () => code.value,
  () => {
    void loadDetail()
  },
  { immediate: true }
)
</script>

<template>
  <div class="page trade-record-page">
    <BaseTopNav title="交易记录" />

    <section v-if="loading" class="card loading-wrap">
      <van-loading size="28" />
    </section>

    <template v-else-if="detail">
      <FundSnapshotCard
        :name="detail.name"
        :code="detail.code"
        :nav="currentNav"
        :change-percent="detail.gszzl"
        :date-text="dateText"
        plain-nav
      />

      <section class="card list-card">
        <div class="top-tabs">
          <button type="button" :class="['top-tab', { active: topTab === 'all' }]" @click="topTab = 'all'">全部交易</button>
          <button type="button" :class="['top-tab', { active: topTab === 'pending' }]" @click="topTab = 'pending'">进行中</button>
        </div>

        <div class="filter-row">
          <button type="button" :class="['filter-btn', { active: actionFilter === 'all' }]" @click="actionFilter = 'all'">全部</button>
          <button type="button" :class="['filter-btn', { active: actionFilter === 'buy' }]" @click="actionFilter = 'buy'">加仓</button>
          <button type="button" :class="['filter-btn', { active: actionFilter === 'sell' }]" @click="actionFilter = 'sell'">减仓</button>
          <button type="button" :class="['filter-btn', { active: actionFilter === 'sip' }]" @click="actionFilter = 'sip'">定投</button>
          <button type="button" :class="['filter-btn', { active: actionFilter === 'convert' }]" @click="actionFilter = 'convert'">转换</button>
        </div>

        <div v-if="records.length" class="record-list">
          <article v-for="item in records" :key="item.id" class="record-item">
            <div class="line-1">
              <div class="left">
                <span class="type" :class="typeClassMap[item.type]">{{ typeLabelMap[item.type] }}</span>
                <strong>{{ item.fundName }}</strong>
              </div>
              <strong class="amount">{{ formatRecordAmount(item) }}</strong>
            </div>
            <div class="line-2">{{ item.occurredAt }}</div>
          </article>
        </div>

        <van-empty v-else description="暂无交易记录" />
      </section>
    </template>
  </div>
</template>

<style scoped>
.trade-record-page {
  padding-bottom: 20px;
}

.loading-wrap {
  min-height: 160px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.list-card {
  margin-top: 10px;
  padding: 10px 12px;
}

.top-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-bottom: 1px solid var(--line);
  margin-bottom: 10px;
}

.top-tab {
  border: 0;
  background: transparent;
  min-height: 40px;
  color: #3a4260;
  font-size: 1rem;
  border-bottom: 2px solid transparent;
}

.top-tab.active {
  color: #14264f;
  border-bottom-color: #3d62db;
  font-weight: 600;
}

.filter-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-btn {
  border: 0;
  background: #fff;
  border-radius: 999px;
  padding: 6px 12px;
  color: #1e2e56;
  font-size: 1.0625rem;
}

.filter-btn.active {
  background: #eef2ff;
  color: #3d62db;
}

.record-list {
  margin-top: 8px;
}

.record-item {
  border-bottom: 1px solid #edf0f5;
  padding: 12px 0;
}

.record-item:last-child {
  border-bottom: 0;
}

.line-1 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.left {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.type {
  font-size: 1rem;
  margin-right: 10px;
}

.type.buy {
  color: #e34a4a;
}

.type.sell {
  color: #22a06b;
}

.left strong {
  font-size: 0.9rem;
  color: #0f2148;
  line-height: 1.2;
}

.amount {
  font-size: 1rem;
  color: #0f2148;
  line-height: 1.1;
  font-weight: 500;
}

.line-2 {
  margin-top: 6px;
  color: #8d94a8;
  font-size: 0.8rem;
}
</style>
