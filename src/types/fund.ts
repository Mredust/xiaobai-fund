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
