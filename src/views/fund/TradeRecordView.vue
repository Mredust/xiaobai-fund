<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { showToast } from 'vant'
import BaseTopNav from '@/components/BaseTopNav.vue'
import FundSnapshotCard from './components/FundSnapshotCard.vue'
import { fetchFundData, type FundDetailResult } from '@/api/fundApi'
import { useFundStore } from '@/stores/funds'

const route = useRoute()
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
  // 加载基金详情，渲染交易记录头部。
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
    // 基金代码变化时重新拉取详情。
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
        :nav="detail.gsz"
        :change-percent="detail.gszzl"
        :date-text="dateText"
        :position="position"
        show-position
      />

      <section class="card empty-card">
        <van-empty description="暂无交易记录" />
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

.empty-card {
  margin-top: 10px;
}
</style>

