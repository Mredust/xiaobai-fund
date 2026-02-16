<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import BaseTopNav from '../components/BaseTopNav.vue'
import { fetchFundData, type FundDetailResult } from '../api/fundApi'
import { useFundStore } from '../stores/funds'

const route = useRoute()
const router = useRouter()
const fundStore = useFundStore()

const loading = ref(false)
const detail = ref<FundDetailResult | null>(null)
const outAmount = ref('')
const inAmount = ref('')
const resultText = ref('')

const code = computed(() => String(route.params.code || '').trim())

const transferDate = computed(() => {
  // 默认使用当天作为转换确认日期展示。
  const date = new Date()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${month}月${day}日`
})

const targetFund = computed(() => {
  // 读取转换页已选择的转入基金。
  return fundStore.convertTargetFund
})

const canSubmit = computed(() => {
  // 完成按钮校验：需选择转入基金并填写有效金额。
  return Boolean(targetFund.value) && Number(outAmount.value) > 0 && Number(inAmount.value) > 0
})

const addBusinessDays = (start: Date, days: number) => {
  // 按工作日顺延指定天数，跳过周六周日。
  const date = new Date(start)
  let left = days
  while (left > 0) {
    date.setDate(date.getDate() + 1)
    const day = date.getDay()
    if (day !== 0 && day !== 6) {
      left -= 1
    }
  }
  return date
}

const formatYmd = (date: Date) => {
  // 格式化日期为 yyyy-mm-dd 文本。
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const resolveConvertRule = () => {
  // 根据转入基金规则生成预计生效时间与条件说明。
  const targetCode = targetFund.value?.code || ''
  const now = new Date()
  const afterClose = now.getHours() >= 15
  const isQdii = targetCode.startsWith('16') || targetCode.startsWith('01')
  const isSameCompany = targetCode.slice(0, 2) === code.value.slice(0, 2)

  let baseDays = isQdii ? 2 : 1
  if (!isSameCompany) {
    baseDays += 1
  }
  if (afterClose) {
    baseDays += 1
  }

  const effectiveDate = addBusinessDays(now, baseDays)
  const ruleParts = [
    isQdii ? 'QDII 转换' : '普通基金转换',
    isSameCompany ? '同公司' : '跨公司',
    afterClose ? '15:00后提交' : '15:00前提交'
  ]

  return `预计 ${formatYmd(effectiveDate)} 生效（${ruleParts.join('，')}）`
}

const loadDetail = async () => {
  // 请求基金详情数据，填充转出基金信息。
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
  // 跳转基金搜索页选择转入基金。
  router.push('/fund-search?mode=pick-convert')
}

const submitConvert = () => {
  // 点击完成后依据规则生成转换生效说明。
  if (!canSubmit.value) {
    showToast('请完善转换信息')
    return
  }

  if (targetFund.value?.code === code.value) {
    showToast('转入基金不能与转出基金相同')
    return
  }

  resultText.value = resolveConvertRule()
  showToast('转换申请已提交')
}

watch(
  () => code.value,
  () => {
    // 基金代码变化时刷新转出基金信息。
    fundStore.clearConvertTargetFund()
    void loadDetail()
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

      <div class="row">
        <span>转换确认日期</span>
        <div class="picker-value">
          <strong>{{ transferDate }}</strong>
          <van-icon name="calendar-o" size="16" />
        </div>
      </div>

      <div class="tips">不知道怎么填写？点击查看教程</div>

      <van-button block round type="primary" color="#4b6bde" :disabled="!canSubmit" @click="submitConvert">完成</van-button>

      <div v-if="resultText" class="result-box">{{ resultText }}</div>
    </section>
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

.tips {
  color: #8a90a5;
  font-size: 0.8125rem;
  text-align: center;
  margin: 14px 0 12px;
}

.result-box {
  margin-top: 12px;
  background: #f4f8ff;
  border: 1px solid #d9e4ff;
  border-radius: 8px;
  padding: 10px;
  color: #355ecf;
  font-size: 0.875rem;
}
</style>

