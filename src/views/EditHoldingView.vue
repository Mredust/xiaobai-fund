<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import BaseTopNav from '../components/BaseTopNav.vue'
import FundSnapshotCard from '../components/FundSnapshotCard.vue'
import { fetchFundData, type FundDetailResult } from '../api/fundApi'
import { useFundStore } from '../stores/funds'

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
  // 加载基金基础信息，供页面头部展示。
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

const openBuy = () => {
  // 跳转同步加仓页。
  router.push(`/fund/${code.value}/sync-buy`)
}

const openSell = () => {
  // 跳转同步减仓页。
  router.push(`/fund/${code.value}/sync-sell`)
}

const openSip = () => {
  // 跳转同步定投页。
  router.push(`/fund/${code.value}/sip`)
}

const openConvert = () => {
  // 跳转同步转换页。
  router.push(`/fund/${code.value}/convert`)
}

const removeHolding = async () => {
  // 点击移除后删除当前基金的持有记录。
  try {
    await showConfirmDialog({
      title: '提示',
      message: '确认移除该基金持仓？',
      confirmButtonText: '移除',
      cancelButtonText: '取消'
    })

    const removed = fundStore.removeHoldingFund(code.value)
    if (!removed) {
      showToast('当前基金不在持有列表')
      return
    }

    showToast('已移除')
    router.back()
  } catch {}
}

watch(
  () => code.value,
  () => {
    // 基金代码变化时重新加载页面数据。
    void loadDetail()
  },
  { immediate: true }
)
</script>

<template>
  <div class="page edit-holding-page">
    <BaseTopNav title="修改持仓" />

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

      <section class="card actions-card">
        <button type="button" class="sync-btn buy" @click="openBuy">同步加仓</button>
        <button type="button" class="sync-btn sell" @click="openSell">同步减仓</button>
        <button type="button" class="sync-btn" @click="openSip">同步定投</button>
        <button type="button" class="sync-btn" @click="openConvert">同步转换</button>
      </section>

      <section class="remove-wrap">
        <van-button block round plain type="danger" @click="removeHolding">移除</van-button>
      </section>
    </template>
  </div>
</template>

<style scoped>
.edit-holding-page {
  padding-bottom: 22px;
}

.loading-wrap {
  min-height: 160px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.actions-card {
  margin-top: 10px;
  padding: 12px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.sync-btn {
  border: 1px solid #e7eaf3;
  background: #fff;
  border-radius: 12px;
  min-height: 74px;
  font-size: 1.625rem;
  color: #3b61d5;
  cursor: pointer;
}

.sync-btn.buy {
  color: #e05b5b;
}

.sync-btn.sell {
  color: #20a162;
}

.remove-wrap {
  margin-top: 12px;
}
</style>

