<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import BaseTopNav from '@/components/BaseTopNav.vue'
import FundSnapshotCard from './components/FundSnapshotCard.vue'
import { fetchFundData, type FundDetailResult } from '@/api/fundApi'
import { useFundStore } from '@/stores/funds'
import { useTagStore } from '@/stores/tags'
import {
  formatMonthDayWeekLabel,
  formatYmdDate,
  parseYmdDate,
  resolveBuyTiming,
  resolveSellTiming,
  type TradeTimeSlot
} from '@/utils/trade'

const route = useRoute()
const router = useRouter()
const fundStore = useFundStore()
const tagStore = useTagStore()

const loading = ref(false)
const detail = ref<FundDetailResult | null>(null)
const amount = ref('')
const showTimePicker = ref(false)
const pickedDate = ref('')
const pickedTimeSlot = ref<TradeTimeSlot>('after-close')

const code = computed(() => String(route.params.code || '').trim())

const mode = computed<'buy' | 'sell'>(() => {
  // 通过路由名称判断当前是加仓还是减仓页。
  return route.name === 'fund-sync-sell' ? 'sell' : 'buy'
})

const position = computed(() => {
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

const pageTitle = computed(() => {
  return mode.value === 'buy' ? '加仓' : '减仓'
})

const amountLabel = computed(() => {
  return mode.value === 'buy' ? '加仓金额' : '卖出份额'
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

const dayRate = computed(() => Number(detail.value?.gszzl || 0))

const maxSellShare = computed(() => {
  if (mode.value !== 'sell' || currentNav.value <= 0) {
    return 0
  }
  const amountValue = Number(position.value.amount)
  if (!Number.isFinite(amountValue) || amountValue <= 0) {
    return 0
  }
  return amountValue / currentNav.value
})

const maxSellShareText = computed(() => {
  if (maxSellShare.value <= 0) {
    return '--'
  }
  return maxSellShare.value.toFixed(2)
})

const amountPlaceholder = computed(() => {
  if (mode.value === 'buy') {
    return '输入加仓金额'
  }
  return maxSellShare.value > 0 ? `最多可卖出${maxSellShareText.value}份` : '输入卖出份额'
})

const timeLabel = computed(() => {
  return mode.value === 'buy' ? '加仓时间' : '卖出时间'
})

const dateText = computed(() => {
  const raw = detail.value?.gztime || ''
  const datePart = raw.split(' ')[0] || ''
  if (!datePart.includes('-')) {
    return '--'
  }
  return datePart.slice(5)
})

const dateOptions = computed(() => {
  // 可选范围：今天 - 30 天 到 今天。
  return Array.from({ length: 31 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (30 - index))
    return {
      text: formatMonthDayWeekLabel(date),
      value: formatYmdDate(date)
    }
  })
})

const timeSlotOptions = [
  { text: '下午3点前', value: 'before-close' as TradeTimeSlot },
  { text: '下午3点后', value: 'after-close' as TradeTimeSlot }
]

const timeColumns = computed(() => {
  return [
    dateOptions.value.map((item) => ({ text: item.text, value: item.value })),
    timeSlotOptions.map((item) => ({ text: item.text, value: item.value }))
  ]
})

const selectedDateLabel = computed(() => {
  const target = pickedDate.value || dateOptions.value[dateOptions.value.length - 1]?.value || ''
  return dateOptions.value.find((item) => item.value === target)?.text || ''
})

const selectedTimeText = computed(() => {
  const slotText = timeSlotOptions.find((item) => item.value === pickedTimeSlot.value)?.text || '下午3点后'
  return `${selectedDateLabel.value} ${slotText}`
})

const canSubmit = computed(() => {
  const numeric = Number(amount.value)
  if (!(numeric > 0)) {
    return false
  }
  if (mode.value === 'sell') {
    return currentNav.value > 0
  }
  return true
})

const quickSellButtons = [
  { label: '1/4', ratio: 0.25 },
  { label: '1/3', ratio: 1 / 3 },
  { label: '1/2', ratio: 0.5 },
  { label: '全部', ratio: 1 }
]

const openTimePicker = () => {
  // 每次打开默认定位到“今天”所在选项。
  pickedDate.value = dateOptions.value[dateOptions.value.length - 1]?.value || pickedDate.value
  showTimePicker.value = true
}

const confirmTime = (payload: { selectedOptions?: Array<{ value?: string }> }) => {
  const defaultDate = dateOptions.value[dateOptions.value.length - 1]?.value || ''
  const first = payload.selectedOptions?.[0]?.value || defaultDate
  const second = payload.selectedOptions?.[1]?.value || 'after-close'
  pickedDate.value = first
  pickedTimeSlot.value = second === 'before-close' ? 'before-close' : 'after-close'
  showTimePicker.value = false
}

const fillSellByRatio = (ratio: number) => {
  if (mode.value !== 'sell' || maxSellShare.value <= 0) {
    return
  }
  const next = Math.max(0, maxSellShare.value * ratio)
  amount.value = next.toFixed(2)
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

const submit = () => {
  if (!detail.value || !canSubmit.value) {
    showToast('请输入有效金额')
    return
  }

  const selectedDate = parseYmdDate(pickedDate.value) || new Date()
  const targetTagId = tagStore.activeHoldingTagId || fundStore.resolveHoldingTagIdByCode(code.value)
  const today = new Date()
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  if (mode.value === 'buy') {
    const timing = resolveBuyTiming(selectedDate, pickedTimeSlot.value)
    const appliedDayRate = timing.confirmDate > todayDate ? 0 : dayRate.value
    let success = false
    if (typeof (fundStore as { syncBuyTrade?: unknown }).syncBuyTrade === 'function') {
      success = fundStore.syncBuyTrade({
        code: code.value,
        name: detail.value.name,
        amount: Number(amount.value),
        dayRate: appliedDayRate,
        holdingTagId: targetTagId,
        timeSlot: pickedTimeSlot.value,
        timing
      })
    } else {
      // 兼容旧 store 实例（HMR/缓存场景），避免点击确认直接报错。
      const currentAmount = Number(fundStore.positionByCode[code.value]?.amount || 0)
      const currentProfit = Number(fundStore.positionByCode[code.value]?.profit || 0)
      fundStore.addHoldingFund({ tagId: targetTagId, code: code.value, name: detail.value.name })
      fundStore.updatePositionByCode(code.value, currentAmount + Number(amount.value), currentProfit, {
        dayRate: appliedDayRate
      })
      success = true
    }
    if (!success) {
      showToast('加仓失败，请重试')
      return
    }
    showToast('加仓成功')
    setTimeout(() => {
      void router.replace(`/fund/${code.value}`)
    }, 250)
    return
  }

  const timing = resolveSellTiming(selectedDate, pickedTimeSlot.value)
  const appliedDayRate = timing.tradeDate > todayDate ? 0 : dayRate.value
  let result:
    | {
        soldShare: number
        soldAmount: number
        maxSellShare: number
      }
    | null = null

  if (typeof (fundStore as { syncSellTrade?: unknown }).syncSellTrade === 'function') {
    result = fundStore.syncSellTrade({
      code: code.value,
      name: detail.value.name,
      share: Number(amount.value),
      nav: currentNav.value,
      dayRate: appliedDayRate,
      holdingTagId: targetTagId,
      timeSlot: pickedTimeSlot.value,
      timing
    })
  } else {
    const currentAmount = Number(fundStore.positionByCode[code.value]?.amount || 0)
    const currentProfit = Number(fundStore.positionByCode[code.value]?.profit || 0)
    const maxShare = currentNav.value > 0 ? currentAmount / currentNav.value : 0
    const soldShare = Math.min(Number(amount.value), maxShare)
    if (soldShare > 0 && currentAmount > 0) {
      const soldAmount = soldShare * currentNav.value
      const nextAmount = Math.max(0, currentAmount - soldAmount)
      const nextProfit = currentAmount > 0 ? currentProfit * (nextAmount / currentAmount) : 0
      fundStore.updatePositionByCode(code.value, nextAmount, nextProfit, { dayRate: appliedDayRate })
      result = {
        soldShare,
        soldAmount,
        maxSellShare: maxShare
      }
    }
  }
  if (!result) {
    showToast('减仓失败，请检查份额')
    return
  }

  if (Number(amount.value) > result.maxSellShare) {
    amount.value = result.maxSellShare.toFixed(2)
  }
  showToast('减仓成功')
  setTimeout(() => {
    void router.replace(`/fund/${code.value}`)
  }, 250)
}

watch(
  () => code.value,
  () => {
    void loadDetail()
  },
  { immediate: true }
)

watch(
  () => dateOptions.value,
  () => {
    if (!pickedDate.value) {
      pickedDate.value = dateOptions.value[dateOptions.value.length - 1]?.value || ''
    }
  },
  { immediate: true }
)

</script>

<template>
  <div class="page sync-trade-page">
    <BaseTopNav :title="pageTitle" />

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

      <section class="card form-card">
        <div class="field-line">
          <div class="field-head">{{ amountLabel }}</div>
          <p v-if="mode === 'sell'" class="max-sell-text">最多可卖出{{ maxSellShareText }}份</p>
        </div>
        <van-field v-model="amount" type="number" :placeholder="amountPlaceholder" :class="{ 'sell-field': mode === 'sell' }" />
      </section>

      <section v-if="mode === 'sell'" class="card sell-extra-card">
        <div class="quick-row">
          <button
            v-for="item in quickSellButtons"
            :key="item.label"
            type="button"
            class="quick-btn"
            @click="fillSellByRatio(item.ratio)"
          >
            {{ item.label }}
          </button>
        </div>
      </section>

      <section class="card time-card">
        <button type="button" class="time-btn" @click="openTimePicker">
          <span>{{ timeLabel }}</span>
          <div class="time-value">
            <strong class="time-text">{{ selectedTimeText }}</strong>
            <van-icon name="arrow-down" size="16" />
          </div>
        </button>
      </section>

      <section class="submit-wrap">
        <van-button type="primary" color="#4b6bde" class="submit-btn" :disabled="!canSubmit" @click="submit">
          确定
        </van-button>
      </section>
    </template>

    <van-popup v-model:show="showTimePicker" position="bottom" round>
      <van-picker title="交易时间" :columns="timeColumns" @confirm="confirmTime" @cancel="showTimePicker = false" />
    </van-popup>
  </div>
</template>

<style scoped>
.sync-trade-page {
  padding-bottom: 18px;
}

.loading-wrap {
  min-height: 140px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.form-card,
.time-card {
  margin-top: 10px;
  padding: 10px 12px;
}

.field-head {
  font-size: 1rem;
}

.field-line {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
}

.max-sell-text {
  margin: 0;
  font-size: 0.9rem;
  color: #c0c5d1;
}

.sell-extra-card {
  margin-top: 10px;
  padding: 12px;
}

.quick-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.quick-btn {
  border: 1px solid #cfd5e3;
  background: #fff;
  color: #7f879c;
  border-radius: 999px;
  min-height: 30px;
  font-size: 1rem;
}

.sell-field:deep(.van-field__control) {
  font-size: 1.5rem;
}

.time-btn {
  width: 100%;
  border: 0;
  background: transparent;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 0;
  cursor: pointer;
}

.time-btn span {
  font-size: 1rem;
}

.time-value {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #343c53;
}

.time-value strong {
  font-size: 1rem;
  font-weight: 500;
}

.time-value .time-text {
  font-weight: 500;
}

.submit-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

.submit-btn {
  width: 66%;
  height: 38px;
  border-radius: 4px;
  font-size: 1rem;
}

.submit-btn:deep(.van-button__content) {
  font-size: 1rem;
}
</style>
