export interface MarketIndexSimple {
  code: string
  name: string
  current: number
  change: number
  changePercent: number
}

export interface FundDistribution {
  range: string
  count: number
}

export interface MarketOverview {
  updateTime: string
  totalUp: number
  totalDown: number
  totalFlat: number
  distribution: FundDistribution[]
}

export interface SectorInfo {
  code: string
  name: string
  dayReturn: number
  count: number
  streak: string
}
