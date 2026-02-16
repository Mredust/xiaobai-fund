<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import BaseTopNav from '../components/BaseTopNav.vue'
import { useFundStore } from '../stores/funds'
import { useTagStore } from '../stores/tags'

const router = useRouter()
const fundStore = useFundStore()
const tagStore = useTagStore()

const showInputPopup = ref(false)
const editingField = ref<'amount' | 'profit'>('amount')
const popupValue = ref('')

const activeHoldingTagId = computed(() => tagStore.activeHoldingTagId)
const activeWatchTagId = computed(() => tagStore.activeWatchTagId)

const pageTitle = computed(() => {
  // 页面标题跟随当前持有标签，提示当前导入归属标签。
  const activeTag = tagStore.holdingTags.find((item) => item.id === activeHoldingTagId.value)
  return `新增到-${activeTag?.name || '持有'}`
})

const records = computed(() => fundStore.manualImportRecords)
const selectedFund = computed(() => fundStore.manualImportFund)
const amountText = computed(() => fundStore.manualImportAmount)
const profitText = computed(() => fundStore.manualImportProfit)

const canAddOne = computed(() => {
  // “再加一只”按钮校验：必须选择基金且持有金额大于 0。
  return Boolean(selectedFund.value && Number(amountText.value) > 0)
})

const openFundSearch = () => {
  // 点击名称行进入基金搜索页，使用 pick 模式回填到当前表单。
  router.push('/fund-search?mode=pick&from=manual-holdings')
}

const openAmountInput = () => {
  // 打开持有金额底部输入框。
  editingField.value = 'amount'
  popupValue.value = amountText.value
  showInputPopup.value = true
}

const openProfitInput = () => {
  // 打开持有收益底部输入框。
  editingField.value = 'profit'
  popupValue.value = profitText.value
  showInputPopup.value = true
}

const confirmPopupInput = () => {
  // 确认底部输入后写回对应字段。
  if (editingField.value === 'amount') {
    fundStore.setManualImportAmount(popupValue.value.trim())
  } else {
    fundStore.setManualImportProfit(popupValue.value.trim())
  }
  showInputPopup.value = false
}

const addOne = () => {
  // 将当前表单基金加入待提交列表并清空表单。
  if (!canAddOne.value) {
    showToast('请先选择基金并输入持有金额')
    return
  }

  const success = fundStore.appendManualImportRecord()
  if (!success) {
    showToast('当前基金数据无效')
    return
  }

  showToast('已添加到列表')
}

const removeRecord = (id: number, event: Event) => {
  // 删除待提交列表中的某一项，不触发行点击跳转。
  event.stopPropagation()
  fundStore.removeManualImportRecord(id)
}

const toDetail = (code: string) => {
  // 点击已添加基金跳转到基金详情页。
  router.push(`/fund/${code}`)
}

const finishImport = () => {
  // 提交导入结果到当前标签，并跳转到自选页。
  const count = fundStore.commitManualImport({
    holdingTagId: activeHoldingTagId.value,
    watchTagId: activeWatchTagId.value
  })

  if (count <= 0) {
    showToast('请先添加至少一只基金')
    return
  }

  showToast(`已导入 ${count} 只基金`)
  router.replace('/watchlist')
}
</script>

<template>
  <div class="page manual-holdings-page">
    <BaseTopNav :title="pageTitle" />

    <section v-if="records.length > 0" class="saved-list">
      <article v-for="item in records" :key="item.id" class="saved-item card" @click="toDetail(item.code)">
        <div class="saved-left">
          <span class="code">{{ item.code }}</span>
          <strong>{{ item.name }}</strong>
        </div>
        <div class="saved-right">
          <div class="value-col">
            <span>持有金额</span>
            <strong>{{ item.amount.toFixed(2) }}</strong>
          </div>
          <div class="value-col">
            <span>持有收益</span>
            <strong :class="item.profit >= 0 ? 'up' : 'down'">{{ item.profit >= 0 ? '+' : '' }}{{ item.profit.toFixed(2) }}</strong>
          </div>
          <button type="button" class="remove-btn" @click="removeRecord(item.id, $event)">
            <van-icon name="cross" size="14" />
          </button>
        </div>
      </article>
    </section>

    <section class="card form-card">
      <button type="button" class="form-row" @click="openFundSearch">
        <span class="label">名称</span>
        <span class="value">{{ selectedFund ? `${selectedFund.name}(${selectedFund.code})` : '请选择代码或名称' }}</span>
      </button>

      <button type="button" class="form-row" @click="openAmountInput">
        <span class="label">持有金额</span>
        <span class="value">{{ amountText || '请输入持有金额' }}</span>
      </button>

      <button type="button" class="form-row" @click="openProfitInput">
        <span class="label">持有收益</span>
        <span class="value">{{ profitText || '请输入持有收益' }}</span>
      </button>

      <div class="add-wrap">
        <van-button type="primary" plain round icon="plus" :disabled="!canAddOne" @click="addOne">再加一只</van-button>
      </div>
    </section>

    <section class="bottom-panel card">
      <van-checkbox
        :model-value="fundStore.manualImportSyncWatch"
        checked-color="#4b6bde"
        icon-size="16px"
        @update:model-value="fundStore.setManualImportSyncWatch"
      >
        同步到自选
      </van-checkbox>

      <van-button block type="primary" round color="#4b6bde" :disabled="records.length === 0" @click="finishImport">
        完成({{ records.length }})
      </van-button>
    </section>

    <van-popup v-model:show="showInputPopup" position="bottom" round>
      <div class="input-popup">
        <div class="popup-title">{{ editingField === 'amount' ? '输入持有金额' : '输入持有收益' }}</div>
        <van-field v-model="popupValue" type="number" placeholder="请输入数字" />
        <van-button block type="primary" @click="confirmPopupInput">确认</van-button>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.manual-holdings-page {
  padding-bottom: 138px;
}

.saved-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.saved-item {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  padding: 10px;
  cursor: pointer;
}

.saved-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.saved-left .code {
  font-size: 0.75rem;
  color: #8e94aa;
}

.saved-left strong {
  font-size: 1.25rem;
}

.saved-right {
  display: grid;
  grid-template-columns: auto auto auto;
  align-items: start;
  gap: 12px;
}

.value-col {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.value-col span {
  font-size: 0.75rem;
  color: #848ba2;
}

.value-col strong {
  font-size: 1rem;
}

.remove-btn {
  border: 0;
  background: transparent;
  color: #a0a7bb;
  cursor: pointer;
  padding: 2px;
}

.form-card {
  margin-top: 10px;
  padding: 12px;
}

.form-row {
  width: 100%;
  border: 0;
  margin: 0;
  display: grid;
  grid-template-columns: 82px 1fr;
  align-items: center;
  min-height: 54px;
  background: #f7f8fc;
  border-radius: 8px;
  padding: 0 10px;
  text-align: left;
  cursor: pointer;
}

.form-row + .form-row {
  margin-top: 10px;
}

.label {
  font-size: 1rem;
  color: #19203a;
  font-weight: 600;
}

.value {
  color: #a0a7bb;
  font-size: 1rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.add-wrap {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
}

.bottom-panel {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: calc(66px + env(safe-area-inset-bottom));
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-popup {
  padding: 14px;
}

.popup-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 8px;
}
</style>

