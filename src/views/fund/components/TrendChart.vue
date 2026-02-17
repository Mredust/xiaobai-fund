<script setup lang="ts">
import { computed } from 'vue'

interface TrendPoint {
  x: number
  y: number
}

type AxisLabelNode = {
  text: string
  left: string
  className: 'start' | 'middle' | 'end'
}

const props = withDefaults(
  defineProps<{
    points: TrendPoint[]
    color?: string
    xAxisLabels?: string[]
  }>(),
  {
    color: '#2c77f4',
    xAxisLabels: () => []
  }
)

const viewWidth = 320
const viewHeight = 180
const gradientId = `trend-area-${Math.random().toString(36).slice(2, 9)}`

const normalized = computed(() => {
  // 将原始点数据映射到 SVG 视图坐标系。
  if (!props.points.length) {
    return [] as Array<{ x: number; y: number }>
  }

  const minY = Math.min(...props.points.map((item) => item.y))
  const maxY = Math.max(...props.points.map((item) => item.y))
  const range = maxY - minY || 1

  return props.points.map((item, index) => ({
    x: (index / Math.max(props.points.length - 1, 1)) * viewWidth,
    y: ((maxY - item.y) / range) * viewHeight
  }))
})

const linePath = computed(() => {
  // 拼接折线路径字符串用于渲染走势图。
  if (!normalized.value.length) {
    return ''
  }

  return normalized.value
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)},${point.y.toFixed(2)}`)
    .join(' ')
})

const areaPath = computed(() => {
  // 在折线下方补齐闭合区域，实现渐变填充。
  if (!normalized.value.length) {
    return ''
  }

  const line = linePath.value
  return `${line} L ${viewWidth},${viewHeight} L 0,${viewHeight} Z`
})

const axisLabels = computed<AxisLabelNode[]>(() => {
  // 生成 X 轴标签定位，保证两端贴边、中间居中。
  const list = props.xAxisLabels.filter((item) => item?.trim())
  if (!list.length) {
    return []
  }

  return list.map((text, index) => {
    if (index === 0) {
      return { text, left: '0%', className: 'start' as const }
    }

    if (index === list.length - 1) {
      return { text, left: '100%', className: 'end' as const }
    }

    const left = `${(index / (list.length - 1)) * 100}%`
    return { text, left, className: 'middle' as const }
  })
})
</script>

<template>
  <div class="trend-chart">
    <svg :viewBox="`0 0 ${viewWidth} ${viewHeight}`" preserveAspectRatio="none">
      <defs>
        <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="color" stop-opacity="0.28" />
          <stop offset="100%" :stop-color="color" stop-opacity="0.03" />
        </linearGradient>
      </defs>

      <path v-if="areaPath" :d="areaPath" :fill="`url(#${gradientId})`" />
      <path v-if="linePath" :d="linePath" :stroke="color" stroke-width="2" fill="none" />
    </svg>

    <div v-if="axisLabels.length" class="x-axis-row">
      <span
        v-for="item in axisLabels"
        :key="`${item.left}-${item.text}`"
        class="x-axis-label"
        :class="`is-${item.className}`"
        :style="{ left: item.left }"
      >
        {{ item.text }}
      </span>
    </div>

    <van-empty v-if="!points.length" image="error" description="暂无走势图数据" />
  </div>
</template>

<style scoped>
.trend-chart {
  width: 100%;
  min-height: 180px;
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
}

svg {
  display: block;
  width: 100%;
  height: 180px;
}

.x-axis-row {
  position: relative;
  height: 22px;
  padding: 2px 10px 8px;
  box-sizing: border-box;
}

.x-axis-label {
  position: absolute;
  top: 2px;
  font-size: 0.75rem;
  line-height: 1;
  color: #7d8498;
  white-space: nowrap;
}

.x-axis-label.is-start {
  transform: translateX(0);
  text-align: left;
}

.x-axis-label.is-middle {
  transform: translateX(-50%);
  text-align: center;
}

.x-axis-label.is-end {
  transform: translateX(-100%);
  text-align: right;
}

:deep(.van-empty) {
  padding: 24px 0;
}
</style>

