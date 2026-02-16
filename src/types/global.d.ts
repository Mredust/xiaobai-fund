export {}

declare global {
  interface Window {
    jsonpgz?: (data: unknown) => void
    apidata?: {
      content?: string
    }
    Data_netWorthTrend?: Array<{
      x: number
      y: number
      equityReturn?: number
    }>
    [key: string]: unknown
  }
}
