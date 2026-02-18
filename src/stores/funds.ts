import { defineStore } from 'pinia'
import { fetchFundEstimatesBatch } from '@/api/fundApi'

export interface WatchFundItem {
  id: number
  name: string
  code: string
  dailyChange: number
  nav: number
  estimateTime?: string
  estimateNav?: number
  lastNav?: number
  boardName: string
  boardChange: number
  monthChange?: number
}

export interface SectorFundItem {
  code: string
  name: string
  dailyChange: number
  monthChange: number
}

export interface SectorItem {
  id: number
  name: string
  trend: number
  count: number
  funds: SectorFundItem[]
}

export interface SearchHistoryItem {
  code: string
  name: string
}

export interface PositionInfo {
  amount: string
  ratio: string
  cost: string
  profit: string
  profitRate: string
  holdingDays: string
  yesterdayProfit: string
  yesterdayProfitRate: string
}

export interface ManualImportItem {
  id: number
  code: string
  name: string
  amount: number
  profit: number
}

const initialWatchFunds: WatchFundItem[] = []

const initialSectors: SectorItem[] = [
  {
    id: 1,
    name: '半导体材料设备',
    trend: 1.92,
    count: 8,
    funds: [
      { code: '017811', name: '东方人工智能主题混合C', dailyChange: 2.81, monthChange: 7.65 },
      { code: '007639', name: '汇添富竞争优势灵活配置混合', dailyChange: 2.56, monthChange: 8.97 },
      { code: '013841', name: '银华集成电路混合C', dailyChange: 2.54, monthChange: 8.84 },
      { code: '007491', name: '南方信息创新混合C', dailyChange: 2.31, monthChange: 10.07 }
    ]
  },
  {
    id: 2,
    name: 'AI 算力',
    trend: 0.92,
    count: 16,
    funds: [
      { code: '017811', name: '东方人工智能主题混合C', dailyChange: 1.31, monthChange: 5.12 },
      { code: '008888', name: '华夏数字经济混合A', dailyChange: 1.08, monthChange: 3.47 }
    ]
  },
  {
    id: 3,
    name: '黄金股',
    trend: -3.33,
    count: 12,
    funds: [
      { code: '001302', name: '前海开源金银珠宝混合A', dailyChange: -2.9, monthChange: 4.33 },
      { code: '001467', name: '华富永鑫灵活配置混合C', dailyChange: -2.75, monthChange: 5.01 }
    ]
  },
  {
    id: 4,
    name: '通信设备',
    trend: -0.78,
    count: 18,
    funds: [
      { code: '020465', name: '招商中证半导体产业ETF联接', dailyChange: 0.77, monthChange: 2.33 },
      { code: '014855', name: '嘉实中证半导体产业指数', dailyChange: 0.77, monthChange: 2.41 }
    ]
  }
]

const toNumber = (value: string | number) => {
  // 将输入值转成 number，非法输入回退为 0。
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

export const useFundStore = defineStore('funds', {
  state: () => ({
    fundSeed: 1000,
    holdingFundsByTag: {
      1: []
    } as Record<number, WatchFundItem[]>,
    watchFundsByTag: {
      11: [...initialWatchFunds]
    } as Record<number, WatchFundItem[]>,
    marketSectors: [...initialSectors],
    searchHistory: [
      { code: '161226', name: '国投瑞银白银期货(LOF)A' },
      { code: '025647', name: '平安高端装备混合C' },
      { code: '012349', name: '天弘恒生科技ETF联接(QDII)C' }
    ] as SearchHistoryItem[],
    hotFunds: [
      { code: '161226', name: '国投瑞银白银期货(LOF)A' },
      { code: '025647', name: '平安高端装备混合C' },
      { code: '012349', name: '天弘恒生科技ETF联接(QDII)C' },
      { code: '019005', name: '国投瑞银白银期货(LOF)C' },
      { code: '012922', name: '易方达全球成长精选混合(QDII)C' }
    ] as SearchHistoryItem[],
    positionByCode: {
      '001467': {
        amount: '0.00',
        ratio: '--',
        cost: '--',
        profit: '0.00',
        profitRate: '--',
        holdingDays: '21',
        yesterdayProfit: '0.00',
        yesterdayProfitRate: '0.00%'
      },
      '017811': {
        amount: '18200.00',
        ratio: '28.6%',
        cost: '1.9888',
        profit: '1266.20',
        profitRate: '7.48%',
        holdingDays: '96',
        yesterdayProfit: '152.29',
        yesterdayProfitRate: '0.85%'
      }
    } as Record<string, PositionInfo>,
    manualImportSeed: 1,
    manualImportRecords: [] as ManualImportItem[],
    manualImportFund: null as SearchHistoryItem | null,
    manualImportAmount: '',
    manualImportProfit: '',
    manualImportSyncWatch: true,
    convertTargetFund: null as SearchHistoryItem | null
  }),
  getters: {
    watchFundCodes(state) {
      // 输出全部标签下的自选 code 去重列表，供快速判断状态。
      return [...new Set(Object.values(state.watchFundsByTag).flatMap((list) => list.map((item) => item.code)))]
    }
  },
  actions: {
    getHoldingFundsByTag(tagId: number) {
      // 读取指定持有标签的基金列表，不存在时回退空数组。
      return this.holdingFundsByTag[tagId] || []
    },
    getWatchFundsByTag(tagId: number) {
      // 读取指定自选标签的基金列表，不存在时回退空数组。
      return this.watchFundsByTag[tagId] || []
    },
    findFundInBuckets(source: Record<number, WatchFundItem[]>, code: string) {
      // 在标签分桶里按 code 查找基金，用于复用已有快照字段。
      for (const list of Object.values(source)) {
        const found = list.find((item) => item.code === code)
        if (found) {
          return found
        }
      }
      return null
    },
    resolveBoardMeta(code: string) {
      // 从板块数据中推导基金所属板块，缺失时给出默认值。
      for (const sector of this.marketSectors) {
        if (sector.funds.some((item) => item.code === code)) {
          return {
            boardName: sector.name,
            boardChange: sector.trend
          }
        }
      }

      return {
        boardName: '未分类',
        boardChange: 0
      }
    },
    buildFundItem(payload: { code: string; name: string }) {
      // 生成标准基金条目，优先继承现有快照值保证展示连续性。
      const fromWatch = this.findFundInBuckets(this.watchFundsByTag, payload.code)
      const fromHolding = this.findFundInBuckets(this.holdingFundsByTag, payload.code)
      const boardMeta = this.resolveBoardMeta(payload.code)

      this.fundSeed += 1

      return {
        id: this.fundSeed,
        code: payload.code,
        name: payload.name || fromWatch?.name || fromHolding?.name || `基金${payload.code}`,
        dailyChange: fromWatch?.dailyChange ?? fromHolding?.dailyChange ?? 0,
        nav: fromWatch?.nav ?? fromHolding?.nav ?? 0,
        estimateTime: fromWatch?.estimateTime ?? fromHolding?.estimateTime ?? '',
        estimateNav: fromWatch?.estimateNav ?? fromHolding?.estimateNav ?? 0,
        lastNav: fromWatch?.lastNav ?? fromHolding?.lastNav ?? 0,
        boardName: fromWatch?.boardName ?? fromHolding?.boardName ?? boardMeta.boardName,
        boardChange: fromWatch?.boardChange ?? fromHolding?.boardChange ?? boardMeta.boardChange,
        monthChange: fromWatch?.monthChange ?? fromHolding?.monthChange ?? 0
      } as WatchFundItem
    },
    updatePositionByCode(code: string, amount: number, profit: number) {
      // 同步持仓九宫格数据，供基金详情页展示持仓扩展信息。
      const normalizedAmount = Math.max(0, amount)
      const normalizedProfit = profit
      const profitRate = normalizedAmount > 0 ? `${((normalizedProfit / normalizedAmount) * 100).toFixed(2)}%` : '--'

      this.positionByCode[code] = {
        amount: normalizedAmount.toFixed(2),
        ratio: '--',
        cost: '--',
        profit: normalizedProfit.toFixed(2),
        profitRate,
        holdingDays: this.positionByCode[code]?.holdingDays || '1',
        yesterdayProfit: (normalizedProfit * 0.25).toFixed(2),
        yesterdayProfitRate: profitRate === '--' ? '--' : `${(Number(profitRate.replace('%', '')) * 0.18).toFixed(2)}%`
      }
    },
    addHoldingFund(payload: { tagId: number; code: string; name: string; amount?: number; profit?: number }) {
      // 添加到指定持有标签，若已存在则仅更新持仓信息。
      const code = payload.code.trim()
      if (!code) {
        return false
      }

      const list = this.holdingFundsByTag[payload.tagId] || []
      const exists = list.some((item) => item.code === code)

      if (!exists) {
        list.unshift(this.buildFundItem({ code, name: payload.name.trim() }))
        this.holdingFundsByTag[payload.tagId] = list
      }

      if (payload.amount !== undefined || payload.profit !== undefined) {
        const amount = payload.amount ?? toNumber(this.positionByCode[code]?.amount || 0)
        const profit = payload.profit ?? toNumber(this.positionByCode[code]?.profit || 0)
        this.updatePositionByCode(code, amount, profit)
      }

      return true
    },
    removeHoldingFund(code: string, tagId?: number) {
      // 从指定标签或全部持有标签移除基金，并清理孤立持仓扩展数据。
      const targetCode = code.trim()
      if (!targetCode) {
        return false
      }

      let removed = false
      const targetTags = tagId === undefined ? Object.keys(this.holdingFundsByTag).map((key) => Number(key)) : [tagId]

      targetTags.forEach((currentTagId) => {
        const list = this.holdingFundsByTag[currentTagId] || []
        const next = list.filter((item) => item.code !== targetCode)
        if (next.length !== list.length) {
          removed = true
          this.holdingFundsByTag[currentTagId] = next
        }
      })

      if (!this.isHoldingFund(targetCode)) {
        delete this.positionByCode[targetCode]
      }

      return removed
    },
    clearHoldingFunds(tagId: number) {
      // 清空指定持有标签，并删除不再被任何持有列表引用的持仓扩展数据。
      const removedCodes = (this.holdingFundsByTag[tagId] || []).map((item) => item.code)
      this.holdingFundsByTag[tagId] = []

      removedCodes.forEach((code) => {
        if (!this.isHoldingFund(code)) {
          delete this.positionByCode[code]
        }
      })
    },
    addWatchFund(payload: { tagId: number; code: string; name: string }) {
      // 添加到指定自选标签，重复 code 不重复写入。
      const code = payload.code.trim()
      if (!code) {
        return false
      }

      const list = this.watchFundsByTag[payload.tagId] || []
      if (list.some((item) => item.code === code)) {
        return false
      }

      list.unshift(this.buildFundItem({ code, name: payload.name.trim() }))
      this.watchFundsByTag[payload.tagId] = list
      return true
    },
    removeWatchFund(code: string, tagId?: number) {
      // 从指定自选标签或全部自选标签移除基金。
      const targetCode = code.trim()
      if (!targetCode) {
        return false
      }

      let removed = false
      const targetTags = tagId === undefined ? Object.keys(this.watchFundsByTag).map((key) => Number(key)) : [tagId]

      targetTags.forEach((currentTagId) => {
        const list = this.watchFundsByTag[currentTagId] || []
        const next = list.filter((item) => item.code !== targetCode)
        if (next.length !== list.length) {
          removed = true
          this.watchFundsByTag[currentTagId] = next
        }
      })

      return removed
    },
    clearWatchFunds(tagId: number) {
      // 清空指定自选标签列表。
      this.watchFundsByTag[tagId] = []
    },
    async refreshWatchFundsByCodes(codes: string[]) {
      // 按 code 数组批量刷新自选快照，统一回填各标签中的同 code 基金。
      const uniqueCodes = Array.from(
        new Set(
          (codes || [])
            .map((item) => String(item || '').trim())
            .filter(Boolean)
        )
      )

      if (uniqueCodes.length === 0) {
        return
      }

      const snapshots = await fetchFundEstimatesBatch(uniqueCodes)
      const mergeSnapshot = (item: WatchFundItem) => {
        const snapshot = snapshots.get(item.code)
        if (!snapshot) {
          return { ...item }
        }

        const estimateNav = snapshot.gsz
        const lastNav = snapshot.dwjz
        const nav = estimateNav > 0 ? estimateNav : lastNav > 0 ? lastNav : item.nav

        return {
          ...item,
          name: item.name || snapshot.name || `基金${item.code}`,
          dailyChange: snapshot.gszzl,
          nav,
          estimateTime: snapshot.gztime || item.estimateTime || '',
          estimateNav,
          lastNav
        }
      }

      Object.keys(this.watchFundsByTag).forEach((key) => {
        const tagId = Number(key)
        const list = this.watchFundsByTag[tagId] || []
        this.watchFundsByTag[tagId] = list.map(mergeSnapshot)
      })
    },
    async refreshWatchFundsByTag(tagId: number) {
      // 刷新指定自选标签的基金实时快照。
      const list = this.watchFundsByTag[tagId] || []
      const codes = list.map((item) => item.code)
      await this.refreshWatchFundsByCodes(codes)
    },
    async refreshHoldingFundsByCodes(codes: string[]) {
      // 按 code 数组批量刷新持有快照，统一回填各标签中的同 code 基金。
      const uniqueCodes = Array.from(
        new Set(
          (codes || [])
            .map((item) => String(item || '').trim())
            .filter(Boolean)
        )
      )

      if (uniqueCodes.length === 0) {
        return
      }

      const snapshots = await fetchFundEstimatesBatch(uniqueCodes)
      const mergeSnapshot = (item: WatchFundItem) => {
        const snapshot = snapshots.get(item.code)
        if (!snapshot) {
          return { ...item }
        }

        const estimateNav = snapshot.gsz
        const lastNav = snapshot.dwjz
        const nav = estimateNav > 0 ? estimateNav : lastNav > 0 ? lastNav : item.nav

        return {
          ...item,
          name: item.name || snapshot.name || `基金${item.code}`,
          dailyChange: snapshot.gszzl,
          nav,
          estimateTime: snapshot.gztime || item.estimateTime || '',
          estimateNav,
          lastNav
        }
      }

      Object.keys(this.holdingFundsByTag).forEach((key) => {
        const tagId = Number(key)
        const list = this.holdingFundsByTag[tagId] || []
        this.holdingFundsByTag[tagId] = list.map(mergeSnapshot)
      })
    },
    isHoldingFund(code: string) {
      // 判断基金是否存在于任一持有标签中。
      return Object.values(this.holdingFundsByTag).some((list) => list.some((item) => item.code === code))
    },
    isWatchFund(code: string, tagId?: number) {
      // 判断基金是否存在于指定标签或任一自选标签中。
      if (tagId !== undefined) {
        return (this.watchFundsByTag[tagId] || []).some((item) => item.code === code)
      }
      return Object.values(this.watchFundsByTag).some((list) => list.some((item) => item.code === code))
    },
    toggleWatchFund(payload: { code: string; name: string; tagId: number }) {
      // 在指定自选标签内切换基金的自选状态。
      if (this.isWatchFund(payload.code, payload.tagId)) {
        return this.removeWatchFund(payload.code, payload.tagId)
      }
      return this.addWatchFund(payload)
    },
    recordSearchHistory(payload: SearchHistoryItem) {
      // 搜索命中后将基金写入历史并置顶，最多保留 12 条。
      const normalizedCode = payload.code.trim()
      const normalizedName = payload.name.trim()
      if (!normalizedCode || !normalizedName) {
        return
      }

      this.searchHistory = [
        { code: normalizedCode, name: normalizedName },
        ...this.searchHistory.filter((item) => item.code !== normalizedCode)
      ].slice(0, 12)
    },
    clearSearchHistory() {
      // 清空搜索历史区。
      this.searchHistory = []
    },
    getWatchFundByCode(code: string) {
      // 从全部自选标签中查找基金快照。
      return this.findFundInBuckets(this.watchFundsByTag, code)
    },
    getSectorByName(name: string) {
      // 按板块名称查找板块详情。
      return this.marketSectors.find((item) => item.name === name) || null
    },
    setManualImportFund(payload: SearchHistoryItem | null) {
      // 设置手动导入表单里的基金名称与代码。
      this.manualImportFund = payload
    },
    setManualImportAmount(value: string) {
      // 更新手动导入的持有金额输入值。
      this.manualImportAmount = value
    },
    setManualImportProfit(value: string) {
      // 更新手动导入的持有收益输入值。
      this.manualImportProfit = value
    },
    setManualImportSyncWatch(value: boolean) {
      // 控制“同步到自选”开关状态。
      this.manualImportSyncWatch = value
    },
    setConvertTargetFund(payload: SearchHistoryItem | null) {
      // 设置基金转换页的转入基金选择结果。
      this.convertTargetFund = payload
    },
    clearConvertTargetFund() {
      // 清空基金转换页的转入基金选择结果。
      this.convertTargetFund = null
    },
    clearManualImportForm() {
      // 清空当前录入表单，保留已添加列表。
      this.manualImportFund = null
      this.manualImportAmount = ''
      this.manualImportProfit = ''
    },
    appendManualImportRecord() {
      // 将当前表单加入“待提交持仓列表”，并重置录入表单。
      if (!this.manualImportFund) {
        return false
      }

      const amount = toNumber(this.manualImportAmount)
      if (amount <= 0) {
        return false
      }

      const profit = toNumber(this.manualImportProfit)

      this.manualImportRecords.unshift({
        id: this.manualImportSeed,
        code: this.manualImportFund.code,
        name: this.manualImportFund.name,
        amount,
        profit
      })
      this.manualImportSeed += 1
      this.clearManualImportForm()
      return true
    },
    removeManualImportRecord(id: number) {
      // 从待提交列表中删除指定基金。
      this.manualImportRecords = this.manualImportRecords.filter((item) => item.id !== id)
    },
    resetManualImport() {
      // 清空手动导入的表单和待提交列表。
      this.manualImportRecords = []
      this.clearManualImportForm()
      this.manualImportSyncWatch = true
    },
    commitManualImport(payload: { holdingTagId: number; watchTagId: number }) {
      // 提交待导入基金到当前持有标签，并按开关决定是否同步到当前自选标签。
      const rows = [...this.manualImportRecords]
      if (rows.length === 0) {
        return 0
      }

      rows.forEach((item) => {
        this.addHoldingFund({
          tagId: payload.holdingTagId,
          code: item.code,
          name: item.name,
          amount: item.amount,
          profit: item.profit
        })

        if (this.manualImportSyncWatch) {
          this.addWatchFund({ tagId: payload.watchTagId, code: item.code, name: item.name })
        }
      })

      this.resetManualImport()
      return rows.length
    }
  }
})
