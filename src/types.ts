import type { ApiDataPoint, ApiUser } from './lib/openwearables/types'

export type Metric = {
  key: string
  label: string
  unit: string
}

export type LoadingProgress = {
  current: number
  total: number
  message: string
}

export type AppState = {
  apiUrl: string
  users: ApiUser[]
  selectedUserId: string | null
  metrics: Metric[]
  selectedMetric: string | null
  dateFrom: string | null
  dateTo: string | null
  dataPoints: ApiDataPoint[]
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
