import type {
  ApiDataPoint,
  ApiUser,
  ApiSleep,
  ApiWorkout,
  ActivitySummary,
  SleepSummary,
  BodySummary,
  UserDataSummaryResponse,
} from './lib/openwearables/types'

export type Metric = {
  key: string
  label: string
  unit: string
  continuous?: boolean
}

export type EventType = {
  key: string
  label: string
}

export type EventPoint = {
  timestamp: string
  label: string
  raw: ApiWorkout | ApiSleep
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

export type EventSeries = {
  id: string
  userId: string
  eventKey: string
  label: string
  color: string
  dataPoints: EventPoint[]
}

export type SummaryState = {
  activity: ActivitySummary[]
  sleep: SleepSummary[]
  body: BodySummary | null
  data: UserDataSummaryResponse | null
}

export type LoadingProgress = {
  current: number
  total: number
  message: string
}

export type AppState = {
  apiUrl: string
  users: ApiUser[]
  activeUserId: string | null
  metrics: Metric[]
  activeMetricKeys: string[]
  chartSeries: ChartSeries[]
  events: EventType[]
  activeEventKeys: string[]
  eventSeries: EventSeries[]
  summaries: SummaryState
  fetchSummaries: boolean
  dateFrom: string | null
  dateTo: string | null
  resolution: 'raw' | '1min' | '5min' | '15min' | '1hour'
  loading: boolean
  loadingProgress: LoadingProgress | null
  error: string | null
  view: 'dashboard' | 'settings'
  hasApiKey: boolean
  debugOutputDir: string | null
}

export type StatusMessage = {
  message: string
  type: 'success' | 'error' | 'neutral'
}
