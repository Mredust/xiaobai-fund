<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import BaseTopNav from '@/components/BaseTopNav.vue'
import BaseNumberKeyboard from '@/components/BaseNumberKeyboard.vue'
import { fetchFundData, type FundDetailResult } from '@/api/fundApi'
import { useFundStore } from '@/stores/funds'
import { TAG_NAME_ALL, useTagStore } from '@/stores/tags'

const route = useRoute()
const router = useRouter()
const fundStore = useFundStore()
const tagStore = useTagStore()

const loading = ref(false)
const detail = ref<FundDetailResult | null>(null)

const amountValue = ref('')
const profitValue = ref('')
const syncToWatch = ref(true)

const keyboardShow = ref(false)
const keyboardField = ref<'amount' | 'profit'>('amount')
const keyboardValue = ref('')

const code = computed(() => String(route.params.code || '').trim())
const queryTagId = computed(() => Number(route.query.tagId || 0))
const targetTagId = computed(() => {
  if (Number.isFinite(queryTagId.value) && queryTagId.value > 0) {
    return queryTagId.value
  }
  return tagStore.activeHoldingTagId
})

const targetTag = computed(() => tagStore.holdingTags.find((item) => item.id === targetTagId.value) || null)

const pageTitle = computed(() => `${targetTag.value?.name || '持有'}-添加持有`)

const canSubmit = computed(() => Number(amountValue.value) > 0)

const dateText = computed(() => {
  const raw = detail.value?.gztime || ''
  const datePart = raw.split(' ')[0] || ''
  if (!datePart.includes('-')) {
    return '--'
  }
  return datePart.slice(5)
})

const navText = computed(() => {
  const value = Number(detail.value?.gsz)
  return Number.isFinite(value) ? value.toFixed(4) : '--'
})

const changeValue = computed(() => Number(detail.value?.gszzl || 0))

const changeText = computed(() => `${changeValue.value >= 0 ? '+' : ''}${changeValue.value.toFixed(2)}%`)

const openKeyboard = (field: 'amount' | 'profit') => {
  keyboardField.value = field
  keyboardValue.value = field === 'amount' ? amountValue.value : profitValue.value
  keyboardShow.value = true
}

const onKeyboardConfirm = (value: string) => {
  const normalized = value.trim()
  const safeText = normalized === '' || normalized === '-' || normalized === '.' || normalized === '-.' ? '0' : normalized
  const parsed = Number(safeText)
  if (!Number.isFinite(parsed)) {
    showToast('请输入有效数字')
    return
  }

  if (keyboardField.value === 'amount') {
    amountValue.value = String(Math.max(0, parsed))
    return
  }
  profitValue.value = String(parsed)
}

const resolveWatchAllTagId = () => {
  return tagStore.watchTags.find((item) => item.name === TAG_NAME_ALL)?.id || tagStore.activeWatchTagId
}

const submit = async () => {
  if (!detail.value) {
    showToast('基金信息加载中')
    return
  }
  const targetCode = code.value
  if (!targetCode) {
    showToast('基金代码无效')
    return
  }

  const amount = Number(amountValue.value || 0)
  if (!Number.isFinite(amount) || amount <= 0) {
    showToast('请输入有效的持有金额')
    return
  }

  const profit = Number(profitValue.value || 0)
  const safeProfit = Number.isFinite(profit) ? profit : 0

  fundStore.addHoldingFund({
    tagId: targetTagId.value,
    code: targetCode,
    name: detail.value.name,
    amount,
    profit: safeProfit
  })

  let targetWatchTagId = tagStore.activeWatchTagId
  if (syncToWatch.value) {
    const watchTagId = resolveWatchAllTagId()
    targetWatchTagId = watchTagId
    if (!watchTagId) {
      showToast('暂无可用自选分组')
      return
    }

    // 已在自选中时直接结束同步分支，不继续执行后续同步判断。
    if (!fundStore.isWatchFund(targetCode)) {
      fundStore.addWatchFund({
        tagId: watchTagId,
        code: targetCode,
        name: detail.value.name
      })
    }
  }

  showToast('已添加持有')
  if (targetWatchTagId) {
    tagStore.setWatchActive(targetWatchTagId)
  }

  // 先落到自选页，再进入详情页，保证详情“返回”直接回到自选对应标签。
  await router.replace('/watchlist')
  await router.push(`/fund/${targetCode}`)
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

watch(
  () => code.value,
  () => {
    void loadDetail()
  },
  { immediate: true }
)
</script>

<template>
  <div class="page add-holding-input-page">
    <BaseTopNav :title="pageTitle" />

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

      <section class="card form-card">
        <button type="button" class="input-row" @click="openKeyboard('amount')">
          <span class="label">持有金额</span>
          <span class="value">{{ amountValue || '请输入该基金的持有金额' }}</span>
        </button>

        <button type="button" class="input-row" @click="openKeyboard('profit')">
          <span class="label">持有收益</span>
          <span class="value">{{ profitValue || '请输入该基金的持有收益' }}</span>
        </button>
      </section>
    </template>

    <section class="bottom-actions">
      <label class="sync-check">
        <van-checkbox v-model="syncToWatch" checked-color="#3f62da" icon-size="18px">同步到自选</van-checkbox>
      </label>

      <van-button
        block
        round
        type="primary"
        color="#3b63e6"
        :disabled="!canSubmit"
        class="confirm-btn"
        @click="submit"
      >
        确认添加
      </van-button>
    </section>

    <BaseNumberKeyboard
      v-model:show="keyboardShow"
      :title="keyboardField === 'amount' ? '输入持有金额' : '输入持有收益'"
      :model-value="keyboardValue"
      :allow-negative="keyboardField === 'profit'"
      @confirm="onKeyboardConfirm"
    />
  </div>
</template>

<style scoped>
.add-holding-input-page {
  min-height: calc(100vh - 3.5rem - env(safe-area-inset-bottom));
  background: #f4f5f8;
  padding-bottom: calc(130px + env(safe-area-inset-bottom));
}

.loading-wrap {
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
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

.form-card {
  margin-top: 8px;
  padding: 14px 12px;
}

.hint-line {
  color: #355dd9;
  font-size: 1.5rem;
  line-height: 1;
  margin-bottom: 12px;
}

.input-row {
  width: 100%;
  min-height: 72px;
  border: 0;
  border-radius: 10px;
  padding: 0 16px;
  margin: 0;
  background: #f3f4f8;
  display: grid;
  grid-template-columns: 92px 1fr;
  align-items: center;
  text-align: left;
  cursor: pointer;
}

.input-row + .input-row {
  margin-top: 10px;
}

.label {
  color: #1f2741;
  font-size: 1.0625rem;
  font-weight: 500;
}

.value {
  color: #a6acbb;
  font-size: 1rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bottom-actions {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: calc(10px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.sync-check {
  color: #424d75;
  font-size: 1rem;
}

.confirm-btn {
  height: 45px;
  font-size: 1rem;
}
</style>
