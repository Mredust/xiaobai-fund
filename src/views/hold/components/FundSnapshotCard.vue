<script setup lang="ts">
import { computed } from 'vue'
import type { PositionInfo } from '@/stores/funds'

const props = defineProps<{
  name: string
  code: string
  nav: number
  changePercent: number
  dateText: string
  position?: PositionInfo | null
  showPosition?: boolean
}>()

const changeText = computed(() => {
  // 统一输出基金涨跌幅文本。
  return `${props.changePercent >= 0 ? '+' : ''}${props.changePercent.toFixed(2)}%`
})
</script>

<template>
  <section class="fund-snapshot card">
    <div class="fund-title-row">
      <strong>{{ name }}</strong>
      <span>{{ code }}</span>
    </div>

    <div class="fund-nav-row">
      <span>最新净值 ({{ dateText }})：</span>
      <strong>{{ nav.toFixed(4) }}</strong>
      <strong :class="changePercent >= 0 ? 'up' : 'down'">{{ changeText }}</strong>
    </div>

    <div v-if="showPosition && position" class="position-grid">
      <div class="grid-item">
        <span>持有金额</span>
        <strong>{{ position.amount }}</strong>
      </div>
      <div class="grid-item">
        <span>持有收益</span>
        <strong :class="Number(position.profit) >= 0 ? 'up' : 'down'">{{ position.profit }}</strong>
      </div>
      <div class="grid-item">
        <span>持有天数</span>
        <strong>{{ position.holdingDays }}</strong>
      </div>
    </div>
  </section>
</template>

<style scoped>
.fund-snapshot {
  padding: 12px;
}

.fund-title-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.fund-title-row strong {
  font-size: 1.125rem;
  line-height: 1.2;
}

.fund-title-row span {
  font-size: 0.875rem;
  color: #6e7489;
}

.fund-nav-row {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  color: #71788e;
}

.fund-nav-row strong {
  font-size: 1rem;
  color: #20253a;
}

.position-grid {
  margin-top: 12px;
  border-top: 1px solid var(--line);
  padding-top: 10px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.grid-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.grid-item span {
  font-size: 0.8125rem;
  color: #7c8398;
}

.grid-item strong {
  font-size: 1.25rem;
  line-height: 1.1;
}
</style>


