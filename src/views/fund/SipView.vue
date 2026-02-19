<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import BaseTopNav from '@/components/BaseTopNav.vue'
import FundSnapshotCard from './components/FundSnapshotCard.vue'
import { fetchFundData, type FundDetailResult } from '@/api/fundApi'
import { useFundStore } from '@/stores/funds'
import { parseYmdDate } from '@/utils/trade'

const route = useRoute()
const router = useRouter()
const fundStore = useFundStore()

const loading = ref(false)
const detail = ref<FundDetailResult | null>(null)

const code = computed(() => String(route.params.code || '').trim())

const plans = computed(() => fundStore.getSipPlansByCode(code.value))

const totalInvested = computed(() => {
  return plans.value.reduce((sum, item) => sum + Number(item.investedTotal || 0), 0)
})

const totalCount = computed(() => {
  return plans.value.reduce((sum, item) => sum + Number(item.investedCount || 0), 0)
})

const dateText = computed(() => {
  // 从估值时间中提取月-日文本。
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

const formatWeekText = (value: string) => {
  const date = parseYmdDate(value)
  if (!date) {
    return value
  }
  const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()] || '周一'
  return `${value}(${week})`
}

const loadDetail = async () => {
  // 请求基金详情，供定投页面展示。
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

const openPlanSetting = () => {
  // 跳转定投计划设置页。
  router.push(`/fund/${code.value}/sip-plan`)
}

watch(
  () => code.value,
  () => {
    // 每次进入页面都触发一次自动定投处理。
    fundStore.runDueSipPlans()
    void loadDetail()
  },
  { immediate: true }
)
</script>

<template>
  <div class="page sip-page">
    <BaseTopNav title="定投" />

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

      <section v-if="plans.length" class="card plan-card">
        <div class="plan-head">
          <div class="left">
            <van-icon name="todo-list-o" size="18" />
            <strong>定投计划</strong>
          </div>
          <span class="running">进行中</span>
        </div>

        <div class="plan-stats">
          <div class="stat-item">
            <small>累计定投(元)</small>
            <strong>{{ totalInvested.toFixed(2) }}</strong>
          </div>
          <div class="stat-item right">
            <small>已投期数</small>
            <strong>{{ totalCount }}</strong>
          </div>
        </div>

        <div class="plan-list">
          <div v-for="item in plans" :key="item.id" class="plan-row">
            <p>{{ item.cycleText }}定投{{ Number(item.amount).toFixed(2) }}元</p>
            <p class="next-time">下次投入时间：{{ formatWeekText(item.nextRunDate) }}</p>
          </div>
        </div>
      </section>

      <section v-else class="card empty-plan-card">
        <span>暂无定投计划</span>
      </section>

      <section class="bottom-wrap">
        <button type="button" class="add-plan-btn" @click="openPlanSetting">+ 添加定投计划</button>
      </section>
    </template>
  </div>
</template>

<style scoped>
.sip-page {
  padding-bottom: 20px;
}

.loading-wrap {
  min-height: 160px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.plan-card {
  margin-top: 10px;
  padding: 12px;
}

.plan-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.plan-head .left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.plan-head strong {
  font-size: 1rem;
  color: #0f2148;
}

.running {
  color: #3d62db;
  font-weight: 600;
}

.plan-stats {
  margin-top: 10px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  border-bottom: 1px solid var(--line);
  padding-bottom: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-item.right {
  align-items: flex-end;
}

.stat-item small {
  color: #8c93a8;
}

.stat-item strong {
  font-size: 1.5rem;
  color: #0f2148;
  line-height: 1.2;
}

.plan-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.plan-row {
  border-bottom: 1px solid #eef1f6;
  padding-bottom: 8px;
}

.plan-row:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.plan-row p {
  margin: 0;
  color: #18305d;
  font-size: 1rem;
}

.plan-row .next-time {
  margin-top: 4px;
  color: #9aa0b3;
  font-size: 0.9375rem;
}

.empty-plan-card {
  margin-top: 10px;
  min-height: 180px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #c6cad6;
  font-size: 1.375rem;
}

.bottom-wrap {
  margin-top: 12px;
  display: flex;
  justify-content: center;
}

.add-plan-btn {
  width: 66%;
  height: 38px;
  border: 0;
  border-radius: 4px;
  background: #4b6bde;
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
}
</style>
