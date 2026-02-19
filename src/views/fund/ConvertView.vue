<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import BaseTopNav from '@/components/BaseTopNav.vue'
import { fetchFundData, type FundDetailResult } from '@/api/fundApi'
import { useFundStore } from '@/stores/funds'
import { useTagStore } from '@/stores/tags'
import {
  formatMonthDayWeekLabel,
  formatYmdDate,
  parseYmdDate,
  resolveConvertTiming,
  type TradeTimeSlot
} from '@/utils/trade'

const route = useRoute()
const router = useRouter()
const fundStore = useFundStore()
const tagStore = useTagStore()

const loading = ref(false)
const detail = ref<FundDetailResult | null>(null)
const outAmount = ref('')
const inAmount = ref('')
const resultText = ref('')
const showTimePicker = ref(false)
const pickedDate = ref('')
const pickedTimeSlot = ref<TradeTimeSlot>('after-close')

const code = computed(() => String(route.params.code || '').trim())

const targetFund = computed(() => {
  return fundStore.convertTargetFund
})

const canSubmit = computed(() => {
  return Boolean(targetFund.value) && Number(outAmount.value) > 0 && Number(inAmount.value) > 0 && Boolean(pickedDate.value)
})

const dateOptions = computed(() => {
  // 可选范围：今天 - 90 天 到 今天。
  return Array.from({ length: 91 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (90 - index))
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

const selectedConvertDateText = computed(() => {
  const dateLabel = dateOptions.value.find((item) => item.value === pickedDate.value)?.text || ''
  const slotText = timeSlotOptions.find((item) => item.value === pickedTimeSlot.value)?.text || '下午3点后'
  return `${dateLabel} ${slotText}`
})

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

const openSearch = () => {
  router.push('/fund-search?mode=pick-convert')
}

const openTimePicker = () => {
  // 打开时默认定位到“今天”选项。
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

const buildConvertResultText = (timing: ReturnType<typeof resolveConvertTiming>) => {
  const requestRuleText = !timing.isTradingDay
    ? '非交易日提交，顺延至下一个交易日处理'
    : timing.isAfterClose
      ? '交易日15:00后提交，转出转入按下个交易日净值计算，T+2确认'
      : '交易日15:00前提交，转出转入按当日净值计算，T+1确认'

  return `按${formatYmdDate(timing.tradeDate)}净值计算，预计${formatYmdDate(timing.confirmDate)}确认。${requestRuleText}。转换费用=转出基金赎回费 + 转入基金申购费补差（如适用）。`
}

const submitConvert = () => {
  if (!detail.value || !canSubmit.value) {
    showToast('请完善转换信息')
    return
  }

  if (targetFund.value?.code === code.value) {
    showToast('转入基金不能与转出基金相同')
    return
  }

  const selectedDate = parseYmdDate(pickedDate.value) || new Date()
  const timing = resolveConvertTiming(selectedDate, pickedTimeSlot.value)
  const today = new Date()
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const appliedSourceRate = timing.confirmDate > todayDate ? 0 : Number(detail.value.gszzl || 0)

  let synced:
    | {
        actualOutAmount: number
        inAmount: number
      }
    | null = null

  if (typeof (fundStore as { syncConvertTrade?: unknown }).syncConvertTrade === 'function') {
    synced = fundStore.syncConvertTrade({
      sourceCode: code.value,
      sourceName: detail.value.name,
      targetCode: targetFund.value?.code || '',
      targetName: targetFund.value?.name || '',
      outAmount: Number(outAmount.value),
      inAmount: Number(inAmount.value),
      sourceDayRate: appliedSourceRate,
      holdingTagId: tagStore.activeHoldingTagId || fundStore.resolveHoldingTagIdByCode(code.value),
      timeSlot: pickedTimeSlot.value,
      timing
    })
  } else {
    const sourceCode = code.value
    const targetCode = targetFund.value?.code || ''
    const outAmt = Number(outAmount.value)
    const inAmt = Number(inAmount.value)
    const sourceAmount = Number(fundStore.positionByCode[sourceCode]?.amount || 0)
    const sourceProfit = Number(fundStore.positionByCode[sourceCode]?.profit || 0)
    if (sourceAmount > 0 && outAmt > 0 && inAmt > 0 && targetCode) {
      const actualOut = Math.min(outAmt, sourceAmount)
      const nextSourceAmount = Math.max(0, sourceAmount - actualOut)
      const nextSourceProfit = sourceAmount > 0 ? sourceProfit * (nextSourceAmount / sourceAmount) : 0
      fundStore.updatePositionByCode(sourceCode, nextSourceAmount, nextSourceProfit, { dayRate: appliedSourceRate })

      const targetAmount = Number(fundStore.positionByCode[targetCode]?.amount || 0)
      const targetProfit = Number(fundStore.positionByCode[targetCode]?.profit || 0)
      const targetTagId = tagStore.activeHoldingTagId || 1
      fundStore.addHoldingFund({ tagId: targetTagId, code: targetCode, name: targetFund.value?.name || targetCode })
      fundStore.updatePositionByCode(targetCode, targetAmount + inAmt, targetProfit, { dayRate: 0 })
      synced = { actualOutAmount: actualOut, inAmount: inAmt }
    }
  }

  if (!synced) {
    showToast('转换失败，请检查金额')
    return
  }

  resultText.value = buildConvertResultText(timing)
  showToast('转换成功')
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
  <div class="page convert-page">
    <BaseTopNav title="基金转换" />

    <section v-if="loading" class="card loading-wrap">
      <van-loading size="28" />
    </section>

    <section v-else-if="detail" class="card form-card">
      <div class="row">
        <span>转出基金</span>
        <strong>{{ detail.name }}</strong>
      </div>

      <div class="row">
        <span>转出金额</span>
        <van-field v-model="outAmount" type="number" placeholder="请输入对应转出金额" class="inline-field" />
      </div>

      <button type="button" class="row picker-row" @click="openSearch">
        <span>转入基金</span>
        <div class="picker-value">
          <strong>{{ targetFund ? targetFund.name : '请选择转入基金' }}</strong>
          <van-icon name="arrow" size="16" />
        </div>
      </button>

      <div class="row">
        <span>转入金额</span>
        <van-field v-model="inAmount" type="number" placeholder="请输入对应转入金额" class="inline-field" />
      </div>

      <button type="button" class="row picker-row" @click="openTimePicker">
        <span>转换日期</span>
        <div class="picker-value">
          <strong>{{ selectedConvertDateText }}</strong>
          <van-icon name="calendar-o" size="16" />
        </div>
      </button>

      <van-button block round type="primary" color="#4b6bde" :disabled="!canSubmit" @click="submitConvert">完成</van-button>

      <div v-if="resultText" class="result-box">{{ resultText }}</div>
    </section>

    <van-popup v-model:show="showTimePicker" position="bottom" round>
      <van-picker title="转换日期" :columns="timeColumns" @confirm="confirmTime" @cancel="showTimePicker = false" />
    </van-popup>
  </div>
</template>

<style scoped>
.convert-page {
  padding-bottom: 20px;
}

.loading-wrap {
  min-height: 160px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.form-card {
  padding: 6px 12px 12px;
}

.row {
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--line);
}

.row > span {
  font-size: 1rem;
}

.inline-field {
  flex: 1;
}

.picker-row {
  width: 100%;
  border-left: 0;
  border-right: 0;
  border-top: 0;
  background: transparent;
  cursor: pointer;
  padding: 0;
}

.picker-value {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #3d4359;
}

.picker-value strong {
  font-weight: 500;
}

.result-box {
  margin-top: 12px;
  background: #f4f8ff;
  border: 1px solid #d9e4ff;
  border-radius: 8px;
  padding: 10px;
  color: #355ecf;
  font-size: 0.875rem;
  line-height: 1.5;
}
</style>
