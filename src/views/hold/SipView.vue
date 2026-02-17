<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import BaseTopNav from '@/components/BaseTopNav.vue'
import FundSnapshotCard from './components/FundSnapshotCard.vue'
import { fetchFundData, type FundDetailResult } from '@/api/fundApi'
import { useFundStore } from '@/stores/funds'

const route = useRoute()
const router = useRouter()
const fundStore = useFundStore()

const loading = ref(false)
const detail = ref<FundDetailResult | null>(null)

const code = computed(() => String(route.params.code || '').trim())

const position = computed(() => {
  // 读取当前基金持仓信息，缺失时回退默认值。
  return (
    fundStore.positionByCode[code.value] || {
      amount: '0.00',
      ratio: '--',
      cost: '--',
      profit: '0.00',
      profitRate: '--',
      holdingDays: '0',
      yesterdayProfit: '0.00',
      yesterdayProfitRate: '--'
    }
  )
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
    // 基金代码变化时重新拉取详情数据。
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
        :nav="detail.gsz"
        :change-percent="detail.gszzl"
        :date-text="dateText"
        :position="position"
        show-position
      />

      <section class="card empty-plan-card">
        <span>暂无定投计划</span>
      </section>

      <section class="bottom-wrap">
        <van-button block round type="primary" color="#4b6bde" @click="openPlanSetting">添加定投计划</van-button>
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
}
</style>


