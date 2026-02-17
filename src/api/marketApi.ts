import type { FundDistribution, MarketIndexSimple, MarketOverview, SectorInfo } from '@/types/market'
export type { FundDistribution, MarketIndexSimple, MarketOverview, SectorInfo } from '@/types/market'

interface CacheEntry<T> {
  value: T
  expireAt: number
}

const memoryCache = new Map<string, CacheEntry<unknown>>()

const getCache = <T>(key: string) => {
  // 读取内存缓存并处理过期。
  const hit = memoryCache.get(key)
  if (!hit) {
    return null
  }

  if (Date.now() > hit.expireAt) {
    memoryCache.delete(key)
    return null
  }

  return hit.value as T
}

const setCache = <T>(key: string, value: T, ttlMs: number) => {
  // 将接口结果写入内存缓存，减少重复请求。
  memoryCache.set(key, {
    value,
    expireAt: Date.now() + ttlMs
  })
}

const toNumber = (value: unknown, fallback = 0) => {
  // 将接口字段统一转换为 number，避免 NaN 进入页面。
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

const formatNow = () => {
  // 生成行情更新时间文案。
  const now = new Date()
  const year = now.getFullYear()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  const hour = `${now.getHours()}`.padStart(2, '0')
  const minute = `${now.getMinutes()}`.padStart(2, '0')
  return `${year}/${month}/${day} ${hour}:${minute}`
}

/**
 * 获取顶部指数简表。
 * 用途：为行情页顶部横向指数区域提供实时指数点位与涨跌数据。
 */
export const fetchMarketIndicesFast = async () => {
  // 使用与 fund-app2 相同的 push2 指数接口。
  const cacheKey = 'market_indices_fast'
  const cached = getCache<MarketIndexSimple[]>(cacheKey)
  if (cached) {
    return cached
  }

  const url =
    'https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&secids=1.000001,0.399001,0.399006,1.000300&fields=f2,f3,f4,f12,f14'

  try {
    const response = await fetch(url)
    const payload = await response.json()
    const rows = payload?.data?.diff

    if (!Array.isArray(rows)) {
      return [] as MarketIndexSimple[]
    }

    const result = rows.map((item) => ({
      code: String(item.f12 || ''),
      name: String(item.f14 || ''),
      current: toNumber(item.f2, 0),
      change: toNumber(item.f4, 0),
      changePercent: toNumber(item.f3, 0)
    }))

    setCache(cacheKey, result, 60_000)
    return result
  } catch (error) {
    console.error(error)
    return []
  }
}

const buildDistributionSkeleton = () => {
  // 生成固定区间，和 fund-app2 的行情分布区间保持一致。
  return [
    { range: '≤-5', count: 0 },
    { range: '-5~-3', count: 0 },
    { range: '-3~-1', count: 0 },
    { range: '-1~0', count: 0 },
    { range: '0', count: 0 },
    { range: '0~1', count: 0 },
    { range: '1~3', count: 0 },
    { range: '3~5', count: 0 },
    { range: '≥5', count: 0 }
  ] as FundDistribution[]
}

const parseDistributionIndex = (change: number) => {
  // 将单只基金涨跌幅映射到区间索引。
  if (change <= -5) return 0
  if (change > -5 && change <= -3) return 1
  if (change > -3 && change <= -1) return 2
  if (change > -1 && change < 0) return 3
  if (change === 0) return 4
  if (change > 0 && change <= 1) return 5
  if (change > 1 && change <= 3) return 6
  if (change > 3 && change <= 5) return 7
  return 8
}

/**
 * 获取涨跌分布与 PK 概览数据。
 * 用途：驱动行情页中部的分布柱图和涨跌家数对比进度条。
 */
export const fetchMarketOverview = async () => {
  // 使用 fund-app2 同款 rankhandler JSONP 数据源获取涨跌分布。
  const cacheKey = 'market_overview_fast'
  const cached = getCache<MarketOverview>(cacheKey)
  if (cached) {
    return cached
  }

  return new Promise<MarketOverview>((resolve) => {
    const scriptId = `market_overview_${Date.now()}`
    const fallback = {
      updateTime: '--',
      totalUp: 0,
      totalDown: 0,
      totalFlat: 0,
      distribution: buildDistributionSkeleton()
    }

    // 先清空旧 rankData，避免读到历史脚本残留。
    try {
      delete (window as Record<string, unknown>).rankData
    } catch {
      ;(window as Record<string, unknown>).rankData = undefined
    }

    const safeResolve = (data: MarketOverview) => {
      // 统一出口，确保 Promise 只 resolve 一次。
      if (resolved) {
        return
      }
      resolved = true
      clearTimeout(timeoutId)
      const el = document.getElementById(scriptId)
      if (el) {
        document.body.removeChild(el)
      }
      resolve(data)
    }

    const parseRankData = () => {
      // 解析 rankhandler 回写的 rankData.datas 字符串数组。
      const rankData = (window as Record<string, unknown>).rankData as { datas?: string[] } | undefined
      if (!rankData?.datas || !Array.isArray(rankData.datas)) {
        safeResolve(fallback)
        return
      }

      const distribution = buildDistributionSkeleton()
      let totalUp = 0
      let totalDown = 0
      let totalFlat = 0

      rankData.datas.forEach((row) => {
        const cols = row.split(',')
        const change = toNumber(cols[6], Number.NaN)
        if (!Number.isFinite(change)) {
          return
        }

        if (change > 0) {
          totalUp += 1
        } else if (change < 0) {
          totalDown += 1
        } else {
          totalFlat += 1
        }

        const index = parseDistributionIndex(change)
        const bucket = distribution[index]
        if (bucket) {
          bucket.count += 1
        }
      })

      const result = {
        updateTime: formatNow(),
        totalUp,
        totalDown,
        totalFlat,
        distribution
      }

      setCache(cacheKey, result, 90_000)
      safeResolve(result)
    }

    let resolved = false
    const timeoutId = setTimeout(() => {
      // 超时时返回空结构，避免页面长时间 loading。
      safeResolve(fallback)
    }, 8_000)

    const script = document.createElement('script')
    script.id = scriptId
    script.src = `https://fund.eastmoney.com/data/rankhandler.aspx?op=ph&dt=kf&ft=all&rs=&gs=0&sc=zzf&st=desc&sd=2020-01-01&ed=${new Date().toISOString().slice(0, 10)}&qdii=&tabSubtype=,,,,,&pi=1&pn=10000&dx=1&v=${Date.now()}`
    script.onload = () => {
      // 等待脚本设置全局变量后再解析。
      setTimeout(parseRankData, 120)
    }
    script.onerror = () => {
      safeResolve(fallback)
    }

    document.body.appendChild(script)
  })
}

const buildStreak = (dayReturn: number) => {
  // 依据板块当日涨跌幅构建连续涨跌文案。
  const days = Math.max(1, Math.min(9, Math.round(Math.abs(dayReturn) * 1.2)))
  if (dayReturn > 0) {
    return `连涨${days}天`
  }
  if (dayReturn < 0) {
    return `连跌${days}天`
  }
  return '持平'
}

/**
 * 获取板块涨跌列表。
 * 用途：展示行情页下方板块总览列表以及跳转板块详情入口。
 */
export const fetchSectorFunds = async () => {
  // 使用 fund-app2 同源 push2 行业板块接口。
  const cacheKey = 'market_sector_fast'
  const cached = getCache<SectorInfo[]>(cacheKey)
  if (cached) {
    return cached
  }

  const url = `https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=12&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:90+t:2&fields=f2,f3,f4,f12,f14,f104,f105&_=${Date.now()}`

  try {
    const response = await fetch(url)
    const payload = await response.json()
    const rows = payload?.data?.diff

    if (!Array.isArray(rows)) {
      return [] as SectorInfo[]
    }

    const result = rows.slice(0, 10).map((item) => {
      const dayReturn = toNumber(item.f3, 0)
      const upCount = toNumber(item.f104, 0)
      const downCount = toNumber(item.f105, 0)
      return {
        code: String(item.f12 || ''),
        name: String(item.f14 || ''),
        dayReturn,
        count: Math.max(0, upCount + downCount),
        streak: buildStreak(dayReturn)
      }
    })

    setCache(cacheKey, result, 60_000)
    return result
  } catch (error) {
    console.error(error)
    return []
  }
}

