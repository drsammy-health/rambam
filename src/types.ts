import type { ApiDataPoint, ApiUser } from './lib/openwearables/types'

export type Metric = {
  key: string
  label: string
  unit: string
  continuous?: boolean
}

export type ChartSeries = {
  id: string
  userId: string
  metricKey: string
  label: string
  unit: string
  color: string
  continuous: boolean
  dataPoints: ApiDataPoint[]
}

export type LoadingProgress = {
  current: number
  total: number
  message: string
}

export type AppState = {
  apiUrl: string
  users: ApiUser[]
  activeUserIds: string[]
  metrics: Metric[]
  activeMetricKeys: string[]
  chartSeries: ChartSeries[]
  dateFrom: string | null
  dateTo: string | null
  loading: boolean
  loadingProgress: LoadingProgress | null
  error: string | null
  view: 'dashboard' | 'settings'
  hasApiKey: boolean
}

export type StatusMessage = {
  message: string
  type: 'success' | 'error' | 'neutral'
}
