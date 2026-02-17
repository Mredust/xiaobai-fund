<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import BaseTopNav from '@/components/BaseTopNav.vue'
import BaseNumberKeyboard from '@/components/BaseNumberKeyboard.vue'
import { fetchFundData, type FundDetailResult } from '@/api/fundApi'
import { useFundStore } from '@/stores/funds'

const route = useRoute()
const router = useRouter()
const fundStore = useFundStore()

const loading = ref(false)
const detail = ref<FundDetailResult | null>(null)
const code = computed(() => String(route.params.code || '').trim())

const showNumberKeyboard = ref(false)
const keyboardField = ref<'amount' | 'profit'>('amount')
const keyboardInputValue = ref('')

const showDatePopup = ref(false)
const dateColumns = ref<string[]>([])
const firstBuyDate = ref(new Date())

const maxSelectableDate = new Date()
const minSelectableDate = new Date(maxSelectableDate.getFullYear() - 20, 0, 1)

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

const navText = computed(() => {
  // 净值统一保留四位小数。
  const value = Number(detail.value?.gsz)
  return Number.isFinite(value) ? value.toFixed(4) : '--'
})

const changeValue = computed(() => Number(detail.value?.gszzl || 0))

const changeText = computed(() => {
  // 涨跌幅统一保留两位小数。
  return `${changeValue.value >= 0 ? '+' : ''}${changeValue.value.toFixed(2)}%`
})

const amountText = computed(() => {
  const value = Number(position.value.amount)
  return Number.isFinite(value) ? value.toFixed(2) : '--'
})

const profitText = computed(() => {
  const value = Number(position.value.profit)
  return Number.isFinite(value) ? value.toFixed(2) : '--'
})

const holdingDaysText = computed(() => {
  const value = Number(position.value.holdingDays)
  return Number.isFinite(value) ? `${value}天` : '--'
})

const keyboardTitle = computed(() => (keyboardField.value === 'amount' ? '输入持有金额' : '输入持有收益'))

const previewDate = computed(() => parseColumnsToDate(dateColumns.value) || firstBuyDate.value)
const previewHoldingDays = computed(() => calcHoldingDaysByDate(previewDate.value))

const ensurePositionEntry = () => {
  // 确保持仓快照存在，便于写回编辑结果。
  if (!fundStore.positionByCode[code.value]) {
    fundStore.updatePositionByCode(code.value, 0, 0)
  }
  if (!fundStore.positionByCode[code.value]) {
    fundStore.positionByCode[code.value] = {
      amount: '0.00',
      ratio: '--',
      cost: '--',
      profit: '0.00',
      profitRate: '--',
      holdingDays: '1',
      yesterdayProfit: '0.00',
      yesterdayProfitRate: '--'
    }
  }
  return fundStore.positionByCode[code.value]!
}

const pad2 = (value: number) => String(value).padStart(2, '0')
const toDateColumns = (date: Date) => [String(date.getFullYear()), pad2(date.getMonth() + 1), pad2(date.getDate())]

const parseColumnsToDate = (columns: string[]) => {
  if (columns.length < 3) {
    return null
  }
  const year = Number(columns[0])
  const month = Number(columns[1])
  const day = Number(columns[2])
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null
  }
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }
  return date
}

const calcHoldingDaysByDate = (date: Date) => {
  const end = new Date(maxSelectableDate.getFullYear(), maxSelectableDate.getMonth(), maxSelectableDate.getDate())
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diff = end.getTime() - start.getTime()
  const days = Math.floor(diff / 86400000) + 1
  return days > 0 ? days : 1
}

const deriveFirstBuyDateByHoldingDays = (holdingDaysRaw: string) => {
  const holdingDays = Number(holdingDaysRaw)
  if (!Number.isFinite(holdingDays) || holdingDays <= 0) {
    return new Date(maxSelectableDate)
  }
  const date = new Date(maxSelectableDate)
  date.setDate(date.getDate() - (Math.floor(holdingDays) - 1))
  return date < minSelectableDate ? new Date(minSelectableDate) : date
}

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

const openBatchSync = () => {
  // 预留批量同步入口。
  showToast('批量同步功能开发中')
}

const openAmountEditor = () => {
  // 打开“持有金额”数字键盘。
  keyboardField.value = 'amount'
  const raw = amountText.value
  keyboardInputValue.value = raw === '--' || Number(raw) === 0 ? '' : raw
  showNumberKeyboard.value = true
}

const openProfitEditor = () => {
  // 打开“持有收益”数字键盘。
  keyboardField.value = 'profit'
  const raw = profitText.value
  keyboardInputValue.value = raw === '--' || Number(raw) === 0 ? '' : raw
  showNumberKeyboard.value = true
}

const onKeyboardConfirm = (value: string) => {
  // 确认数字输入后写回持仓数据。
  const normalized = value.trim()
  const safeValue = normalized === '' || normalized === '-' || normalized === '.' || normalized === '-.' ? '0' : normalized
  const parsed = Number(safeValue)
  if (!Number.isFinite(parsed)) {
    showToast('请输入有效数字')
    return
  }

  const entry = ensurePositionEntry()
  if (keyboardField.value === 'amount') {
    entry.amount = Math.max(0, parsed).toFixed(2)
  } else {
    entry.profit = parsed.toFixed(2)
  }

  const nextAmount = Number(entry.amount) || 0
  const nextProfit = Number(entry.profit) || 0
  fundStore.updatePositionByCode(code.value, nextAmount, nextProfit)

  if (!entry.holdingDays || entry.holdingDays === '0') {
    entry.holdingDays = String(calcHoldingDaysByDate(firstBuyDate.value))
  }
  showToast('已更新')
}

const openDatePicker = () => {
  // 打开日期选择弹窗。
  dateColumns.value = toDateColumns(firstBuyDate.value)
  showDatePopup.value = true
}

const confirmDatePicker = () => {
  // 确认日期后回写持有天数。
  const selected = parseColumnsToDate(dateColumns.value)
  if (!selected) {
    showToast('日期无效')
    return
  }

  firstBuyDate.value = selected
  const entry = ensurePositionEntry()
  entry.holdingDays = String(calcHoldingDaysByDate(selected))
  showDatePopup.value = false
  showToast('已更新持有天数')
}

watch(
  () => code.value,
  () => {
    // 基金代码变化时重新加载页面数据。
    void loadDetail()
  },
  { immediate: true }
)

watch(
  () => position.value.holdingDays,
  (value) => {
    // 按当前持有天数推导首次买入日期，保证弹窗默认值正确。
    firstBuyDate.value = deriveFirstBuyDateByHoldingDays(value)
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
      <section class="card fund-brief">
        <div class="fund-name-row">
          <strong class="fund-name">{{ detail.name }}</strong>
          <span class="fund-code">{{ detail.code }}</span>
        </div>

        <div class="fund-nav-row">
          <span>最新净值 ({{ dateText }})：</span>
          <strong>{{ navText }}</strong>
          <strong class="change-text" :class="changeValue >= 0 ? 'rise' : 'fall'">{{ changeText }}</strong>
        </div>
      </section>

      <section class="holding-block">
        <div class="holding-list">
          <button type="button" class="holding-row card clickable" @click="openAmountEditor">
            <span class="label">持有金额：</span>
            <strong class="value">{{ amountText }}</strong>
          </button>

          <button type="button" class="holding-row card clickable" @click="openProfitEditor">
            <span class="label">持有收益：</span>
            <strong class="value">{{ profitText }}</strong>
          </button>

          <button type="button" class="holding-row card clickable" @click="openDatePicker">
            <span class="label">持有天数：</span>
            <strong class="value">{{ holdingDaysText }}</strong>
            <van-icon class="tail-icon" name="arrow" size="20" />
          </button>
        </div>
      </section>

      <section class="card actions-card">
        <button type="button" class="sync-btn buy" @click="openBuy">同步加仓</button>
        <button type="button" class="sync-btn sell" @click="openSell">同步减仓</button>
        <button type="button" class="sync-btn" @click="openSip">同步定投</button>
        <button type="button" class="sync-btn" @click="openConvert">同步转换</button>
      </section>

      <section class="batch-wrap">
        <button type="button" class="batch-btn" @click="openBatchSync">
          <van-icon name="photo-o" size="24" />
          <span>批量同步操作</span>
        </button>
      </section>
    </template>

    <BaseNumberKeyboard
      v-model:show="showNumberKeyboard"
      :title="keyboardTitle"
      :model-value="keyboardInputValue"
      :allow-negative="keyboardField === 'profit'"
      @confirm="onKeyboardConfirm"
    />

    <van-popup v-model:show="showDatePopup" position="bottom" round>
      <section class="date-sheet">
        <header class="date-head">
          <span class="head-empty"></span>
          <button type="button" class="close-btn" @click="showDatePopup = false">
            <van-icon name="cross" size="24" />
          </button>
        </header>

        <div class="days-panel">
          <span class="days-label">持有天数</span>
          <strong class="days-value">{{ previewHoldingDays }}</strong>
          <p class="days-tip">修改首次买入日期可改变持有天数</p>
        </div>

        <div class="picker-title">首次买入日期：</div>

        <van-date-picker
          v-model="dateColumns"
          :show-toolbar="false"
          :min-date="minSelectableDate"
          :max-date="maxSelectableDate"
        />

        <button type="button" class="date-confirm-btn" @click="confirmDatePicker">确认</button>
      </section>
    </van-popup>
  </div>
</template>

<style scoped>
.edit-holding-page {
  background: #f4f5f8;
  min-height: calc(100vh - 3.5rem - env(safe-area-inset-bottom));
  padding-bottom: 20px;
}

.loading-wrap {
  margin: 12px;
  min-height: 160px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.fund-brief {
  margin-top: 8px;
  padding: 14px 12px;
}

.fund-name-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.fund-name {
  margin: 0;
  font-size: 1.0625rem;
  line-height: 1.2;
  color: #4c4f84;
}

.fund-code {
  color: #5f6486;
  font-size: 0.875rem;
  font-weight: 600;
}

.fund-nav-row {
  margin-top: 8px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  color: #5d637f;
  font-size: 1rem;
}

.fund-nav-row strong {
  font-size: 1.0625rem;
  color: #1f2740;
}

.change-text.rise {
  color: #e34a4a;
}

.change-text.fall {
  color: #22a06b;
}

.holding-block {
  margin-top: 10px;
  padding: 12px;
  background-color: #fff;
}

.holding-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.holding-row {
  min-height: 56px;
  border: 0;
  display: flex;
  align-items: center;
  padding: 0 14px;
  background: #f3f4f7;
  border-radius: 10px;
}

.holding-row .label {
  font-size: 1rem;
  color: #252e48;
}

.holding-row .value {
  margin-left: 10px;
  font-size: 1rem;
  color: #1d2450;
  font-weight: 500;
}

.holding-row.clickable {
  width: 100%;
  text-align: left;
  cursor: pointer;
}

.tail-icon {
  margin-left: auto;
  color: #949aae;
}

.actions-card {
  padding: 12px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.sync-btn {
  border: 1px solid #eceef4;
  background: #fff;
  border-radius: 12px;
  min-height: 60px;
  font-size: 1rem;
  color: #3b61d5;
  box-shadow: 0 2px 8px rgb(20 31 61 / 4%);
  cursor: pointer;
}

.sync-btn.buy {
  color: #e05b5b;
}

.sync-btn.sell {
  color: #20a162;
}

.batch-wrap {
  margin-top: 14px;
  padding: 0 12px;
  display: flex;
  justify-content: center;
}

.batch-btn {
  width: 70%;
  height: 50px;
  border: 0;
  border-radius: 12px;
  background: #4567e4;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 1rem;
  cursor: pointer;
}

.date-sheet {
  background: #fff;
  border-radius: 16px 16px 0 0;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
}

.date-head {
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  border-bottom: 1px solid #eff1f6;
}

.head-empty {
  width: 1px;
}

.close-btn {
  border: 0;
  background: transparent;
  color: #a4a9b8;
  cursor: pointer;
}

.days-panel {
  padding: 16px 0 10px;
  display: flex;
  align-items: center;
  flex-direction: column;
}

.days-label {
  color: #9aa0af;
  font-size: 1rem;
}

.days-value {
  margin-top: 2px;
  color: #1b2239;
  font-size: 2.125rem;
  line-height: 1.1;
}

.days-tip {
  margin: 6px 0 0;
  color: #d3a37d;
  font-size: 0.875rem;
}

.picker-title {
  padding: 0 16px;
  margin: 6px 0 8px;
  font-size: 1rem;
  color: #1f2740;
  font-weight: 600;
}

.date-confirm-btn {
  width: calc(100% - 32px);
  margin: 10px 16px 0;
  height: 52px;
  border: 0;
  border-radius: 12px;
  background: #4567e4;
  color: #fff;
  font-size: 1.25rem;
  cursor: pointer;
}
</style>
