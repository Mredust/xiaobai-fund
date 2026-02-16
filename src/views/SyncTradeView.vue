<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { showToast } from 'vant'
import BaseTopNav from '../components/BaseTopNav.vue'
import FundSnapshotCard from '../components/FundSnapshotCard.vue'
import { fetchFundData, type FundDetailResult } from '../api/fundApi'

const route = useRoute()

const loading = ref(false)
const detail = ref<FundDetailResult | null>(null)
const amount = ref('')
const showTimePicker = ref(false)
const pickedDate = ref('')
const pickedTimeSlot = ref('下午3点后')

const code = computed(() => String(route.params.code || '').trim())

const mode = computed<'buy' | 'sell'>(() => {
  // 通过路由名称判断当前是加仓还是减仓页。
  return route.name === 'fund-sync-sell' ? 'sell' : 'buy'
})

const pageTitle = computed(() => {
  // 动态渲染页面标题。
  return mode.value === 'buy' ? '加仓' : '减仓'
})

const amountLabel = computed(() => {
  // 动态渲染金额输入栏标题。
  return mode.value === 'buy' ? '加仓金额' : '卖出份额'
})

const amountPlaceholder = computed(() => {
  // 动态渲染金额输入占位文案。
  return mode.value === 'buy' ? '输入加仓金额' : '输入卖出份额'
})

const timeLabel = computed(() => {
  // 动态渲染时间行标题。
  return mode.value === 'buy' ? '加仓时间' : '卖出时间'
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

const dateOptions = computed(() => {
  // 构造最近 7 天可选日期列表。
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - index))
    const month = `${date.getMonth() + 1}`.padStart(2, '0')
    const day = `${date.getDate()}`.padStart(2, '0')
    const weekNames = ['日', '一', '二', '三', '四', '五', '六']
    return `${month}月${day}日(周${weekNames[date.getDay()]})`
  })
})

const timeColumns = computed(() => {
  // 构建双列时间选择器：左列日期、右列交易时点。
  return [
    dateOptions.value.map((item) => ({ text: item, value: item })),
    [
      { text: '上午3点前', value: '上午3点前' },
      { text: '下午3点后', value: '下午3点后' }
    ]
  ]
})

const selectedTimeText = computed(() => {
  // 输出当前选中的交易时间文本。
  const date = pickedDate.value || dateOptions.value[dateOptions.value.length - 1] || ''
  return `${date} ${pickedTimeSlot.value}`
})

const canSubmit = computed(() => {
  // 按钮校验：金额需大于 0 才允许确认。
  return Number(amount.value) > 0
})

const openTimePicker = () => {
  // 打开底部交易时间选择器。
  showTimePicker.value = true
}

const confirmTime = (payload: { selectedOptions?: Array<{ text?: string }> }) => {
  // 确认选择器后回填日期和时间时段。
  const first = payload.selectedOptions?.[0]?.text || dateOptions.value[dateOptions.value.length - 1] || ''
  const second = payload.selectedOptions?.[1]?.text || '下午3点后'
  pickedDate.value = first
  pickedTimeSlot.value = second
  showTimePicker.value = false
}

const loadDetail = async () => {
  // 请求基金详情数据，供页面头部展示。
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
  // 提交同步交易数据。
  if (!canSubmit.value) {
    showToast('请输入有效金额')
    return
  }

  showToast(mode.value === 'buy' ? '加仓记录已同步' : '减仓记录已同步')
}

watch(
  () => code.value,
  () => {
    // 基金代码变化时重新拉取数据。
    void loadDetail()
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
        :nav="detail.gsz"
        :change-percent="detail.gszzl"
        :date-text="dateText"
      />

      <section class="card form-card">
        <div class="field-head">{{ amountLabel }}</div>
        <van-field v-model="amount" type="number" :placeholder="amountPlaceholder" />
      </section>

      <section class="card time-card">
        <button type="button" class="time-btn" @click="openTimePicker">
          <span>{{ timeLabel }}</span>
          <div class="time-value">
            <strong>{{ selectedTimeText }}</strong>
            <van-icon name="arrow-down" size="16" />
          </div>
        </button>
      </section>

      <section class="submit-wrap">
        <van-button block round type="primary" color="#4b6bde" :disabled="!canSubmit" @click="submit">确定</van-button>
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
  margin-bottom: 8px;
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

.submit-wrap {
  margin-top: 16px;
}
</style>

