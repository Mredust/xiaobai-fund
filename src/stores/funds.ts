import { defineStore } from 'pinia'
import { fetchFundEstimatesBatch } from '@/api/fundApi'
import {
  formatYmdDate,
  parseYmdDate,
  resolveBuyTiming,
  resolveConvertTiming,
  resolveSellTiming,
  resolveSipTiming,
  type TradeTimeSlot
} from '@/utils/trade'

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

export interface SyncBuyPayload {
  code: string
  name?: string
  amount: number
  dayRate?: number
  holdingTagId?: number
  timeSlot?: TradeTimeSlot
  timing?: ReturnType<typeof resolveBuyTiming>
}

export interface SyncSellPayload {
  code: string
  name?: string
  share: number
  nav: number
  dayRate?: number
  holdingTagId?: number
  timeSlot?: TradeTimeSlot
  timing?: ReturnType<typeof resolveSellTiming>
}

export interface SyncSipPayload {
  code: string
  name?: string
  amount: number
  dayRate?: number
  holdingTagId?: number
  timing?: ReturnType<typeof resolveSipTiming>
}

export interface SyncConvertPayload {
  sourceCode: string
  sourceName?: string
  targetCode: string
  targetName?: string
  outAmount: number
  inAmount: number
  sourceDayRate?: number
  targetDayRate?: number
  holdingTagId?: number
  timeSlot?: TradeTimeSlot
  timing?: ReturnType<typeof resolveConvertTiming>
}

export interface TradeRecordItem {
  id: number
  code: string
  fundName: string
  type: 'buy' | 'sell' | 'sip' | 'convert'
  direction: 'buy' | 'sell'
  amount: number
  unit: '\u5143' | '\u4efd'
  requestDate: string
  tradeDate: string
  confirmDate: string
  occurredAt: string
}

export type SipCycleType = 'daily' | 'weekly' | 'biweekly' | 'monthly'

export interface SipPlanItem {
  id: number
  code: string
  fundName: string
  amount: number
  cycle: SipCycleType
  cycleValue: string
  cycleText: string
  nextRunDate: string
  investedTotal: number
  investedCount: number
  status: 'running'
}

export interface AddSipPlanPayload {
  code: string
  fundName: string
  amount: number
  periodText: string
  nextRunDate: string
}

const initialWatchFunds: WatchFundItem[] = []

const initialSectors: SectorItem[] = [
  {
    id: 1,
    name: 'Semiconductor',
    trend: 1.92,
    count: 8,
    funds: [
      { code: '017811', name: 'AI Theme Mix C', dailyChange: 2.81, monthChange: 7.65 },
      { code: '007639', name: 'Competitive Advantage Mix', dailyChange: 2.56, monthChange: 8.97 },
      { code: '013841', name: 'IC Mix C', dailyChange: 2.54, monthChange: 8.84 },
      { code: '007491', name: 'Info Innovation Mix C', dailyChange: 2.31, monthChange: 10.07 }
    ]
  },
  {
    id: 2,
    name: 'AI Compute',
    trend: 0.92,
    count: 16,
    funds: [
      { code: '017811', name: 'AI Theme Mix C', dailyChange: 1.31, monthChange: 5.12 },
      { code: '008888', name: 'Digital Economy Mix A', dailyChange: 1.08, monthChange: 3.47 }
    ]
  },
  {
    id: 3,
    name: 'Gold Equity',
    trend: -3.33,
    count: 12,
    funds: [
      { code: '001302', name: 'Gold & Silver Mix A', dailyChange: -2.9, monthChange: 4.33 },
      { code: '001467', name: 'Flexible Allocation Mix C', dailyChange: -2.75, monthChange: 5.01 }
    ]
  },
  {
    id: 4,
    name: 'Communication',
    trend: -0.78,
    count: 18,
    funds: [
      { code: '020465', name: 'Semiconductor ETF Link', dailyChange: 0.77, monthChange: 2.33 },
      { code: '014855', name: 'Semiconductor Index', dailyChange: 0.77, monthChange: 2.41 }
    ]
  }
]

const toNumber = (value: string | number) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

const clampPositive = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.max(0, value)
}

const formatRateText = (value: number) => {
  if (!Number.isFinite(value)) {
    return '--'
  }
  if (value === 0) {
    return '0.00%'
  }
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
}

const buildOccurredAtText = (date: Date, slot?: TradeTimeSlot) => {
  const dayText = formatYmdDate(date)
  const hhmmss = slot === 'before-close' ? '14:50:01' : slot === 'after-close' ? '15:10:01' : '15:00:01'
  return `${dayText} ${hhmmss}`
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
    searchHistory: [] as SearchHistoryItem[],
    hotFunds: [
      { code: '161226', name: 'Silver Futures(LOF) A' },
      { code: '025647', name: 'High-end Equipment Mix C' },
      { code: '012349', name: 'HS Tech ETF Link(QDII) C' },
      { code: '019005', name: 'Silver Futures(LOF) C' },
      { code: '012922', name: 'Global Growth Select(QDII) C' }
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
    convertTargetFund: null as SearchHistoryItem | null,
    sipPlanSeed: 1,
    sipPlansByCode: {} as Record<string, SipPlanItem[]>,
    tradeRecordSeed: 1,
    tradeRecords: [] as TradeRecordItem[]
  }),
  getters: {
    watchFundCodes(state) {
      // 杈撳嚭鍏ㄩ儴鏍囩涓嬬殑鑷€?code 鍘婚噸鍒楄〃锛屼緵蹇€熷垽鏂姸鎬併€?
      return [...new Set(Object.values(state.watchFundsByTag).flatMap((list) => list.map((item) => item.code)))]
    }
  },
  actions: {
    getHoldingFundsByTag(tagId: number) {
      // 璇诲彇鎸囧畾鎸佹湁鏍囩鐨勫熀閲戝垪琛紝涓嶅瓨鍦ㄦ椂鍥為€€绌烘暟缁勩€?
      return this.holdingFundsByTag[tagId] || []
    },
    getWatchFundsByTag(tagId: number) {
      // 璇诲彇鎸囧畾鑷€夋爣绛剧殑鍩洪噾鍒楄〃锛屼笉瀛樺湪鏃跺洖閫€绌烘暟缁勩€?
      return this.watchFundsByTag[tagId] || []
    },
    getTradeRecordsByCode(code: string) {
      const normalizedCode = String(code || '').trim()
      if (!normalizedCode) {
        return [] as TradeRecordItem[]
      }
      return this.tradeRecords
        .filter((item) => item.code === normalizedCode)
        .slice()
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    },
    getSipPlansByCode(code: string) {
      const normalizedCode = String(code || '').trim()
      if (!normalizedCode) {
        return [] as SipPlanItem[]
      }
      return [...(this.sipPlansByCode[normalizedCode] || [])].sort((a, b) => a.nextRunDate.localeCompare(b.nextRunDate))
    },
    resolveHoldingTagIdByCode(code: string) {
      const normalized = String(code || '').trim()
      if (normalized) {
        const matchedTag = Object.keys(this.holdingFundsByTag).find((key) =>
          (this.holdingFundsByTag[Number(key)] || []).some((item) => item.code === normalized)
        )
        if (matchedTag) {
          return Number(matchedTag)
        }
      }
      const firstTagId = Number(Object.keys(this.holdingFundsByTag)[0] || 1)
      return Number.isFinite(firstTagId) ? firstTagId : 1
    },
    resolveFundNameByCode(code: string) {
      const normalizedCode = String(code || '').trim()
      if (!normalizedCode) {
        return ''
      }
      const holding = this.findFundInBuckets(this.holdingFundsByTag, normalizedCode)
      if (holding?.name) {
        return holding.name
      }
      const watch = this.findFundInBuckets(this.watchFundsByTag, normalizedCode)
      if (watch?.name) {
        return watch.name
      }
      return `Fund${normalizedCode}`
    },
    resolveFundDayRateByCode(code: string) {
      const normalizedCode = String(code || '').trim()
      if (!normalizedCode) {
        return 0
      }
      const holding = this.findFundInBuckets(this.holdingFundsByTag, normalizedCode)
      if (holding && Number.isFinite(Number(holding.dailyChange))) {
        return Number(holding.dailyChange)
      }
      const watch = this.findFundInBuckets(this.watchFundsByTag, normalizedCode)
      if (watch && Number.isFinite(Number(watch.dailyChange))) {
        return Number(watch.dailyChange)
      }
      return 0
    },
    appendTradeRecord(payload: Omit<TradeRecordItem, 'id'>) {
      const next: TradeRecordItem = {
        id: this.tradeRecordSeed,
        ...payload
      }
      this.tradeRecordSeed += 1
      this.tradeRecords.unshift(next)
      return next
    },
    parseSipCycle(periodText: string) {
      const text = String(periodText || '').trim()
      const weekList = ['\u5468\u4e00', '\u5468\u4e8c', '\u5468\u4e09', '\u5468\u56db', '\u5468\u4e94']
      const normalizeWeek = (value: string) => {
        const next = value.replace('\u661f\u671f', '\u5468')
        return weekList.includes(next) ? next : '\u5468\u4e00'
      }

      if (!text || text.startsWith('\u6bcf\u5468')) {
        const week = normalizeWeek(text.split(/\s+/)[1] || '')
        return { cycle: 'weekly' as const, cycleValue: week, cycleText: `\u6bcf\u5468 ${week}` }
      }
      if (text.startsWith('\u6bcf\u4e24\u5468')) {
        const week = normalizeWeek(text.split(/\s+/)[1] || '')
        return { cycle: 'biweekly' as const, cycleValue: week, cycleText: `\u6bcf\u4e24\u5468 ${week}` }
      }
      if (text.startsWith('\u6bcf\u6708')) {
        const day = Number(text.replace(/[^\d]/g, ''))
        const safeDay = Number.isFinite(day) && day > 0 ? Math.floor(day) : 1
        return { cycle: 'monthly' as const, cycleValue: String(safeDay), cycleText: `\u6bcf\u6708 ${safeDay}\u65e5` }
      }
      return { cycle: 'daily' as const, cycleValue: '', cycleText: '\u6bcf\u65e5' }
    },
    calcNextSipRunDate(currentDate: string, cycle: SipCycleType, cycleValue: string) {
      const parsed = parseYmdDate(currentDate) || new Date()
      const next = new Date(parsed)
      if (cycle === 'daily') {
        next.setDate(next.getDate() + 1)
        return formatYmdDate(next)
      }
      if (cycle === 'weekly') {
        next.setDate(next.getDate() + 7)
        return formatYmdDate(next)
      }
      if (cycle === 'biweekly') {
        next.setDate(next.getDate() + 14)
        return formatYmdDate(next)
      }

      const targetDay = Number(cycleValue)
      const safeDay = Number.isFinite(targetDay) && targetDay > 0 ? Math.floor(targetDay) : parsed.getDate()
      next.setDate(1)
      next.setMonth(next.getMonth() + 1)
      const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
      next.setDate(Math.min(safeDay, maxDay))
      return formatYmdDate(next)
    },
    addSipPlan(payload: AddSipPlanPayload) {
      const code = String(payload.code || '').trim()
      const fundName = String(payload.fundName || '').trim()
      const amount = clampPositive(Number(payload.amount))
      if (!code || !fundName || amount <= 0) {
        return null
      }

      const cycleMeta = this.parseSipCycle(payload.periodText)
      const nextRunDate = formatYmdDate(parseYmdDate(payload.nextRunDate) || new Date())
      const row: SipPlanItem = {
        id: this.sipPlanSeed,
        code,
        fundName,
        amount,
        cycle: cycleMeta.cycle,
        cycleValue: cycleMeta.cycleValue,
        cycleText: cycleMeta.cycleText,
        nextRunDate,
        investedTotal: 0,
        investedCount: 0,
        status: 'running'
      }

      this.sipPlanSeed += 1
      const prev = this.sipPlansByCode[code] || []
      this.sipPlansByCode[code] = [...prev, row].sort((a, b) => a.nextRunDate.localeCompare(b.nextRunDate))
      return row
    },
    runDueSipPlans(todayRaw?: Date) {
      const today = todayRaw ? new Date(todayRaw) : new Date()
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())

      Object.keys(this.sipPlansByCode).forEach((code) => {
        const plans = this.sipPlansByCode[code] || []
        plans.forEach((plan) => {
          let guard = 0
          while (guard < 366) {
            const nextDate = parseYmdDate(plan.nextRunDate)
            if (!nextDate) {
              break
            }

            const timing = resolveSipTiming(nextDate)
            if (timing.tradeDate.getTime() > todayDate.getTime()) {
              break
            }

            const synced = this.syncSipTrade({
              code: plan.code,
              name: plan.fundName || this.resolveFundNameByCode(plan.code),
              amount: plan.amount,
              dayRate: this.resolveFundDayRateByCode(plan.code),
              holdingTagId: this.resolveHoldingTagIdByCode(plan.code),
              timing
            })
            if (!synced) {
              break
            }

            plan.investedTotal = clampPositive(plan.investedTotal + plan.amount)
            plan.investedCount = Math.floor(clampPositive(plan.investedCount + 1))
            plan.nextRunDate = this.calcNextSipRunDate(plan.nextRunDate, plan.cycle, plan.cycleValue)
            guard += 1
          }
        })
        this.sipPlansByCode[code] = [...plans].sort((a, b) => a.nextRunDate.localeCompare(b.nextRunDate))
      })
    },
    findFundInBuckets(source: Record<number, WatchFundItem[]>, code: string) {
      // 鍦ㄦ爣绛惧垎妗堕噷鎸?code 鏌ユ壘鍩洪噾锛岀敤浜庡鐢ㄥ凡鏈夊揩鐓у瓧娈点€?
      for (const list of Object.values(source)) {
        const found = list.find((item) => item.code === code)
        if (found) {
          return found
        }
      }
      return null
    },
    resolveBoardMeta(code: string) {
      // 浠庢澘鍧楁暟鎹腑鎺ㄥ鍩洪噾鎵€灞炴澘鍧楋紝缂哄け鏃剁粰鍑洪粯璁ゅ€笺€?
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
      // 鐢熸垚鏍囧噯鍩洪噾鏉＄洰锛屼紭鍏堢户鎵跨幇鏈夊揩鐓у€间繚璇佸睍绀鸿繛缁€с€?
      const fromWatch = this.findFundInBuckets(this.watchFundsByTag, payload.code)
      const fromHolding = this.findFundInBuckets(this.holdingFundsByTag, payload.code)
      const boardMeta = this.resolveBoardMeta(payload.code)

      this.fundSeed += 1

      return {
        id: this.fundSeed,
        code: payload.code,
        name: payload.name || fromWatch?.name || fromHolding?.name || `Fund${payload.code}`,
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
    updatePositionByCode(
      code: string,
      amount: number,
      profit: number,
      options?: { holdingDays?: string | number; dayRate?: number | null }
    ) {
      // 鍚屾鎸佷粨涔濆鏍兼暟鎹紝渚涘熀閲戣鎯呴〉灞曠ず鎸佷粨鎵╁睍淇℃伅銆?
      const normalizedAmount = Math.max(0, amount)
      const normalizedProfit = Number.isFinite(profit) ? profit : 0
      const principal = normalizedAmount - normalizedProfit
      const profitRateValue =
        principal > 0
          ? (normalizedProfit / principal) * 100
          : normalizedAmount > 0
            ? (normalizedProfit / normalizedAmount) * 100
            : null

      const dayRate = Number(options?.dayRate)
      const hasDayRate = Number.isFinite(dayRate)
      const holdingDaysRaw = Number(options?.holdingDays)
      const holdingDays =
        Number.isFinite(holdingDaysRaw) && holdingDaysRaw > 0
          ? String(Math.floor(holdingDaysRaw))
          : this.positionByCode[code]?.holdingDays || '1'

      const dayProfit =
        hasDayRate && normalizedAmount > 0
          ? normalizedAmount - normalizedAmount / (1 + dayRate / 100)
          : normalizedProfit * 0.25

      this.positionByCode[code] = {
        amount: normalizedAmount.toFixed(2),
        ratio: '--',
        cost: '--',
        profit: normalizedProfit.toFixed(2),
        profitRate: profitRateValue === null ? '--' : formatRateText(profitRateValue),
        holdingDays,
        yesterdayProfit: dayProfit.toFixed(2),
        yesterdayProfitRate: hasDayRate
          ? formatRateText(dayRate)
          : profitRateValue === null
            ? '--'
            : formatRateText(profitRateValue * 0.18)
      }
    },
    syncBuyTrade(payload: SyncBuyPayload) {
      const code = String(payload.code || '').trim()
      const amount = clampPositive(Number(payload.amount))
      if (!code || amount <= 0) {
        return false
      }

      const timing = payload.timing || resolveBuyTiming(new Date(), payload.timeSlot || 'after-close')
      const tagId = payload.holdingTagId || this.resolveHoldingTagIdByCode(code)
      const name = String(payload.name || '').trim() || this.resolveFundNameByCode(code)

      this.addHoldingFund({ tagId, code, name })

      const currentAmount = toNumber(this.positionByCode[code]?.amount || 0)
      const currentProfit = toNumber(this.positionByCode[code]?.profit || 0)
      const dayRate = Number(payload.dayRate)

      this.updatePositionByCode(code, currentAmount + amount, currentProfit, {
        dayRate: Number.isFinite(dayRate) ? dayRate : null
      })

      this.appendTradeRecord({
        code,
        fundName: name,
        type: 'buy',
        direction: 'buy',
        amount,
        unit: '\u5143',
        requestDate: formatYmdDate(timing.requestDate),
        tradeDate: formatYmdDate(timing.tradeDate),
        confirmDate: formatYmdDate(timing.confirmDate),
        occurredAt: buildOccurredAtText(timing.requestDate, payload.timeSlot)
      })

      return true
    },
    syncSellTrade(payload: SyncSellPayload) {
      const code = String(payload.code || '').trim()
      const share = clampPositive(Number(payload.share))
      const nav = clampPositive(Number(payload.nav))
      if (!code || share <= 0 || nav <= 0) {
        return null
      }

      const currentAmount = toNumber(this.positionByCode[code]?.amount || 0)
      const currentProfit = toNumber(this.positionByCode[code]?.profit || 0)
      if (currentAmount <= 0) {
        return null
      }

      const maxSellShare = currentAmount / nav
      const soldShare = Math.min(share, maxSellShare)
      if (!(soldShare > 0)) {
        return null
      }

      const soldAmount = soldShare * nav
      const nextAmount = Math.max(0, currentAmount - soldAmount)
      const nextProfit = currentAmount > 0 ? currentProfit * (nextAmount / currentAmount) : 0
      const dayRate = Number(payload.dayRate)

      if (nextAmount > 0) {
        this.updatePositionByCode(code, nextAmount, nextProfit, {
          dayRate: Number.isFinite(dayRate) ? dayRate : null
        })
      } else {
        this.removeHoldingFund(code)
      }

      const timing = payload.timing || resolveSellTiming(new Date(), payload.timeSlot || 'after-close')
      const name = String(payload.name || '').trim() || this.resolveFundNameByCode(code)

      this.appendTradeRecord({
        code,
        fundName: name,
        type: 'sell',
        direction: 'sell',
        amount: soldShare,
        unit: '\u4efd',
        requestDate: formatYmdDate(timing.requestDate),
        tradeDate: formatYmdDate(timing.tradeDate),
        confirmDate: formatYmdDate(timing.confirmDate),
        occurredAt: buildOccurredAtText(timing.requestDate, payload.timeSlot)
      })

      return {
        soldShare,
        soldAmount,
        maxSellShare
      }
    },
    syncSipTrade(payload: SyncSipPayload) {
      const code = String(payload.code || '').trim()
      const amount = clampPositive(Number(payload.amount))
      if (!code || amount <= 0) {
        return false
      }

      const timing = payload.timing || resolveSipTiming(new Date())
      const tagId = payload.holdingTagId || this.resolveHoldingTagIdByCode(code)
      const name = String(payload.name || '').trim() || this.resolveFundNameByCode(code)

      this.addHoldingFund({ tagId, code, name })

      const currentAmount = toNumber(this.positionByCode[code]?.amount || 0)
      const currentProfit = toNumber(this.positionByCode[code]?.profit || 0)
      const dayRate = Number(payload.dayRate)

      this.updatePositionByCode(code, currentAmount + amount, currentProfit, {
        dayRate: Number.isFinite(dayRate) ? dayRate : null
      })

      this.appendTradeRecord({
        code,
        fundName: name,
        type: 'sip',
        direction: 'buy',
        amount,
        unit: '\u5143',
        requestDate: formatYmdDate(timing.requestDate),
        tradeDate: formatYmdDate(timing.tradeDate),
        confirmDate: formatYmdDate(timing.confirmDate),
        occurredAt: buildOccurredAtText(timing.requestDate, 'before-close')
      })

      return true
    },
    syncConvertTrade(payload: SyncConvertPayload) {
      const sourceCode = String(payload.sourceCode || '').trim()
      const targetCode = String(payload.targetCode || '').trim()
      if (!sourceCode || !targetCode || sourceCode === targetCode) {
        return null
      }

      const outAmount = clampPositive(Number(payload.outAmount))
      const inAmount = clampPositive(Number(payload.inAmount))
      if (outAmount <= 0 || inAmount <= 0) {
        return null
      }

      const sourceAmount = toNumber(this.positionByCode[sourceCode]?.amount || 0)
      const sourceProfit = toNumber(this.positionByCode[sourceCode]?.profit || 0)
      if (sourceAmount <= 0) {
        return null
      }

      const actualOutAmount = Math.min(outAmount, sourceAmount)
      const nextSourceAmount = Math.max(0, sourceAmount - actualOutAmount)
      const nextSourceProfit = sourceAmount > 0 ? sourceProfit * (nextSourceAmount / sourceAmount) : 0
      const sourceDayRate = Number(payload.sourceDayRate)

      if (nextSourceAmount > 0) {
        this.updatePositionByCode(sourceCode, nextSourceAmount, nextSourceProfit, {
          dayRate: Number.isFinite(sourceDayRate) ? sourceDayRate : null
        })
      } else {
        this.removeHoldingFund(sourceCode)
      }

      const tagId = payload.holdingTagId || this.resolveHoldingTagIdByCode(sourceCode)
      const targetName = String(payload.targetName || '').trim() || this.resolveFundNameByCode(targetCode)
      this.addHoldingFund({ tagId, code: targetCode, name: targetName })

      const targetAmount = toNumber(this.positionByCode[targetCode]?.amount || 0)
      const targetProfit = toNumber(this.positionByCode[targetCode]?.profit || 0)
      const targetDayRate = Number(payload.targetDayRate)
      this.updatePositionByCode(targetCode, targetAmount + inAmount, targetProfit, {
        dayRate: Number.isFinite(targetDayRate) ? targetDayRate : null
      })

      const timing = payload.timing || resolveConvertTiming(new Date(), payload.timeSlot || 'after-close')
      const sourceName = String(payload.sourceName || '').trim() || this.resolveFundNameByCode(sourceCode)

      this.appendTradeRecord({
        code: sourceCode,
        fundName: sourceName,
        type: 'convert',
        direction: 'sell',
        amount: actualOutAmount,
        unit: '\u5143',
        requestDate: formatYmdDate(timing.requestDate),
        tradeDate: formatYmdDate(timing.tradeDate),
        confirmDate: formatYmdDate(timing.confirmDate),
        occurredAt: buildOccurredAtText(timing.requestDate, payload.timeSlot)
      })

      return {
        actualOutAmount,
        inAmount
      }
    },
    addHoldingFund(payload: { tagId: number; code: string; name: string; amount?: number; profit?: number }) {
      // 娣诲姞鍒版寚瀹氭寔鏈夋爣绛撅紝鑻ュ凡瀛樺湪鍒欎粎鏇存柊鎸佷粨淇℃伅銆?
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
      // 浠庢寚瀹氭爣绛炬垨鍏ㄩ儴鎸佹湁鏍囩绉婚櫎鍩洪噾锛屽苟娓呯悊瀛ょ珛鎸佷粨鎵╁睍鏁版嵁銆?
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
      // 娓呯┖鎸囧畾鎸佹湁鏍囩锛屽苟鍒犻櫎涓嶅啀琚换浣曟寔鏈夊垪琛ㄥ紩鐢ㄧ殑鎸佷粨鎵╁睍鏁版嵁銆?
      const removedCodes = (this.holdingFundsByTag[tagId] || []).map((item) => item.code)
      this.holdingFundsByTag[tagId] = []

      removedCodes.forEach((code) => {
        if (!this.isHoldingFund(code)) {
          delete this.positionByCode[code]
        }
      })
    },
    addWatchFund(payload: { tagId: number; code: string; name: string }) {
      // 娣诲姞鍒版寚瀹氳嚜閫夋爣绛撅紝閲嶅 code 涓嶉噸澶嶅啓鍏ャ€?
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
      // 浠庢寚瀹氳嚜閫夋爣绛炬垨鍏ㄩ儴鑷€夋爣绛剧Щ闄ゅ熀閲戙€?
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
      // 娓呯┖鎸囧畾鑷€夋爣绛惧垪琛ㄣ€?
      this.watchFundsByTag[tagId] = []
    },
    async refreshWatchFundsByCodes(codes: string[]) {
      // 鎸?code 鏁扮粍鎵归噺鍒锋柊鑷€夊揩鐓э紝缁熶竴鍥炲～鍚勬爣绛句腑鐨勫悓 code 鍩洪噾銆?
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
          name: item.name || snapshot.name || `Fund${item.code}`,
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
      // 鍒锋柊鎸囧畾鑷€夋爣绛剧殑鍩洪噾瀹炴椂蹇収銆?
      const list = this.watchFundsByTag[tagId] || []
      const codes = list.map((item) => item.code)
      await this.refreshWatchFundsByCodes(codes)
    },
    async refreshHoldingFundsByCodes(codes: string[]) {
      // 鎸?code 鏁扮粍鎵归噺鍒锋柊鎸佹湁蹇収锛岀粺涓€鍥炲～鍚勬爣绛句腑鐨勫悓 code 鍩洪噾銆?
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
          name: item.name || snapshot.name || `Fund${item.code}`,
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
      // 鍒ゆ柇鍩洪噾鏄惁瀛樺湪浜庝换涓€鎸佹湁鏍囩涓€?
      return Object.values(this.holdingFundsByTag).some((list) => list.some((item) => item.code === code))
    },
    isWatchFund(code: string, tagId?: number) {
      // 鍒ゆ柇鍩洪噾鏄惁瀛樺湪浜庢寚瀹氭爣绛炬垨浠讳竴鑷€夋爣绛句腑銆?
      if (tagId !== undefined) {
        return (this.watchFundsByTag[tagId] || []).some((item) => item.code === code)
      }
      return Object.values(this.watchFundsByTag).some((list) => list.some((item) => item.code === code))
    },
    toggleWatchFund(payload: { code: string; name: string; tagId: number }) {
      // 鍦ㄦ寚瀹氳嚜閫夋爣绛惧唴鍒囨崲鍩洪噾鐨勮嚜閫夌姸鎬併€?
      if (this.isWatchFund(payload.code, payload.tagId)) {
        return this.removeWatchFund(payload.code, payload.tagId)
      }
      return this.addWatchFund(payload)
    },
    recordSearchHistory(payload: SearchHistoryItem) {
      // 鎼滅储鍛戒腑鍚庡皢鍩洪噾鍐欏叆鍘嗗彶骞剁疆椤讹紝鏈€澶氫繚鐣?12 鏉°€?
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
      // 娓呯┖鎼滅储鍘嗗彶鍖恒€?
      this.searchHistory = []
    },
    getWatchFundByCode(code: string) {
      // 浠庡叏閮ㄨ嚜閫夋爣绛句腑鏌ユ壘鍩洪噾蹇収銆?
      return this.findFundInBuckets(this.watchFundsByTag, code)
    },
    getSectorByName(name: string) {
      // 鎸夋澘鍧楀悕绉版煡鎵炬澘鍧楄鎯呫€?
      return this.marketSectors.find((item) => item.name === name) || null
    },
    setManualImportFund(payload: SearchHistoryItem | null) {
      // 璁剧疆鎵嬪姩瀵煎叆琛ㄥ崟閲岀殑鍩洪噾鍚嶇О涓庝唬鐮併€?
      this.manualImportFund = payload
    },
    setManualImportAmount(value: string) {
      // 鏇存柊鎵嬪姩瀵煎叆鐨勬寔鏈夐噾棰濊緭鍏ュ€笺€?
      this.manualImportAmount = value
    },
    setManualImportProfit(value: string) {
      // 鏇存柊鎵嬪姩瀵煎叆鐨勬寔鏈夋敹鐩婅緭鍏ュ€笺€?
      this.manualImportProfit = value
    },
    setManualImportSyncWatch(value: boolean) {
      // 鎺у埗鈥滃悓姝ュ埌鑷€夆€濆紑鍏崇姸鎬併€?
      this.manualImportSyncWatch = value
    },
    setConvertTargetFund(payload: SearchHistoryItem | null) {
      // 璁剧疆鍩洪噾杞崲椤电殑杞叆鍩洪噾閫夋嫨缁撴灉銆?
      this.convertTargetFund = payload
    },
    clearConvertTargetFund() {
      // 娓呯┖鍩洪噾杞崲椤电殑杞叆鍩洪噾閫夋嫨缁撴灉銆?
      this.convertTargetFund = null
    },
    clearManualImportForm() {
      // 娓呯┖褰撳墠褰曞叆琛ㄥ崟锛屼繚鐣欏凡娣诲姞鍒楄〃銆?
      this.manualImportFund = null
      this.manualImportAmount = ''
      this.manualImportProfit = ''
    },
    appendManualImportRecord() {
      // 灏嗗綋鍓嶈〃鍗曞姞鍏モ€滃緟鎻愪氦鎸佷粨鍒楄〃鈥濓紝骞堕噸缃綍鍏ヨ〃鍗曘€?
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
      // 浠庡緟鎻愪氦鍒楄〃涓垹闄ゆ寚瀹氬熀閲戙€?
      this.manualImportRecords = this.manualImportRecords.filter((item) => item.id !== id)
    },
    resetManualImport() {
      // 娓呯┖鎵嬪姩瀵煎叆鐨勮〃鍗曞拰寰呮彁浜ゅ垪琛ㄣ€?
      this.manualImportRecords = []
      this.clearManualImportForm()
      this.manualImportSyncWatch = true
    },
    commitManualImport(payload: { holdingTagId: number; watchTagId: number }) {
      // 鎻愪氦寰呭鍏ュ熀閲戝埌褰撳墠鎸佹湁鏍囩锛屽苟鎸夊紑鍏冲喅瀹氭槸鍚﹀悓姝ュ埌褰撳墠鑷€夋爣绛俱€?
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
