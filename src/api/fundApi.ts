export interface SearchFundResult {
  code: string
  name: string
}

export interface FundHoldingItem {
  code: string
  name: string
  weight: string
  change: number | null
}

export interface FundTrendPoint {
  x: number
  y: number
  equityReturn: number | null
}

export interface FundDetailResult {
  code: string
  name: string
  dwjz: number
  gsz: number
  gztime: string
  gszzl: number
  yearChange: number
  heatRank: number
  heatTotal: number
  holdings: FundHoldingItem[]
  historyTrend: FundTrendPoint[]
}

interface EastSearchItem {
  CODE?: string
  FCODE?: string
  NAME?: string
  SHORTNAME?: string
  CATEGORY?: number | string
  CATEGORYDESC?: string
}

const toNumber = (value: unknown, fallback = 0) => {
  // 统一处理接口中的字符串数字，避免 NaN 影响渲染。
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
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

export const fetchFundData = async (code: string) => {
  // 拉取基金估值 + 持仓 + 历史净值，数据结构对齐 real-time-fund 的接口能力。
  const fundCode = String(code || '').trim()
  if (!fundCode) {
    throw new Error('基金代码不能为空')
  }

  const gzPayload = await new Promise<{
    fundcode: string
    name: string
    dwjz: string
    gsz: string
    gztime: string
    gszzl: string
  }>((resolve, reject) => {
    const gzUrl = `https://fundgz.1234567.com.cn/js/${fundCode}.js?rt=${Date.now()}`
    const script = document.createElement('script')
    const origin = window.jsonpgz

    window.jsonpgz = (json: unknown) => {
      // 回调完成后恢复原始 jsonpgz，防止污染全局函数。
      window.jsonpgz = origin
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }

      if (!json || typeof json !== 'object') {
        reject(new Error('基金估值数据为空'))
        return
      }

      resolve(json as { fundcode: string; name: string; dwjz: string; gsz: string; gztime: string; gszzl: string })
    }

    script.src = gzUrl
    script.onerror = () => {
      window.jsonpgz = origin
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
      reject(new Error('基金估值加载失败'))
    }
    document.body.appendChild(script)

    setTimeout(() => {
      if (document.body.contains(script)) {
        window.jsonpgz = origin
        document.body.removeChild(script)
        reject(new Error('基金估值请求超时'))
      }
    }, 8000)
  })

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
    code: gzPayload.fundcode || fundCode,
    name: gzPayload.name || `基金 ${fundCode}`,
    dwjz: toNumber(gzPayload.dwjz, 0),
    gsz: toNumber(gzPayload.gsz, 0),
    gztime: gzPayload.gztime || '',
    gszzl: toNumber(gzPayload.gszzl, 0),
    yearChange: buildYearChange(historyTrend),
    heatRank,
    heatTotal,
    holdings,
    historyTrend
  } as FundDetailResult
}
