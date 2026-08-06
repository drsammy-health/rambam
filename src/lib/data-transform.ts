import type { ApiDataPoint } from './openwearables/types'
import type { ChartSeries } from '../types'

function escapeCsvCell(value: string | number | null | undefined): string {
  const text = value == null ? '' : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function chartSeriesToCsv(seriesList: ChartSeries[]): string {
  const rows: Array<Array<string | number>> = [['timestamp', 'value', 'provider']]

  for (const series of seriesList) {
    for (const point of series.dataPoints) {
      rows.push([
        point.timestamp,
        point.value,
        point.source?.provider ?? '',
      ])
    }
  }

  return `${rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n')}\n`
}

/** Check whether a provider is an allowed glucose source. */
function isAllowedGlucoseProvider(provider: string | undefined): boolean {
  if (!provider) return false
  const p = provider.toLowerCase()
  return p.includes('stelo') || p.includes('dexcom')
}

/** For blood glucose, drop anything that isn't Stelo or Dexcom. */
export function filterGlucoseProviders(points: ApiDataPoint[]): ApiDataPoint[] {
  return points.filter((dp) => isAllowedGlucoseProvider(dp.source?.provider))
}
