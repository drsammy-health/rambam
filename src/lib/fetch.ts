import { getSeriesColor } from './charts'
import { filterGlucoseProviders } from './data-transform'
import {
  fetchAllEvents,
  fetchAllTimeseries,
  fetchActivitySummaries,
  fetchSleepSummaries,
  fetchBodySummary,
  fetchDataSummary,
  getUserDisplayName,
} from './openwearables/api'
import type { ApiUser, ApiWorkout, ApiSleep } from './openwearables/types'
import type { ChartSeries, EventPoint, EventSeries, SummaryState } from '../types'

export async function fetchSeriesForUser(
  metric: { key: string; label: string; unit: string; continuous?: boolean },
  userId: string,
  users: ApiUser[],
  dateFrom: string,
  dateTo: string,
  onProgress: (current: number, total: number, message: string) => void,
): Promise<{ series: ChartSeries[]; errors: string[] }> {
  const series: ChartSeries[] = []
  const errors: string[] = []

  const user = users.find((u) => u.id === userId)
  const userName = user ? getUserDisplayName(user) : userId

  const result = await fetchAllTimeseries(
    userId,
    metric.key,
    dateFrom,
    dateTo,
    'raw',
    undefined,
    (current, total, message) => {
      onProgress(current, total, `${metric.label}\n${message}`)
    },
  )

  if (!result.ok) {
    errors.push(`${userName}: ${result.error}`)
  } else {
    const dataPoints =
      metric.key === 'blood_glucose'
        ? filterGlucoseProviders(result.data)
        : result.data
    const pointsByProvider = new Map<string, typeof dataPoints>()
    for (const point of dataPoints) {
      const provider = point.source?.provider ?? 'unknown'
      const providerPoints = pointsByProvider.get(provider)
      if (providerPoints) {
        providerPoints.push(point)
      } else {
        pointsByProvider.set(provider, [point])
      }
    }
    const providerGroups: Array<[string | undefined, typeof dataPoints]> =
      pointsByProvider.size === 0
        ? [[undefined, dataPoints]]
        : Array.from(pointsByProvider.entries())
    const hasMultipleProviders = providerGroups.length > 1

    providerGroups.forEach(([provider, points], index) => {
      series.push({
        id: `${userId}:${metric.key}:${provider ?? 'none'}`,
        userId,
        metricKey: metric.key,
        metricLabel: metric.label,
        provider,
        label: `${userName} — ${metric.label}${hasMultipleProviders && provider ? ` (${provider})` : ''}`,
        unit: metric.unit,
        color: getSeriesColor(index),
        continuous: metric.continuous ?? false,
        dataPoints: points,
      })
    })
  }

  return { series, errors }
}

export async function fetchEventsForUser(
  eventType: { key: string; label: string },
  userId: string,
  users: ApiUser[],
  dateFrom: string,
  dateTo: string,
  colorOffset: number,
  onProgress: (current: number, total: number, message: string) => void,
): Promise<{ series: EventSeries[]; errors: string[] }> {
  const series: EventSeries[] = []
  const errors: string[] = []

  const user = users.find((u) => u.id === userId)
  const userName = user ? getUserDisplayName(user) : userId

  const result = await fetchAllEvents(
    userId,
    eventType.key as 'workouts' | 'sleep',
    dateFrom,
    dateTo,
    undefined,
    (current, total, message) => {
      onProgress(current, total, `${eventType.label}\n${message}`)
    },
  )

  if (!result.ok) {
    errors.push(`${userName}: ${result.error}`)
  } else {
    const dataPoints: EventPoint[] = result.data.map((raw) => {
      const isWorkout = eventType.key === 'workouts'
      const durationSec = isWorkout
        ? (raw as ApiWorkout).duration_seconds
        : (raw as ApiSleep).duration_seconds
      const durationMin = durationSec ? Math.round(durationSec / 60) : 0
      const durationStr = durationMin >= 60
        ? `${Math.floor(durationMin / 60)}h${durationMin % 60}m`
        : `${durationMin}m`

      const label = isWorkout
        ? `${(raw as ApiWorkout).name || (raw as ApiWorkout).type} (${durationStr})`
        : `Sleep (${durationStr})`

      return {
        timestamp: raw.start_time,
        label,
        raw,
      }
    })

    series.push({
      id: `${userId}:${eventType.key}`,
      userId,
      eventKey: eventType.key,
      label: `${userName} — ${eventType.label}`,
      color: getSeriesColor(colorOffset + series.length),
      dataPoints,
    })
  }

  return { series, errors }
}

export async function fetchSummariesForUser(
  userId: string,
  dateFrom: string,
  dateTo: string,
  onProgress: (current: number, total: number, message: string) => void,
): Promise<{ summaries: SummaryState; errors: string[] }> {
  const errors: string[] = []
  const summaries: SummaryState = {
    activity: [],
    sleep: [],
    body: null,
    data: null,
  }

  // Activity summaries (paginated)
  const activityResult = await fetchActivitySummaries(
    userId,
    dateFrom,
    dateTo,
    undefined,
    (current, total, message) => {
      onProgress(current, total, `Activity summaries\n${message}`)
    },
  )
  if (!activityResult.ok) {
    errors.push(`Activity summaries: ${activityResult.error}`)
  } else {
    summaries.activity = activityResult.data
  }

  // Sleep summaries (paginated)
  const sleepResult = await fetchSleepSummaries(
    userId,
    dateFrom,
    dateTo,
    undefined,
    (current, total, message) => {
      onProgress(current, total, `Sleep summaries\n${message}`)
    },
  )
  if (!sleepResult.ok) {
    errors.push(`Sleep summaries: ${sleepResult.error}`)
  } else {
    summaries.sleep = sleepResult.data
  }

  // Body summary (single response, nullable)
  const bodyResult = await fetchBodySummary(userId, dateFrom, dateTo)
  if (!bodyResult.ok) {
    errors.push(`Body summary: ${bodyResult.error}`)
  } else {
    summaries.body = bodyResult.data
  }

  // Data summary (single response)
  const dataResult = await fetchDataSummary(userId, dateFrom, dateTo)
  if (!dataResult.ok) {
    errors.push(`Data summary: ${dataResult.error}`)
  } else {
    summaries.data = dataResult.data
  }

  return { summaries, errors }
}
