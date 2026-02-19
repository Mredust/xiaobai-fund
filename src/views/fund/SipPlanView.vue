<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import BaseTopNav from '@/components/BaseTopNav.vue'
import FundSnapshotCard from './components/FundSnapshotCard.vue'
import { fetchFundData, type FundDetailResult } from '@/api/fundApi'
import { useFundStore } from '@/stores/funds'
import {
  formatMonthDayWeekLabel,
  formatYmdDate
} from '@/utils/trade'

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
const timeValue = ref('')

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

const weekOptions = [
  { text: '周一', value: '周一' },
  { text: '周二', value: '周二' },
  { text: '周三', value: '周三' },
  { text: '周四', value: '周四' },
  { text: '周五', value: '周五' }
]

const monthDayOptions = computed(() => {
  const now = new Date()
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return Array.from({ length: days }, (_, index) => {
    const day = index + 1
    return {
      text: `${day}日`,
      value: String(day)
    }
  })
})

const periodColumns = computed(() => {
  // 周期联动规则：周/双周=>周一至周五；每月=>当月日期；每日=>无需右侧选择。
  return [
    {
      text: '每周',
      value: '每周',
      children: weekOptions
    },
    {
      text: '每两周',
      value: '每两周',
      children: weekOptions
    },
    {
      text: '每月',
      value: '每月',
      children: monthDayOptions.value
    },
    {
      text: '每日',
      value: '每日',
      children: [{ text: '无需选择', value: '无需选择' }]
    }
  ]
})

const timeColumns = computed(() => {
  const rows = Array.from({ length: 10 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() + index * 7)
    return {
      text: formatMonthDayWeekLabel(date),
      value: formatYmdDate(date)
    }
  })
  return [rows]
})

const canSubmit = computed(() => {
  return Number(amount.value) > 0 && Boolean(periodText.value) && Boolean(timeValue.value)
})

const openPeriodPicker = () => {
  showPeriodPicker.value = true
}

const openTimePicker = () => {
  // 打开时默认落在“今天”对应项。
  timeValue.value = timeColumns.value[0]?.[0]?.value || timeValue.value
  timeText.value = timeColumns.value[0]?.[0]?.text || timeText.value
  showTimePicker.value = true
}

const confirmPeriod = (payload: { selectedOptions?: Array<{ text?: string }> }) => {
  const first = payload.selectedOptions?.[0]?.text || '每周'
  const second = payload.selectedOptions?.[1]?.text || ''
  periodText.value = first === '每日' ? '每日' : second ? `${first} ${second}` : first
  showPeriodPicker.value = false
}

const confirmTime = (payload: { selectedOptions?: Array<{ text?: string; value?: string }> }) => {
  const firstText = payload.selectedOptions?.[0]?.text || ''
  const firstValue = payload.selectedOptions?.[0]?.value || ''
  timeText.value = firstText
  timeValue.value = firstValue
  showTimePicker.value = false
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

const submitPlan = () => {
  if (!detail.value || !canSubmit.value) {
    showToast('请完善定投参数')
    return
  }

  const created = fundStore.addSipPlan({
    code: code.value,
    fundName: detail.value.name,
    amount: Number(amount.value),
    periodText: periodText.value,
    nextRunDate: timeValue.value
  })
  if (!created) {
    showToast('定投计划保存失败')
    return
  }

  fundStore.runDueSipPlans()
  showToast('定投计划已设置')
  void router.replace(`/fund/${code.value}/sip`)
}

watch(
  () => code.value,
  () => {
    void loadDetail()
  },
  { immediate: true }
)

watch(
  () => timeColumns.value,
  () => {
    if (!timeText.value) {
      const first = timeColumns.value[0]?.[0]
      timeText.value = first?.text || ''
      timeValue.value = first?.value || ''
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
        :nav="currentNav"
        :change-percent="detail.gszzl"
        :date-text="dateText"
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
        <van-button type="primary" color="#4b6bde" class="submit-btn" :disabled="!canSubmit" @click="submitPlan">完成设置</van-button>
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
