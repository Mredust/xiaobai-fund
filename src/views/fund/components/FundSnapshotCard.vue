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
  plainNav?: boolean
}>()

const changeText = computed(() => {
  // 统一输出基金涨跌幅文本。
  if (props.changePercent === 0) {
    return '0.00%'
  }
  return `${props.changePercent > 0 ? '+' : ''}${props.changePercent.toFixed(2)}%`
})

const changeClass = computed(() => {
  if (props.changePercent > 0) {
    return 'up'
  }
  if (props.changePercent < 0) {
    return 'down'
  }
  return 'flat'
})

const navText = computed(() => {
  const value = Number(props.nav)
  return Number.isFinite(value) && value > 0 ? value.toFixed(4) : '--'
})

const positionProfitClass = computed(() => {
  const value = Number(props.position?.profit || 0)
  if (!Number.isFinite(value) || value === 0) {
    return 'flat'
  }
  return value > 0 ? 'up' : 'down'
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
      <span class="nav-value" :class="{ plain: plainNav }">{{ navText }}</span>
      <span class="change-value" :class="changeClass">{{ changeText }}</span>
    </div>

    <div v-if="showPosition && position" class="position-grid">
      <div class="grid-item">
        <span>持有金额</span>
        <strong>{{ position.amount }}</strong>
      </div>
      <div class="grid-item">
        <span>持有收益</span>
        <strong :class="positionProfitClass">{{ position.profit }}</strong>
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

.nav-value {
  font-size: 1rem;
  color: #20253a;
  font-weight: 600;
}

.nav-value.plain {
  font-weight: 400;
  color: #71788e;
}

.change-value {
  font-size: 1rem;
  font-weight: 600;
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

.up {
  color: #e34a4a;
}

.down {
  color: #22a06b;
}

.flat {
  color: #b9bfcc;
}
</style>


