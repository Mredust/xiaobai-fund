<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import BaseTopNav from '../components/BaseTopNav.vue'
import FundSnapshotCard from '../components/FundSnapshotCard.vue'
import { fetchFundData, type FundDetailResult } from '../api/fundApi'
import { useFundStore } from '../stores/funds'

const route = useRoute()
const router = useRouter()
const fundStore = useFundStore()

const loading = ref(false)
const detail = ref<FundDetailResult | null>(null)
const amount = ref('')
const showPeriodPicker = ref(false)
const showTimePicker = ref(false)
const periodText = ref('每周 周一')
const timeText = ref('')

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

const periodColumns = computed(() => {
  // 构造定投周期双列数据：周期 + 周几。
  return [
    [
      { text: '每周', value: '每周' },
      { text: '每两周', value: '每两周' },
      { text: '每月', value: '每月' },
      { text: '每日', value: '每日' }
    ],
    [
      { text: '周一', value: '周一' },
      { text: '周二', value: '周二' },
      { text: '周三', value: '周三' },
      { text: '周四', value: '周四' },
      { text: '周五', value: '周五' }
    ]
  ]
})

const timeColumns = computed(() => {
  // 构造未来 10 个可选定投日期。
  const rows = Array.from({ length: 10 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() + 3 + index * 7)
    const year = date.getFullYear()
    const month = `${date.getMonth() + 1}`.padStart(2, '0')
    const day = `${date.getDate()}`.padStart(2, '0')
    return { text: `${year}年${month}月${day}日`, value: `${year}年${month}月${day}日` }
  })
  return [rows]
})

const canSubmit = computed(() => {
  // 完成按钮校验：金额、周期、时间均需有效。
  return Number(amount.value) > 0 && Boolean(periodText.value) && Boolean(timeText.value)
})

const openPeriodPicker = () => {
  // 打开定投周期选择弹窗。
  showPeriodPicker.value = true
}

const openTimePicker = () => {
  // 打开定投时间选择弹窗。
  showTimePicker.value = true
}

const confirmPeriod = (payload: { selectedOptions?: Array<{ text?: string }> }) => {
  // 确认定投周期选择并回填。
  const first = payload.selectedOptions?.[0]?.text || '每周'
  const second = payload.selectedOptions?.[1]?.text || '周一'
  periodText.value = `${first} ${second}`
  showPeriodPicker.value = false
}

const confirmTime = (payload: { selectedOptions?: Array<{ text?: string }> }) => {
  // 确认定投时间选择并回填。
  const first = payload.selectedOptions?.[0]?.text || ''
  timeText.value = first
  showTimePicker.value = false
}

const loadDetail = async () => {
  // 加载基金详情数据用于头部展示。
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

const submitPlan = () => {
  // 提交定投计划并返回定投列表页。
  if (!canSubmit.value) {
    showToast('请完善定投参数')
    return
  }

  showToast('定投计划已设置')
  router.replace(`/fund/${code.value}/sip`)
}

watch(
  () => code.value,
  () => {
    // 基金代码变化时重新拉取详情。
    void loadDetail()
  },
  { immediate: true }
)

watch(
  () => timeColumns.value,
  () => {
    // 首次进入页面时默认选中第一个可选定投日期。
    if (!timeText.value) {
      timeText.value = timeColumns.value[0]?.[0]?.text || ''
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="page sip-plan-page">
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

      <section class="card form-card">
        <div class="row">
          <span>定投金额</span>
          <van-field v-model="amount" type="number" placeholder="输入定投金额" class="inline-field" />
        </div>

        <button type="button" class="row picker-row" @click="openPeriodPicker">
          <span>选择定投周期</span>
          <div class="picker-value">
            <strong>{{ periodText }}</strong>
            <van-icon name="arrow-down" size="14" />
          </div>
        </button>

        <button type="button" class="row picker-row" @click="openTimePicker">
          <span>下次定投时间</span>
          <div class="picker-value">
            <strong>{{ timeText }}</strong>
            <van-icon name="arrow-down" size="14" />
          </div>
        </button>
      </section>

      <section class="submit-wrap">
        <van-button block round type="primary" color="#4b6bde" :disabled="!canSubmit" @click="submitPlan">完成设置</van-button>
      </section>
    </template>

    <van-popup v-model:show="showPeriodPicker" position="bottom" round>
      <van-picker title="定投周期" :columns="periodColumns" @confirm="confirmPeriod" @cancel="showPeriodPicker = false" />
    </van-popup>

    <van-popup v-model:show="showTimePicker" position="bottom" round>
      <van-picker title="定投时间" :columns="timeColumns" @confirm="confirmTime" @cancel="showTimePicker = false" />
    </van-popup>
  </div>
</template>

<style scoped>
.sip-plan-page {
  padding-bottom: 22px;
}

.loading-wrap {
  min-height: 160px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.form-card {
  margin-top: 10px;
  padding: 6px 12px;
}

.row {
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--line);
}

.row:last-child {
  border-bottom: 0;
}

.row span {
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
  color: #3a4258;
}

.submit-wrap {
  margin-top: 12px;
}
</style>

