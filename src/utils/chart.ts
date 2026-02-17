import type { WatchFundItem } from '@/stores/funds'

export const buildMiniTrendPath = (seed: number, funds: WatchFundItem[]) => {
  const width = 168
  const height = 54

  const values = Array.from({ length: 42 }, (_, index) => {
    const base = funds.reduce((sum, item) => sum + item.dailyChange * 0.8 + item.nav * 0.05, seed * 0.12)
    const waveA = Math.sin((index + seed) * 0.35) * 1.2
    const waveB = Math.cos((index + base) * 0.17) * 0.7
    return base * 0.03 + waveA + waveB
  })

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const points = values.map((value, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * width
    const y = ((max - value) / range) * height
    return { x, y }
  })

  if (points.length < 2) {
    return ''
  }

  const pointAt = (index: number) => {
    const safeIndex = Math.min(Math.max(index, 0), points.length - 1)
    return points[safeIndex] as { x: number; y: number }
  }

  // Smooth the trend with Catmull-Rom converted to cubic Bezier segments.
  const first = pointAt(0)
  let path = `M${first.x.toFixed(2)},${first.y.toFixed(2)}`

  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = pointAt(index - 1)
    const p1 = pointAt(index)
    const p2 = pointAt(index + 1)
    const p3 = pointAt(index + 2)

    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    path += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`
  }

  return path
}
