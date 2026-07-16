import type { ApiUser } from './openwearables/types'
import { getUserDisplayName } from './openwearables/api'
import type { ChartSeries } from '../types'

export function generateAISummary(
  chartSeries: ChartSeries[],
  users: ApiUser[],
  dateFrom: string,
  dateTo: string,
): string {
  if (chartSeries.length === 0) {
    return 'No health data is currently loaded. Select users and metrics to generate a summary.'
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

      lines.push(
        `- ${userName}: ${count} points, avg ${avg.toFixed(1)}, range ${min.toFixed(1)}–${max.toFixed(1)}`,
      )
    }
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
