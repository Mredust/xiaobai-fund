import type { WatchFundItem } from '@/stores/funds'

export const buildMiniTrendPath = (seed: number, funds: WatchFundItem[]) => {
  // 根据标签和基金数据生成稳定的迷你走势图路径。
  const width = 168
  const height = 54
  const points = Array.from({ length: 42 }, (_, index) => {
    const base = funds.reduce((sum, item) => sum + item.dailyChange * 0.8 + item.nav * 0.05, seed * 0.12)
    const waveA = Math.sin((index + seed) * 0.35) * 1.2
    const waveB = Math.cos((index + base) * 0.17) * 0.7
    return base * 0.03 + waveA + waveB
  })

  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1

  return points
    .map((value, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * width
      const y = ((max - value) / range) * height
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
}
