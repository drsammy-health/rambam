import type { ApiUser, ApiSleep, ApiWorkout } from './openwearables/types'
import { getUserDisplayName } from './openwearables/api'
import type { ChartSeries, EventSeries, SummaryState } from '../types'

function formatDuration(sec: number | null): string {
  if (!sec) return '—'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function getEventRawType(
  raw: ApiSleep | ApiWorkout,
): 'sleep' | 'workout' {
  return 'is_nap' in raw ? 'sleep' : 'workout'
}

export function generateAISummary(
  chartSeries: ChartSeries[],
  eventSeries: EventSeries[],
  summaries: SummaryState,
  users: ApiUser[],
  dateFrom: string,
  dateTo: string,
): string {
  const hasAnyData =
    chartSeries.length > 0 ||
    eventSeries.length > 0 ||
    summaries.activity.length > 0 ||
    summaries.sleep.length > 0 ||
    summaries.body != null ||
    summaries.data != null

  if (!hasAnyData) {
    return 'No health data is currently loaded. Select a user and metrics to generate a summary.'
  }

  const lines: string[] = []

  // Header
  lines.push('Health Data Summary')
  lines.push(`Period: ${dateFrom} to ${dateTo}`)
  lines.push('')

  // Group series by metric
  const byMetric: Record<string, ChartSeries[]> = {}
  for (const series of chartSeries) {
    if (!byMetric[series.metricKey]) {
      byMetric[series.metricKey] = []
    }
    byMetric[series.metricKey].push(series)
  }

  for (const [, seriesList] of Object.entries(byMetric)) {
    const first = seriesList[0]
    const metricLabel = first.label.split(' — ')[1] || first.metricKey
    lines.push(`## ${metricLabel}`)
    lines.push(`Unit: ${first.unit}`)
    lines.push('')

    for (const series of seriesList) {
      const user = users.find((u) => u.id === series.userId)
      const userName = user ? getUserDisplayName(user) : series.userId

      const values = series.dataPoints.map((d) => d.value)
      const count = values.length
      if (count === 0) {
        lines.push(`- ${userName}: No data`)
        continue
      }

      const avg = values.reduce((a, b) => a + b, 0) / count
      const min = Math.min(...values)
      const max = Math.max(...values)

      // Count points by source provider
      const byProvider: Record<string, number> = {}
      for (const dp of series.dataPoints) {
        const p = dp.source?.provider || 'Unknown'
        byProvider[p] = (byProvider[p] || 0) + 1
      }
      const providerSummary = Object.entries(byProvider)
        .map(([p, c]) => `${p}: ${c}`)
        .join(', ')

      lines.push(
        `- ${userName}: ${count} points, avg ${avg.toFixed(1)}, range ${min.toFixed(1)}–${max.toFixed(1)}`,
      )
      lines.push(`  Sources: ${providerSummary}`)
    }
    lines.push('')
  }

  // Events
  const allEvents = eventSeries.flatMap((es) => es.dataPoints.map((dp) => dp.raw))
  const sleepEvents = allEvents.filter((e): e is ApiSleep => getEventRawType(e) === 'sleep')
  const workoutEvents = allEvents.filter((e): e is ApiWorkout => getEventRawType(e) === 'workout')

  if (sleepEvents.length > 0 || workoutEvents.length > 0) {
    lines.push('## Events')
    lines.push('')

    if (sleepEvents.length > 0) {
      const nonNaps = sleepEvents.filter((s) => !s.is_nap)
      const naps = sleepEvents.filter((s) => s.is_nap)

      const avgDuration =
        nonNaps.length > 0
          ? nonNaps.reduce((sum, s) => sum + (s.sleep_duration_seconds || s.duration_seconds), 0) /
            nonNaps.length
          : 0

      const avgEfficiency =
        nonNaps.length > 0 && nonNaps.some((s) => s.efficiency_percent != null)
          ? nonNaps.reduce((sum, s) => sum + (s.efficiency_percent || 0), 0) /
            nonNaps.filter((s) => s.efficiency_percent != null).length
          : null

      lines.push(`- Sleep: ${nonNaps.length} night${nonNaps.length !== 1 ? 's' : ''}`)
      if (avgDuration > 0) {
        lines.push(`  Avg duration: ${formatDuration(avgDuration)}`)
      }
      if (avgEfficiency != null) {
        lines.push(`  Avg efficiency: ${avgEfficiency.toFixed(0)}%`)
      }
      if (naps.length > 0) {
        lines.push(`  Naps: ${naps.length}`)
      }
    }

    if (workoutEvents.length > 0) {
      const byType: Record<string, number> = {}
      for (const w of workoutEvents) {
        const t = w.type || 'Unknown'
        byType[t] = (byType[t] || 0) + 1
      }
      const typeSummary = Object.entries(byType)
        .map(([t, c]) => `${t} (${c})`)
        .join(', ')

      const avgDuration =
        workoutEvents.length > 0
          ? workoutEvents.reduce((sum, w) => sum + (w.duration_seconds || 0), 0) /
            workoutEvents.filter((w) => w.duration_seconds != null).length
          : 0

      lines.push(
        `- Workouts: ${workoutEvents.length} session${workoutEvents.length !== 1 ? 's' : ''}`
      )
      lines.push(`  Types: ${typeSummary}`)
      if (avgDuration > 0) {
        lines.push(`  Avg duration: ${formatDuration(avgDuration)}`)
      }
    }

    lines.push('')
  }

  // ── Activity Summary ─────────────────────────────────────────────────────
  if (summaries.activity.length > 0) {
    lines.push('## Activity Summary')
    lines.push('')
    const days = summaries.activity.length
    const totalSteps = summaries.activity.reduce((s, a) => s + (a.steps || 0), 0)
    const totalCalories = summaries.activity.reduce(
      (s, a) => s + (a.active_calories_kcal || 0),
      0,
    )
    const totalDistance = summaries.activity.reduce(
      (s, a) => s + (a.distance_meters || 0),
      0,
    )
    const avgSteps = Math.round(totalSteps / days)
    const avgCalories = Math.round(totalCalories / days)
    const avgDistanceKm = (totalDistance / days / 1000).toFixed(1)
    lines.push(`- Days tracked: ${days}`)
    lines.push(`- Avg steps/day: ${avgSteps.toLocaleString()}`)
    lines.push(`- Avg active calories/day: ${avgCalories}`)
    lines.push(`- Avg distance/day: ${avgDistanceKm} km`)
    lines.push('')
  }

  // ── Sleep Summary ────────────────────────────────────────────────────────
  if (summaries.sleep.length > 0) {
    lines.push('## Sleep Summary')
    lines.push('')
    const nights = summaries.sleep.length
    const avgDurationMin =
      summaries.sleep.reduce((s, sl) => s + (sl.duration_minutes || 0), 0) / nights
    const avgEfficiency =
      summaries.sleep.reduce((s, sl) => s + (sl.efficiency_percent || 0), 0) /
      summaries.sleep.filter((sl) => sl.efficiency_percent != null).length

    lines.push(`- Nights tracked: ${nights}`)
    lines.push(`- Avg duration: ${formatDuration(avgDurationMin * 60)}`)
    if (!Number.isNaN(avgEfficiency) && avgEfficiency > 0) {
      lines.push(`- Avg efficiency: ${avgEfficiency.toFixed(0)}%`)
    }

    // Stage breakdown
    const stages = summaries.sleep.filter((s) => s.stages != null)
    if (stages.length > 0) {
      const totalDeep = stages.reduce((s, sl) => s + (sl.stages?.deep_minutes || 0), 0)
      const totalLight = stages.reduce((s, sl) => s + (sl.stages?.light_minutes || 0), 0)
      const totalRem = stages.reduce((s, sl) => s + (sl.stages?.rem_minutes || 0), 0)
      const totalAwake = stages.reduce((s, sl) => s + (sl.stages?.awake_minutes || 0), 0)
      lines.push(`- Stage breakdown (avg/night):`)
      lines.push(`  Deep: ${Math.round(totalDeep / stages.length)}m`)
      lines.push(`  Light: ${Math.round(totalLight / stages.length)}m`)
      lines.push(`  REM: ${Math.round(totalRem / stages.length)}m`)
      lines.push(`  Awake: ${Math.round(totalAwake / stages.length)}m`)
    }
    lines.push('')
  }

  // ── Body Summary ───────────────────────────────────────────────────────────
  if (summaries.body) {
    lines.push('## Body Metrics')
    lines.push('')
    const sc = summaries.body.slow_changing
    if (sc.weight_kg != null) lines.push(`- Weight: ${sc.weight_kg.toFixed(1)} kg`)
    if (sc.height_cm != null) lines.push(`- Height: ${sc.height_cm.toFixed(1)} cm`)
    if (sc.bmi != null) lines.push(`- BMI: ${sc.bmi.toFixed(1)}`)
    if (sc.body_fat_percent != null) lines.push(`- Body fat: ${sc.body_fat_percent.toFixed(1)}%`)
    if (sc.muscle_mass_kg != null) lines.push(`- Muscle mass: ${sc.muscle_mass_kg.toFixed(1)} kg`)

    const avg = summaries.body.averaged
    if (avg.resting_heart_rate_bpm != null) {
      lines.push(`- Resting HR (${avg.period_days}d avg): ${avg.resting_heart_rate_bpm} bpm`)
    }
    if (avg.avg_hrv_sdnn_ms != null) {
      lines.push(`- HRV SDNN (${avg.period_days}d avg): ${avg.avg_hrv_sdnn_ms.toFixed(1)} ms`)
    }
    if (avg.avg_hrv_rmssd_ms != null) {
      lines.push(`- HRV RMSSD (${avg.period_days}d avg): ${avg.avg_hrv_rmssd_ms.toFixed(1)} ms`)
    }

    const latest = summaries.body.latest
    if (latest.body_temperature_celsius != null) {
      lines.push(`- Body temp: ${latest.body_temperature_celsius.toFixed(1)}°C`)
    }
    if (latest.blood_pressure) {
      const bp = latest.blood_pressure
      lines.push(
        `- Blood pressure: ${bp.avg_systolic_mmhg ?? '—'}/${bp.avg_diastolic_mmhg ?? '—'} mmHg`,
      )
    }
    lines.push('')
  }

  // ── Data Summary ─────────────────────────────────────────────────────────
  if (summaries.data) {
    lines.push('## Data Overview')
    lines.push('')
    lines.push(`- Total data points: ${summaries.data.total_data_points.toLocaleString()}`)
    lines.push(`- Total workouts: ${summaries.data.total_workouts}`)
    lines.push(`- Total sleep events: ${summaries.data.total_sleep_events}`)
    if (summaries.data.by_provider.length > 0) {
      lines.push(`- By provider:`)
      for (const p of summaries.data.by_provider) {
        lines.push(`  ${p.provider}: ${p.data_points.toLocaleString()} points, ${p.workout_count} workouts, ${p.sleep_count} sleep`)
      }
    }
    lines.push('')
  }

  // ── Raw Summary JSON ─────────────────────────────────────────────────────
  const hasSummaries =
    summaries.activity.length > 0 ||
    summaries.sleep.length > 0 ||
    summaries.body != null ||
    summaries.data != null

  if (hasSummaries) {
    lines.push('## Raw Summaries JSON')
    lines.push('```json')
    lines.push(
      JSON.stringify(
        {
          activity: summaries.activity,
          sleep: summaries.sleep,
          body: summaries.body,
          data: summaries.data,
        },
        (_key, value) => {
          if (value === null || value === undefined) return undefined
          if (Array.isArray(value) && value.length === 0) return undefined
          if (typeof value === 'object' && Object.keys(value).length === 0) return undefined
          return value
        },
        2,
      ),
    )
    lines.push('```')
    lines.push('')
  }

  return lines.join('\n')
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for environments where clipboard API is blocked
    return false
  }
}
