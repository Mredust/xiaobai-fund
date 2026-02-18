import type { FundDetailResult, FundHoldingItem, FundTrendPoint, SearchFundResult } from '@/types/fund'
export type { FundDetailResult, FundHoldingItem, FundTrendPoint, SearchFundResult } from '@/types/fund'

interface EastSearchItem {
  CODE?: string
  FCODE?: string
  NAME?: string
  SHORTNAME?: string
  CATEGORY?: number | string
  CATEGORYDESC?: string
}

export interface FundEstimateSnapshot {
  code: string
  name: string
  dwjz: number
  gsz: number
  gztime: string
  gszzl: number
}

interface FundLatestNavSnapshot {
  code: string
  dwjz: number
  gszzl: number
  gztime: string
}

const toNumber = (value: unknown, fallback = 0) => {
  // 统一处理接口中的字符串数字，避免 NaN 影响渲染。
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

let estimateRequestQueue = Promise.resolve()

const runEstimateTask = <T>(task: () => Promise<T>) => {
  // fundgz 固定走 window.jsonpgz，全局串行避免并发覆盖回调。
  const next = estimateRequestQueue.then(task, task)
  estimateRequestQueue = next.then(
    () => undefined,
    () => undefined
  )
  return next
}

const loadScript = (url: string) => {
  // 通过动态 script 注入执行 JSONP/脚本接口，规避浏览器跨域限制。
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = url
    script.async = true
    script.onload = () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
      resolve()
    }
    script.onerror = () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
      reject(new Error('脚本加载失败'))
    }
    document.body.appendChild(script)
  })
}

const getTencentPrefix = (code: string) => {
  // 根据股票代码推断行情市场前缀。
  if (code.startsWith('6') || code.startsWith('9')) {
    return 'sh'
  }
  if (code.startsWith('0') || code.startsWith('3')) {
    return 'sz'
  }
  if (code.startsWith('4') || code.startsWith('8')) {
    return 'bj'
  }
  return 'sz'
}

const parseFundArchiveRows = (html: string) => {
  // 从东方财富 F10 表格 HTML 中提取重仓持股列表。
  const rows = html.match(/<tr[\s\S]*?<\/tr>/gi) || []
  const holdings: FundHoldingItem[] = []

  for (const row of rows) {
    const cells = (row.match(/<td[\s\S]*?>([\s\S]*?)<\/td>/gi) || []).map((cell) =>
      cell.replace(/<[^>]*>/g, '').trim()
    )
    const codeIndex = cells.findIndex((txt) => /^\d{6}$/.test(txt))
    const weightIndex = cells.findIndex((txt) => /\d+(?:\.\d+)?\s*%/.test(txt))

    if (codeIndex >= 0 && weightIndex >= 0) {
      holdings.push({
        code: cells[codeIndex] || '',
        name: cells[codeIndex + 1] || '',
        weight: cells[weightIndex] || '',
        change: null
      })
    }
  }

  return holdings.slice(0, 10)
}

const appendHoldingChange = async (holdings: FundHoldingItem[]) => {
  // 拉取腾讯行情并回填每只重仓股的当日涨跌幅。
  if (!holdings.length) {
    return
  }

  const tencentCodes = holdings.map((item) => `s_${getTencentPrefix(item.code)}${item.code}`).join(',')
  const quoteUrl = `https://qt.gtimg.cn/q=${tencentCodes}`

  await new Promise<void>((resolve) => {
    const script = document.createElement('script')
    script.src = quoteUrl
    script.onload = () => {
      holdings.forEach((item) => {
        const varName = `v_s_${getTencentPrefix(item.code)}${item.code}`
        const source = window[varName]

        if (typeof source === 'string') {
          const parts = source.split('~')
          if (parts.length > 5) {
            item.change = toNumber(parts[5], 0)
          }
        }
      })

      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
      resolve()
    }
    script.onerror = () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
      resolve()
    }
    document.body.appendChild(script)
  })
}

const buildHeatRank = (code: string) => {
  // 生成稳定的热度排名占位数据，保证不同基金展示差异。
  const suffix = toNumber(code.slice(-3), 1)
  const heatTotal = 25515
  const heatRank = (suffix % 300) + 1
  return { heatRank, heatTotal }
}

const buildYearChange = (historyTrend: FundTrendPoint[]) => {
  // 用历史净值首尾值估算近一年涨跌幅。
  if (historyTrend.length < 2) {
    return 0
  }
  const last = historyTrend[historyTrend.length - 1]
  const firstIndex = Math.max(historyTrend.length - 240, 0)
  const first = historyTrend[firstIndex]

  if (!first || !last || first.y === 0) {
    return 0
  }

  return ((last.y - first.y) / first.y) * 100
}

const fetchLatestNavByCode = async (code: string) => {
  // fundgz 无估值时，回退到 FundMNHisNetList 读取最近净值与涨跌幅。
  const fundCode = String(code || '').trim()
  if (!fundCode) {
    return null
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)

  try {
    const url = `https://fundmobapi.eastmoney.com/FundMNewApi/FundMNHisNetList?FCODE=${fundCode}&pageIndex=1&pageSize=1&deviceid=Wap&plat=Wap&product=EFund&version=2.0.0&_=${Date.now()}`
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as {
      Datas?: Array<{ FSRQ?: string; DWJZ?: string; JZZZL?: string }>
    }
    const row = payload?.Datas?.[0]
    if (!row) {
      return null
    }

    return {
      code: fundCode,
      dwjz: toNumber(row.DWJZ, 0),
      gszzl: toNumber(row.JZZZL, 0),
      gztime: row.FSRQ ? `${String(row.FSRQ)} 15:00` : ''
    } as FundLatestNavSnapshot
  } catch (error) {
    console.error(error)
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

const fetchFundEstimateByCode = async (code: string) => {
  // 拉取单只基金实时估值快照，供列表页批量刷新复用。
  const fundCode = String(code || '').trim()
  if (!fundCode) {
    return null
  }

  return runEstimateTask(
    () =>
      new Promise<FundEstimateSnapshot>((resolve, reject) => {
        const gzUrl = `https://fundgz.1234567.com.cn/js/${fundCode}.js?rt=${Date.now()}`
        const script = document.createElement('script')
        const origin = window.jsonpgz
        let settled = false

        const cleanup = () => {
          window.jsonpgz = origin
          if (document.body.contains(script)) {
            document.body.removeChild(script)
          }
        }

        const finalize = () => {
          if (settled) {
            return false
          }
          settled = true
          cleanup()
          return true
        }

        const resolveByLatestNav = async () => {
          const fallback = await fetchLatestNavByCode(fundCode)
          if (fallback) {
            resolve({
              code: fallback.code,
              name: `基金${fundCode}`,
              dwjz: fallback.dwjz,
              gsz: fallback.dwjz,
              gztime: fallback.gztime,
              gszzl: fallback.gszzl
            })
            return
          }
          reject(new Error(`基金估值数据为空: ${fundCode}`))
        }

        window.jsonpgz = async (json: unknown) => {
          if (!finalize()) {
            return
          }

          if (!json || typeof json !== 'object') {
            await resolveByLatestNav()
            return
          }

          const payload = json as {
            fundcode?: string
            name?: string
            dwjz?: string
            gsz?: string
            gztime?: string
            gszzl?: string
          }

          const dwjz = toNumber(payload.dwjz, 0)
          const gsz = toNumber(payload.gsz, 0)
          const gszzl = toNumber(payload.gszzl, 0)
          const gztime = String(payload.gztime || '')
          const hasEstimate = dwjz > 0 || gsz > 0 || gztime.length > 0

          if (!hasEstimate) {
            await resolveByLatestNav()
            return
          }

          resolve({
            code: String(payload.fundcode || fundCode),
            name: String(payload.name || `基金${fundCode}`),
            dwjz,
            gsz,
            gztime,
            gszzl
          })
        }

        script.src = gzUrl
        script.onerror = async () => {
          if (!finalize()) {
            return
          }
          await resolveByLatestNav()
        }
        document.body.appendChild(script)

        setTimeout(async () => {
          if (!finalize()) {
            return
          }
          await resolveByLatestNav()
        }, 8000)
      })
  )
}

/**
 * 批量获取基金实时估值快照。
 * 用途：根据基金代码数组批量查询涨跌幅、净值、估值时间等列表字段。
 */
export const fetchFundEstimatesBatch = async (codes: string[]) => {
  // 对入参去重清洗，保持与 real-time-fund 的 code 数组处理方式一致。
  const uniqueCodes = Array.from(
    new Set(
      (codes || [])
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    )
  )

  const snapshots = new Map<string, FundEstimateSnapshot>()
  for (const code of uniqueCodes) {
    try {
      const snapshot = await fetchFundEstimateByCode(code)
      if (snapshot) {
        snapshots.set(code, snapshot)
      }
    } catch {
      // 单只失败不影响列表其它基金刷新。
    }
  }

  return snapshots
}

/**
 * 搜索基金列表。
 * 用途：根据基金名称/代码关键字获取候选基金，用于基金搜索页和选择转入基金场景。
 */
export const searchFunds = async (keyword: string) => {
  // 调用 real-time-fund 使用的东方财富 JSONP 搜索接口。
  const value = String(keyword || '').trim()
  if (!value) {
    return [] as SearchFundResult[]
  }

  const callbackName = `SuggestData_${Date.now()}_${Math.floor(Math.random() * 1000)}`
  const url = `https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx?m=1&key=${encodeURIComponent(
    value
  )}&callback=${callbackName}&_=${Date.now()}`

  try {
    const list = await new Promise<EastSearchItem[]>((resolve, reject) => {
      ;(window as Record<string, unknown>)[callbackName] = (payload: { Datas?: EastSearchItem[] }) => {
        // 只保留基金类型，过滤股票等其它类别。
        const rows = payload?.Datas || []
        const fundsOnly = rows.filter(
          (item) =>
            item.CATEGORY === 700 ||
            item.CATEGORY === '700' ||
            String(item.CATEGORYDESC || '').includes('基金')
        )
        delete (window as Record<string, unknown>)[callbackName]
        resolve(fundsOnly)
      }

      const script = document.createElement('script')
      script.src = url
      script.async = true
      script.onload = () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script)
        }
      }
      script.onerror = () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script)
        }
        delete (window as Record<string, unknown>)[callbackName]
        reject(new Error('搜索请求失败'))
      }
      document.body.appendChild(script)

      // 给 JSONP 一个超时兜底，避免回调未触发时页面卡住。
      setTimeout(() => {
        if ((window as Record<string, unknown>)[callbackName]) {
          delete (window as Record<string, unknown>)[callbackName]
          reject(new Error('搜索请求超时'))
        }
      }, 8000)
    })

    return list
      .map((item) => ({
        code: String(item.CODE || item.FCODE || '').trim(),
        name: String(item.NAME || item.SHORTNAME || '').trim()
      }))
      .filter((item) => item.code && item.name)
      .slice(0, 30)
  } catch (error) {
    console.error(error)
    return []
  }
}

/**
 * 获取基金详情数据。
 * 用途：加载基金详情页、持仓编辑页等场景所需的估值、持仓、历史走势数据。
 */
export const fetchFundData = async (code: string) => {
  // 拉取基金估值 + 持仓 + 历史净值，数据结构对齐 real-time-fund 的接口能力。
  const fundCode = String(code || '').trim()
  if (!fundCode) {
    throw new Error('基金代码不能为空')
  }

  const snapshot = await fetchFundEstimateByCode(fundCode)
  if (!snapshot) {
    throw new Error('基金估值数据为空')
  }

  let holdings: FundHoldingItem[] = []
  try {
    // 调用东方财富基金档案接口解析重仓列表。
    const holdingsUrl = `https://fundf10.eastmoney.com/FundArchivesDatas.aspx?type=jjcc&code=${fundCode}&topline=10&year=&month=&rt=${Date.now()}`
    await loadScript(holdingsUrl)
    const html = window.apidata?.content || ''
    holdings = parseFundArchiveRows(html)
    await appendHoldingChange(holdings)
  } catch (error) {
    console.error(error)
  }

  let historyTrend: FundTrendPoint[] = []
  try {
    // 调用 pingzhongdata 获取净值趋势，供详情图和交易日数据使用。
    const pingUrl = `https://fund.eastmoney.com/pingzhongdata/${fundCode}.js?v=${Date.now()}`
    await loadScript(pingUrl)
    const trend = Array.isArray(window.Data_netWorthTrend) ? window.Data_netWorthTrend : []

    historyTrend = trend.slice(-365).map((item) => ({
      x: toNumber(item.x, Date.now()),
      y: toNumber(item.y, 0),
      equityReturn: item.equityReturn == null ? null : toNumber(item.equityReturn, 0)
    }))
  } catch (error) {
    console.error(error)
  }

  const { heatRank, heatTotal } = buildHeatRank(fundCode)

  return {
    code: snapshot.code || fundCode,
    name: snapshot.name || `基金 ${fundCode}`,
    dwjz: toNumber(snapshot.dwjz, 0),
    gsz: toNumber(snapshot.gsz, 0),
    gztime: snapshot.gztime || '',
    gszzl: toNumber(snapshot.gszzl, 0),
    yearChange: buildYearChange(historyTrend),
    heatRank,
    heatTotal,
    holdings,
    historyTrend
  } as FundDetailResult
}

