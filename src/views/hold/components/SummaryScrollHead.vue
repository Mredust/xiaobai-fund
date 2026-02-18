<script setup lang="ts">
import { formatSignedNumber } from '@/utils/format'

withDefaults(
  defineProps<{
    summaryAsset: number
    summaryDayProfit: number
    fixed?: boolean
  }>(),
  {
    fixed: false
  }
)
</script>

<template>
  <div class="summary-scroll-head" :class="{ 'is-fixed': fixed }">
    <div class="summary-box">
      <div class="summary-col">
        <span class="summary-label">账户资产</span>
        <strong class="summary-value">{{ summaryAsset.toFixed(2) }}</strong>
      </div>
      <div class="summary-col right">
        <span class="summary-label">当日总收益</span>
        <strong class="summary-value" :class="summaryDayProfit >= 0 ? 'up' : 'down'">
          {{ formatSignedNumber(summaryDayProfit) }}
        </strong>
      </div>
    </div>
  </div>

  <div v-if="fixed" class="summary-scroll-head summary-scroll-head-placeholder" aria-hidden="true">
    <div class="summary-box">
      <div class="summary-col">
        <span class="summary-label">账户资产</span>
        <strong class="summary-value">0.00</strong>
      </div>
      <div class="summary-col right">
        <span class="summary-label">当日总收益</span>
        <strong class="summary-value">+0.00</strong>
      </div>
    </div>
  </div>
</template>

<style scoped>
.summary-scroll-head {
  border-bottom: 1px solid var(--line);
}

.summary-scroll-head.is-fixed {
  position: fixed;
  left: 0;
  right: 0;
  top: calc(var(--layout-header-height) + var(--holdings-top-height, 56px) - 9px);
  z-index: 17;
}

.summary-scroll-head-placeholder {
  visibility: hidden;
  pointer-events: none;
}

.summary-box {
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 24px;
  background-color: white;
}

.summary-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.summary-col.right {
  align-items: flex-end;
}

.summary-label {
  font-size: 0.8rem;
  color: #6f6280;
  opacity: 0.7;
  margin-bottom: 5px;
}

.summary-value {
  font-size: 1.5rem;
  line-height: 1;
  font-weight: 4;
}
</style>
