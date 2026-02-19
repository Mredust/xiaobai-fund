export type TradeTimeSlot = 'before-close' | 'after-close'

export interface TradeTiming {
  requestDate: Date
  tradeDate: Date
  confirmDate: Date
  isTradingDay: boolean
  isAfterClose: boolean
}

export interface SellTiming extends TradeTiming {
  cashArrivalStart: Date
  cashArrivalEnd: Date
}

export const normalizeDate = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export const parseYmdDate = (value: string) => {
  const text = String(value || '').trim()
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) {
    return null
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }
  return date
}

export const formatYmdDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const formatMonthDayLabel = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}\u6708${day}\u65e5`
}

export const formatMonthDayWeekLabel = (date: Date) => {
  const week = ['\u5468\u65e5', '\u5468\u4e00', '\u5468\u4e8c', '\u5468\u4e09', '\u5468\u56db', '\u5468\u4e94', '\u5468\u516d'][date.getDay()] || '\u5468\u4e00'
  return `${formatMonthDayLabel(date)} ${week}`
}

export const isTradingDay = (date: Date) => {
  const day = date.getDay()
  return day !== 0 && day !== 6
}

export const nextTradingDay = (date: Date) => {
  const next = normalizeDate(date)
  do {
    next.setDate(next.getDate() + 1)
  } while (!isTradingDay(next))
  return next
}

export const addTradingDays = (date: Date, days: number) => {
  let left = Math.max(0, Math.floor(days))
  const next = normalizeDate(date)
  while (left > 0) {
    next.setDate(next.getDate() + 1)
    if (isTradingDay(next)) {
      left -= 1
    }
  }
  return next
}

const resolveTradeDate = (requestDate: Date, slot: TradeTimeSlot) => {
  if (isTradingDay(requestDate) && slot === 'before-close') {
    return normalizeDate(requestDate)
  }
  return nextTradingDay(requestDate)
}

export const resolveBuyTiming = (requestDate: Date, slot: TradeTimeSlot): TradeTiming => {
  const normalized = normalizeDate(requestDate)
  const tradeDate = resolveTradeDate(normalized, slot)
  return {
    requestDate: normalized,
    tradeDate,
    confirmDate: addTradingDays(tradeDate, 1),
    isTradingDay: isTradingDay(normalized),
    isAfterClose: slot === 'after-close'
  }
}

export const resolveSellTiming = (requestDate: Date, slot: TradeTimeSlot): SellTiming => {
  const normalized = normalizeDate(requestDate)
  const tradeDate = resolveTradeDate(normalized, slot)
  return {
    requestDate: normalized,
    tradeDate,
    confirmDate: addTradingDays(tradeDate, 1),
    cashArrivalStart: addTradingDays(tradeDate, 2),
    cashArrivalEnd: addTradingDays(tradeDate, 4),
    isTradingDay: isTradingDay(normalized),
    isAfterClose: slot === 'after-close'
  }
}

export const resolveSipTiming = (requestDate: Date) => {
  const normalized = normalizeDate(requestDate)
  const tradeDate = isTradingDay(normalized) ? normalized : nextTradingDay(normalized)
  return {
    requestDate: normalized,
    tradeDate,
    confirmDate: addTradingDays(tradeDate, 1),
    isTradingDay: isTradingDay(normalized)
  }
}

export const resolveConvertTiming = (requestDate: Date, slot: TradeTimeSlot): TradeTiming => {
  const normalized = normalizeDate(requestDate)
  const tradeDate = resolveTradeDate(normalized, slot)
  return {
    requestDate: normalized,
    tradeDate,
    confirmDate: addTradingDays(tradeDate, 1),
    isTradingDay: isTradingDay(normalized),
    isAfterClose: slot === 'after-close'
  }
}
